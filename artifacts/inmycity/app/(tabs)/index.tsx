import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Platform, useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useColors } from "@/hooks/useColors";
import {
  useGetEvents, useGetDeals, useGetMovies, useGetActivities,
} from "@workspace/api-client-react";
import { useCity } from "@/context/CityContext";
import { CityPicker } from "@/components/CityPicker";
import { CategoryGrid } from "@/components/CategoryGrid";
import { AppHeader } from "@/components/AppHeader";

// ─── Config ───────────────────────────────────────────────────────────────────

type TrendingType = "event" | "deal" | "movie" | "activity" | "sport";

interface TrendingItem {
  key:      string;
  type:     TrendingType;
  title:    string;
  imageUrl: string | null | undefined;
  meta1:    string;
  meta2?:   string;
  route:    string;
}

const BADGE: Record<TrendingType, { label: string; color: string; icon: string }> = {
  event:    { label: "Event",    color: "#8b5cf6", icon: "calendar" },
  deal:     { label: "Deal",     color: "#10b981", icon: "percent"  },
  movie:    { label: "Movie",    color: "#6366f1", icon: "film"     },
  activity: { label: "Activity", color: "#ef4444", icon: "zap"      },
  sport:    { label: "Sport",    color: "#22c55e", icon: "activity" },
};

