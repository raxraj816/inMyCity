import React, { useCallback, useMemo, useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import { AiChatFab } from "@/components/AiChatFab";
import { MUMBAI_LAUNCH_ZONES } from "@workspace/city-config";

const ONBOARDING_DONE_KEY = "onboarding_complete";

// ─── Config ───────────────────────────────────────────────────────────────────

type TrendingType = "event" | "deal" | "movie" | "activity" | "sport";
type TrendFilter  = "all" | TrendingType;

interface TrendingItem {
  key:      string;
  type:     TrendingType;
  title:    string;
  imageUrl: string | null | undefined;
  meta1:    string;
  meta2?:   string;
  route:    string;
}

// Each badge colour is a fill behind white text and a text colour on the card, so all five
// are the darker shade that clears AA in both roles.
const BADGE: Record<TrendingType, { label: string; color: string; icon: string }> = {
  event:    { label: "Event",    color: "#7c3aed", icon: "calendar" },
  deal:     { label: "Deal",     color: "#047857", icon: "percent"  },
  movie:    { label: "Movie",    color: "#4f46e5", icon: "film"     },
  activity: { label: "Activity", color: "#dc2626", icon: "zap"      },
  sport:    { label: "Sport",    color: "#15803d", icon: "activity" },
};

const TREND_FILTERS: { id: TrendFilter; label: string; icon: string }[] = [
  { id: "all",      label: "All",        icon: "grid"      },
  { id: "event",    label: "Events",     icon: "calendar"  },
  { id: "deal",     label: "Deals",      icon: "percent"   },
  { id: "movie",    label: "Movies",     icon: "film"      },
  { id: "activity", label: "Activities", icon: "zap"       },
  { id: "sport",    label: "Sports",     icon: "activity"  },
];

const H_PAD = 16;
const CAP   = 5;

const DECISION_PLANS = [
  { id: "weekend", label: "This weekend", sub: "Curated Mumbai plans for Friday to Sunday.", icon: "calendar", color: "#c2410c", route: "/activities" },
  { id: "tonight", label: "I'm free tonight", sub: "Food, events, movies, or a low-friction plan.", icon: "moon", color: "#4f46e5", route: "/ai-chat" },
  { id: "rain", label: "Rain-safe plans", sub: "Indoor ideas and low travel stress backups.", icon: "cloud-rain", color: "#0369a1", route: "/plans?weatherMode=rain-safe&title=Rain-safe+plans" },
  { id: "budget", label: "Under Rs 1000", sub: "Good plans without payday-level spending.", icon: "percent", color: "#047857", route: "/deals" },
  { id: "transit", label: "Near train or metro", sub: "Plans that respect Mumbai travel reality.", icon: "navigation", color: "#dc2626", route: "/transit" },
  { id: "date", label: "Date night", sub: "Dinner, walk, movie, or backup indoor option.", icon: "heart", color: "#be185d", route: "/ai-chat" },
];

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

// ─── Skeletons ────────────────────────────────────────────────────────────────

function TrendingSkeletons({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.list}>
      {[1, 2, 3].map(i => (
        <View key={i} style={[styles.skeletonCard, { backgroundColor: colors.card }]} />
      ))}
    </View>
  );
}

function HotPickSkeletons({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hotPicksScroll}>
      {[1, 2, 3].map(i => (
        <View key={i} style={[styles.hotPickSkeleton, { backgroundColor: colors.card }]} />
      ))}
    </ScrollView>
  );
}

// ─── Search bar (tappable) ────────────────────────────────────────────────────

function SearchBar({ colors }: { colors: ReturnType<typeof useColors> }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push("/search" as any)}
      activeOpacity={0.75}
      accessibilityRole="search"
      accessibilityLabel="Search places, events and deals"
      accessibilityHint="Opens search"
    >
      <Feather name="search" size={15} color={colors.mutedForeground} />
      <Text style={[styles.searchPlaceholder, { color: colors.mutedForeground }]}>
        Search places, events, deals…
      </Text>
      <View style={[styles.searchMic, { backgroundColor: colors.muted }]}>
        <Feather name="mic" size={13} color={colors.mutedForeground} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Deals strip card ─────────────────────────────────────────────────────────