const GRID_H_PAD = 16;
const GRID_GAP   = 12;
const CAP        = 5;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtDur(mins: number | null | undefined) {
  if (!mins) return "";
  const h = Math.floor(mins / 60), m = mins % 60;
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

// ─── Skeleton grid ────────────────────────────────────────────────────────────

function TrendingSkeletons({
  colors,
  cardWidth,
}: {
  colors: ReturnType<typeof useColors>;
  cardWidth: number;
}) {
  return (
    <View style={styles.grid}>
      {[1, 2, 3, 4].map(i => (
        <View
          key={i}
          style={[
            styles.skeletonCard,
            { backgroundColor: colors.card, width: cardWidth },
          ]}
        />
      ))}
    </View>
  );
}

// ─── Trending card ────────────────────────────────────────────────────────────

function TrendingCard({
  item,
  colors,
  cardWidth,
}: {
  item:      TrendingItem;
  colors:    ReturnType<typeof useColors>;
  cardWidth: number;
}) {
  const router = useRouter();
  const cfg    = BADGE[item.type];

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, width: cardWidth },
      ]}
      onPress={() => router.push(item.route as any)}
      activeOpacity={0.85}
    >
      {/* Image + badge overlay */}
      <View style={styles.imageWrap}>
        <Image
          source={{
            uri: item.imageUrl
              ?? "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400",
          }}
          style={[styles.cardImage, { width: cardWidth }]}
          contentFit="cover"
        />
        <View style={[styles.typeBadge, { backgroundColor: cfg.color }]}>
          <Feather name={cfg.icon as any} size={9} color="#fff" />
          <Text style={styles.typeBadgeText}>{cfg.label}</Text>
        </View>
      </View>

      {/* Text body */}
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[styles.meta1, { color: cfg.color }]} numberOfLines={1}>
            {item.meta1}
          </Text>
          {item.meta2 ? (
            <>
              <View style={[styles.metaDot, { backgroundColor: colors.mutedForeground }]} />
              <Text style={[styles.meta2, { color: colors.mutedForeground }]} numberOfLines={1}>
                {item.meta2}
              </Text>
            </>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ExploreScreen() {
  const colors    = useColors();
  const insets    = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { selectedCity } = useCity();
  const cityName  = selectedCity?.name;

  const topPadding    = Math.max(insets.top, 20);
  const bottomPadding = Platform.OS === "web" ? 84 : 84 + insets.bottom;

  // Card width for 2-column grid
  const cardWidth = Math.floor((screenWidth - GRID_H_PAD * 2 - GRID_GAP) / 2);

  // ── Parallel data fetches ─────────────────────────────────────────────────
  const { data: events = [],     isLoading: evLoad, refetch: refEv } =
    useGetEvents({ city: cityName });
  const { data: deals = [],      isLoading: dlLoad, refetch: refDl } =
    useGetDeals({ city: cityName });
  const { data: movies = [],     isLoading: mvLoad, refetch: refMv } =
    useGetMovies({ city: cityName, status: "now_showing" });
  const { data: activities = [], isLoading: acLoad, refetch: refAc } =
    useGetActivities({ city: cityName });

  const isLoading = evLoad || dlLoad || mvLoad || acLoad;

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refEv(), refDl(), refMv(), refAc()]);
    setRefreshing(false);
  }, [refEv, refDl, refMv, refAc]);

  // ── Build interleaved trending list ───────────────────────────────────────
  const sportsActs = activities.filter(
    a => a.category === "sports" || a.category === "fitness"
  );
  const normalActs = activities.filter(
    a => a.category !== "sports" && a.category !== "fitness"
  );

  const sources: TrendingItem[][] = [
    events.slice(0, CAP).map(e => ({
      key:      `ev-${e.id}`,
      type:     "event" as TrendingType,
      title:    e.name,
      imageUrl: e.imageUrl,
      meta1:    fmtDate(e.date) || "Upcoming",
      meta2:    e.venue ?? undefined,
      route:    `/event/${e.id}`,
    })),

    deals.slice(0, CAP).map(d => ({
      key:      `dl-${d.id}`,
      type:     "deal" as TrendingType,
      title:    d.title,
      imageUrl: d.imageUrl,
      meta1:    d.discountText ?? "Deal",
      meta2:    d.placeName ?? undefined,
      route:    `/deal/${d.id}`,
    })),

    movies.slice(0, CAP).map(m => ({
      key:      `mv-${m.id}`,
      type:     "movie" as TrendingType,
      title:    m.title,
      imageUrl: m.posterUrl,
      meta1:    m.genre ?? "Film",
      meta2:    m.rating != null ? `⭐ ${m.rating.toFixed(1)}` : undefined,
      route:    `/movie/${m.id}`,
    })),

    normalActs.slice(0, CAP).map(a => ({
      key:      `ac-${a.id}`,
      type:     "activity" as TrendingType,
      title:    a.name,
      imageUrl: a.imageUrl,
      meta1:    fmtDur(a.durationMinutes) || "Activity",
      meta2:    a.rating != null ? `⭐ ${a.rating.toFixed(1)}` : undefined,
      route:    `/activity/${a.id}`,
    })),

    sportsActs.slice(0, CAP).map(a => ({
      key:      `sp-${a.id}`,
      type:     "sport" as TrendingType,
      title:    a.name,
      imageUrl: a.imageUrl,
      meta1:    fmtDur(a.durationMinutes) || "Sport",
      meta2:    a.rating != null ? `⭐ ${a.rating.toFixed(1)}` : undefined,
      route:    `/activity/${a.id}`,
    })),
  ];

  // Round-robin interleave across all 5 sources
  const maxLen  = Math.max(...sources.map(s => s.length));
  const trending: TrendingItem[] = [];
  for (let i = 0; i < maxLen; i++) {
    for (const src of sources) {
      if (i < src.length) trending.push(src[i]);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader subtitle="City At Your Fingertips" topPadding={topPadding} showCityPicker />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.amber}
          />
        }
      >
        {/* ── Explore ── */}
        <View style={styles.sectionRow}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Explore</Text>
        </View>
        <CategoryGrid />

        {/* ── Trending ── */}
        <View style={styles.sectionRow}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Trending in {cityName ?? "your city"}
          </Text>
          <Feather name="trending-up" size={15} color={colors.amber} />
        </View>

        {isLoading ? (
          <TrendingSkeletons colors={colors} cardWidth={cardWidth} />
        ) : trending.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.muted }]}>
              <Feather name="compass" size={28} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              Nothing trending yet
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Select a city to see what's hot right now
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {trending.map(item => (
              <TrendingCard
                key={item.key}
                item={item}
                colors={colors}
                cardWidth={cardWidth}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <CityPicker />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: GRID_H_PAD,
    paddingTop: 16,
    paddingBottom: 10,
  },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },

  // ── 2-column grid ──
  grid: {
    flexDirection:   "row",
    flexWrap:        "wrap",
    paddingHorizontal: GRID_H_PAD,
    gap:             GRID_GAP,
    paddingBottom:   8,
  },

  // ── Card ──
  card: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      web:     { boxShadow: "0 2px 12px rgba(0,0,0,0.08)" } as any,
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
      },
    }),
  },
  imageWrap: { position: "relative" },
  cardImage: { height: 140 },
  typeBadge: {
    position:       "absolute",
    top:            8,
    left:           8,
    flexDirection:  "row",
    alignItems:     "center",
    gap:            4,
    paddingHorizontal: 8,
    paddingVertical:   4,
    borderRadius:   8,
  },
  typeBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize:   10,
    color:      "#fff",
  },
  cardBody:  { padding: 10, gap: 4 },
  cardTitle: { fontFamily: "Inter_700Bold", fontSize: 13, lineHeight: 18 },
  metaRow:   { flexDirection: "row", alignItems: "center", gap: 5 },
  metaDot:   { width: 3, height: 3, borderRadius: 1.5 },
  meta1:     { fontFamily: "Inter_600SemiBold", fontSize: 11, flexShrink: 1 },
  meta2:     { fontFamily: "Inter_400Regular",  fontSize: 11, flexShrink: 1 },

  // ── Skeleton ──
  skeletonCard: {
    height:       140 + 72,
    borderRadius: 16,
  },

  // ── Empty ──
  emptyBox: {
    alignItems:     "center",
    paddingVertical: 32,
    gap:            10,
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width:        64,
    height:       64,
    borderRadius: 32,
    alignItems:   "center",
    justifyContent: "center",
  },
  emptyTitle: { fontFamily: "Inter_700Bold",    fontSize: 16 },
  emptyText:  { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", lineHeight: 20 },
});