function DealStripCard({
  deal,
  colors,
}: {
  deal:   { id: number | string; title: string; discountText?: string | null; imageUrl?: string | null; placeName?: string | null };
  colors: ReturnType<typeof useColors>;
}) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={[styles.dealCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push(`/deal/${deal.id}` as any)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={[deal.title, deal.discountText, deal.placeName].filter(Boolean).join(", ")}
      accessibilityHint="Opens this deal"
    >
      <Image
        source={{ uri: deal.imageUrl ?? "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400" }}
        style={styles.dealImage}
        contentFit="cover"
        cachePolicy="memory-disk"
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <View style={styles.dealDiscountBadge}>
        <Text style={styles.dealDiscountText}>{deal.discountText ?? "Deal"}</Text>
      </View>
      <View style={styles.dealBody}>
        <Text style={[styles.dealTitle, { color: colors.foreground }]} numberOfLines={2}>
          {deal.title}
        </Text>
        {deal.placeName ? (
          <Text style={[styles.dealPlace, { color: colors.mutedForeground }]} numberOfLines={1}>
            {deal.placeName}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

// ─── Hot Pick card (compact horizontal) ──────────────────────────────────────

function HotPickCard({
  item,
  colors,
}: {
  item:   TrendingItem;
  colors: ReturnType<typeof useColors>;
}) {
  const router = useRouter();
  const cfg    = BADGE[item.type];

  return (
    <TouchableOpacity
      style={[styles.hotPickCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push(item.route as any)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${cfg.label}, ${item.meta1}`}
      accessibilityHint="Opens this listing"
    >
      <Image
        source={{ uri: item.imageUrl ?? "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=600" }}
        style={styles.hotPickImage}
        contentFit="cover"
        cachePolicy="memory-disk"
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <View style={[styles.hotPickBadge, { backgroundColor: cfg.color }]}>
        <Text style={styles.hotPickBadgeText}>{cfg.label}</Text>
      </View>
      <View style={styles.hotPickBody}>
        <Text style={[styles.hotPickTitle, { color: colors.foreground }]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[styles.hotPickMeta, { color: cfg.color }]} numberOfLines={1}>
          {item.meta1}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Trending card (full-width) ───────────────────────────────────────────────

function TrendingCard({
  item,
  colors,
}: {
  item:   TrendingItem;
  colors: ReturnType<typeof useColors>;
}) {
  const router = useRouter();
  const cfg    = BADGE[item.type];

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push(item.route as any)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={[item.title, cfg.label, item.meta1, item.meta2].filter(Boolean).join(", ")}
      accessibilityHint="Opens this listing"
    >
      <View style={styles.imageWrap}>
        <Image
          source={{
            uri: item.imageUrl
              ?? "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800",
          }}
          style={styles.cardImage}
          contentFit="cover"
          cachePolicy="memory-disk"
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <View style={[styles.typeBadge, { backgroundColor: cfg.color }]}>
          <Feather name={cfg.icon as any} size={10} color="#fff" />
          <Text style={styles.typeBadgeText}>{cfg.label}</Text>
        </View>
      </View>

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
  const colors   = useColors();
  const insets   = useSafeAreaInsets();
  const router   = useRouter();
  const { selectedCity } = useCity();
  const cityName = selectedCity?.name;

  const topPadding    = Math.max(insets.top, 8);
  const bottomPadding = Platform.OS === "web" ? 84 : 84 + insets.bottom;

  const [trendFilter, setTrendFilter] = useState<TrendFilter>("all");
  const [refreshing,  setRefreshing]  = useState(false);

  // ── Onboarding redirect ───────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_DONE_KEY).then((val) => {
      if (!val) router.replace("/onboarding");
    });
  }, []);

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refEv(), refDl(), refMv(), refAc()]);
    setRefreshing(false);
  }, [refEv, refDl, refMv, refAc]);

  // ── Build full interleaved trending list ──────────────────────────────────
  const sportsActs = activities.filter(a => a.category === "sports" || a.category === "fitness");
  const normalActs = activities.filter(a => a.category !== "sports" && a.category !== "fitness");

  const sources: TrendingItem[][] = useMemo(() => [
    events.slice(0, CAP).map(e => ({
      key: `ev-${e.id}`, type: "event" as TrendingType,
      title: e.title, imageUrl: e.imageUrl,
      meta1: fmtDate(e.startDate) || "Upcoming", meta2: e.venue ?? undefined,
      route: `/event/${e.id}`,
    })),
    deals.slice(0, CAP).map(d => ({
      key: `dl-${d.id}`, type: "deal" as TrendingType,
      title: d.title, imageUrl: d.imageUrl,
      meta1: d.discountText ?? "Deal", meta2: d.placeName ?? undefined,
      route: `/deal/${d.id}`,
    })),
    movies.slice(0, CAP).map(m => ({
      key: `mv-${m.id}`, type: "movie" as TrendingType,
      title: m.title, imageUrl: m.posterUrl,
      meta1: m.genre ?? "Film", meta2: m.rating != null ? `⭐ ${m.rating.toFixed(1)}` : undefined,
      route: `/movie/${m.id}`,
    })),
    normalActs.slice(0, CAP).map(a => ({
      key: `ac-${a.id}`, type: "activity" as TrendingType,
      title: a.name, imageUrl: a.imageUrl,
      meta1: fmtDur(a.durationMinutes) || "Activity", meta2: a.rating != null ? `⭐ ${a.rating.toFixed(1)}` : undefined,
      route: `/activity/${a.id}`,
    })),
    sportsActs.slice(0, CAP).map(a => ({
      key: `sp-${a.id}`, type: "sport" as TrendingType,
      title: a.name, imageUrl: a.imageUrl,
      meta1: fmtDur(a.durationMinutes) || "Sport", meta2: a.rating != null ? `⭐ ${a.rating.toFixed(1)}` : undefined,
      route: `/activity/${a.id}`,
    })),
  ], [events, deals, movies, normalActs, sportsActs]);

  const allTrending: TrendingItem[] = useMemo(() => {
    const maxLen = Math.max(...sources.map(s => s.length), 0);
    const out: TrendingItem[] = [];
    for (let i = 0; i < maxLen; i++) {
      for (const src of sources) { if (i < src.length) out.push(src[i]); }
    }
    return out;
  }, [sources]);

  const trending = useMemo(() =>
    trendFilter === "all"
      ? allTrending
      : allTrending.filter(item =>
          trendFilter === "activity"
            ? item.type === "activity"
            : trendFilter === "sport"
              ? item.type === "sport"
              : item.type === trendFilter
        ),
    [allTrending, trendFilter]
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader subtitle="City At Your Fingertips" topPadding={topPadding} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: bottomPadding }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.amber}
          />
        }
      >
        {/* ── Search bar ── */}
        <SearchBar colors={colors} />

        {/* ── Category grid ── */}
        <View style={styles.sectionRow}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Mumbai At Your Fingertips</Text>
          <Feather name="grid" size={15} color={colors.amber} />
        </View>
        <CategoryGrid />

        {/* ── Mumbai decision planner ── */}
        <View style={[styles.launchHero, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.launchHeroTop}>
            <View style={styles.launchHeroText}>
              <Text style={[styles.launchEyebrow, { color: colors.amber }]}>Mumbai-first beta</Text>
              <Text style={[styles.launchTitle, { color: colors.foreground }]}>Find Your Mumbai Vibe</Text>
              <Text style={[styles.launchSub, { color: colors.mutedForeground }]}>
                Plans for your mood, budget, weather, and where you are in the city.
              </Text>
            </View>
          </View>

          <View style={styles.decisionGrid}>
            {DECISION_PLANS.map((plan) => {
              const featured = plan.id === "weekend";
              return (
                <TouchableOpacity
                  key={plan.id}
                  style={[
                    styles.decisionCard,
                    featured && styles.featuredDecisionCard,
                    {
                      backgroundColor: featured ? plan.color + "12" : colors.background,
                      borderColor: featured ? plan.color + "55" : colors.border,
                    },
                  ]}
                  onPress={() => router.push(plan.route as any)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={`${plan.label}. ${plan.sub}`}
                >
                  <View style={styles.decisionTopRow}>
                    <View style={[styles.decisionIcon, featured && styles.featuredDecisionIcon, { backgroundColor: plan.color + "18" }]}>
                      <Feather name={plan.icon as any} size={featured ? 17 : 15} color={plan.color} />
                    </View>
                    {featured ? (
                      <View style={[styles.decisionBadge, { backgroundColor: plan.color }]}>
                        <Text style={styles.decisionBadgeText}>Weekend</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.decisionTextBlock}>
                    <Text style={[styles.decisionLabel, featured && styles.featuredDecisionLabel, { color: colors.foreground }]}>{plan.label}</Text>
                    <Text style={[styles.decisionSub, featured && styles.featuredDecisionSub, { color: colors.mutedForeground }]} numberOfLines={featured ? 3 : 2}>{plan.sub}</Text>
                  </View>
                  {featured ? (
                    <View style={styles.featuredDecisionFooter}>
                      <Text style={[styles.featuredDecisionCta, { color: plan.color }]}>Open weekend ideas</Text>
                      <Feather name="arrow-right" size={14} color={plan.color} />
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Mumbai launch neighborhoods ── */}
        <View style={styles.sectionRow}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Trending by neighborhood</Text>
          <Feather name="map-pin" size={15} color={colors.amber} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.zoneScroll}>
          {MUMBAI_LAUNCH_ZONES.slice(0, 12).map((zone) => (
            <TouchableOpacity
              key={zone.id}
              style={[styles.zoneCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(`/neighborhood/${zone.id}` as any)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`${zone.name}. ${zone.vibe}. ${zone.transitAccess}`}
              accessibilityHint="Opens this neighbourhood"
            >
              <Text style={[styles.zoneName, { color: colors.foreground }]}>{zone.name}</Text>
              <Text style={[styles.zoneVibe, { color: colors.mutedForeground }]} numberOfLines={2}>{zone.vibe}</Text>
              <View style={styles.zoneMetaRow}>
                <Feather name="navigation" size={11} color={colors.amber} />
                <Text style={[styles.zoneMeta, { color: colors.amber }]} numberOfLines={1}>{zone.transitAccess}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Trending header + filter tabs ── */}
        <View style={styles.sectionRow}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Trending in {cityName ?? "your city"}
          </Text>
          <Feather name="trending-up" size={15} color={colors.amber} />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterTabsScroll}
        >
          {TREND_FILTERS.map(f => {
            const active = trendFilter === f.id;
            const color  = f.id === "all" ? colors.amber : (BADGE[f.id as TrendingType]?.color ?? colors.amber);
            return (
              <TouchableOpacity
                key={f.id}
                style={[
                  styles.filterTab,
                  {
                    backgroundColor: active ? color : colors.card,
                    borderColor:     active ? color : colors.border,
                  },
                ]}
                onPress={() => setTrendFilter(f.id)}
                activeOpacity={0.8}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${f.label} trending`}
              >
                <Feather name={f.icon as any} size={11} color={active ? "#fff" : colors.mutedForeground} />
                <Text style={[styles.filterTabText, { color: active ? "#fff" : colors.foreground }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Trending list ── */}
        {isLoading ? (
          <TrendingSkeletons colors={colors} />
        ) : trending.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.muted }]}>
              <Feather name="compass" size={28} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {allTrending.length === 0 ? "Nothing trending yet" : "No results"}
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {allTrending.length === 0
                ? "Select a city to see what's hot right now"
                : "Try a different filter above"}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {trending.map(item => (
              <TrendingCard key={item.key} item={item} colors={colors} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* <CityPicker /> */}
      <AiChatFab />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  sectionRow: {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "space-between",
    paddingHorizontal: H_PAD,
    paddingTop:        16,
    paddingBottom:     8,
  },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  seeAllLink:   { fontFamily: "Inter_600SemiBold", fontSize: 13 },

  // ── Search bar ──
  searchBar: {
    flexDirection:    "row",
    alignItems:       "center",
    gap:              10,
    marginHorizontal: H_PAD,
    marginBottom:     4,
    paddingHorizontal: 14,
    paddingVertical:  11,
    borderRadius:     14,
    borderWidth:      1,
    ...Platform.select({
      web:     { boxShadow: "0 1px 6px rgba(0,0,0,0.05)" } as any,
      default: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
    }),
  },
  searchPlaceholder: { fontFamily: "Inter_400Regular", fontSize: 13, flex: 1 },
  searchMic: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },

  // ── Mumbai launch decision hero ──
  launchHero: {
    marginHorizontal: H_PAD,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    ...Platform.select({
      web: { boxShadow: "0 2px 12px rgba(0,0,0,0.06)" } as any,
      default: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
    }),
  },
  launchHeroTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  launchHeroText: { flex: 1 },
  launchEyebrow: { fontFamily: "Inter_700Bold", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8 },
  launchTitle: { fontFamily: "Inter_700Bold", fontSize: 22, marginTop: 3, lineHeight: 28 },
  launchSub: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19, marginTop: 5 },
  decisionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 15,
  },
  decisionCard: {
    width: "48%",
    minHeight: 118,
    borderRadius: 15,
    borderWidth: 1,
    padding: 12,
  },
  featuredDecisionCard: {
    width: "100%",
    minHeight: 132,
    padding: 14,
  },
  decisionTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 9,
  },
  decisionIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  featuredDecisionIcon: { width: 36, height: 36, borderRadius: 11, marginBottom: 0 },
  decisionBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  decisionBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    color: "#fff",
    textTransform: "uppercase",
  },
  decisionTextBlock: {
    flex: 1,
  },
  decisionLabel: { fontFamily: "Inter_700Bold", fontSize: 13, lineHeight: 17 },
  featuredDecisionLabel: { fontSize: 17, lineHeight: 22 },
  decisionSub: { fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 16, marginTop: 4 },
  featuredDecisionSub: { fontSize: 13, lineHeight: 18, maxWidth: 460 },
  featuredDecisionFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  featuredDecisionCta: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },

  // ── Neighborhood zones ──
  zoneScroll: { paddingHorizontal: H_PAD, gap: 10, paddingBottom: 8 },
  zoneCard: {
    width: 190,
    borderRadius: 15,
    borderWidth: 1,
    padding: 13,
    minHeight: 120,
  },
  zoneName: { fontFamily: "Inter_700Bold", fontSize: 15 },
  zoneVibe: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17, marginTop: 5 },
  zoneMetaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: "auto", paddingTop: 10 },
  zoneMeta: { fontFamily: "Inter_600SemiBold", fontSize: 10, flex: 1 },

  // ── Deal strip card ──
  dealCard: {
    width:        160,
    borderRadius: 16,
    overflow:     "hidden",
    borderWidth:  StyleSheet.hairlineWidth,
    ...Platform.select({
      web:     { boxShadow: "0 2px 10px rgba(0,0,0,0.07)" } as any,
      default: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 2 },
    }),
  },
  dealImage:         { width: "100%", height: 100 },
  dealDiscountBadge: { position: "absolute", top: 8, left: 8, backgroundColor: "#047857", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  dealDiscountText:  { fontFamily: "Inter_700Bold", fontSize: 11, color: "#fff" },
  dealBody:          { padding: 10, gap: 3 },
  dealTitle:         { fontFamily: "Inter_600SemiBold", fontSize: 12, lineHeight: 16 },
  dealPlace:         { fontFamily: "Inter_400Regular", fontSize: 11 },

  // ── Hot Picks ──
  hotPicksScroll: { paddingHorizontal: H_PAD, gap: 12 },
  hotPickCard: {
    width:        160,
    borderRadius: 16,
    overflow:     "hidden",
    borderWidth:  StyleSheet.hairlineWidth,
    ...Platform.select({
      web:     { boxShadow: "0 2px 10px rgba(0,0,0,0.07)" } as any,
      default: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 2 },
    }),
  },
  hotPickImage:      { width: "100%", height: 110 },
  hotPickBadge: {
    position: "absolute", top: 8, left: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8,
  },
  hotPickBadgeText:  { fontFamily: "Inter_600SemiBold", fontSize: 10, color: "#fff" },
  hotPickBody:       { padding: 10, gap: 4 },
  hotPickTitle:      { fontFamily: "Inter_600SemiBold", fontSize: 12, lineHeight: 16 },
  hotPickMeta:       { fontFamily: "Inter_400Regular",  fontSize: 11 },
  hotPickSkeleton:   { width: 160, height: 160, borderRadius: 16 },

  // ── Filter tabs ──
  filterTabsScroll: { paddingHorizontal: H_PAD, gap: 8, paddingBottom: 12 },
  filterTab: {
    flexDirection:   "row",
    alignItems:      "center",
    gap:             6,
    paddingHorizontal: 14,
    paddingVertical:   8,
    borderRadius:    20,
    borderWidth:     1,
  },
  filterTabText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },

  // ── Trending list ──
  list: { paddingHorizontal: H_PAD, gap: 12, paddingBottom: 8 },

  // ── Trending card ──
  card: {
    borderRadius: 18,
    overflow:     "hidden",
    borderWidth:  StyleSheet.hairlineWidth,
    ...Platform.select({
      web:     { boxShadow: "0 2px 14px rgba(0,0,0,0.08)" } as any,
      default: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 3 },
    }),
  },
  imageWrap:     { position: "relative" },
  cardImage:     { width: "100%", height: 150 },
  typeBadge: {
    position: "absolute", top: 10, left: 10,
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
  },
  typeBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#fff" },
  cardBody:      { padding: 14, gap: 6 },
  cardTitle:     { fontFamily: "Inter_700Bold",    fontSize: 15, lineHeight: 21 },
  metaRow:       { flexDirection: "row", alignItems: "center", gap: 6 },
  metaDot:       { width: 3, height: 3, borderRadius: 1.5 },
  meta1:         { fontFamily: "Inter_600SemiBold", fontSize: 12, flexShrink: 1 },
  meta2:         { fontFamily: "Inter_400Regular",  fontSize: 12, flexShrink: 1 },

  // ── Skeleton ──
  skeletonCard: { height: 180 + 72, borderRadius: 18 },

  // ── Empty ──
  emptyBox: { alignItems: "center", paddingVertical: 32, gap: 10, paddingHorizontal: 40 },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  emptyTitle:    { fontFamily: "Inter_700Bold",    fontSize: 16 },
  emptyText:     { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", lineHeight: 20 },
});
