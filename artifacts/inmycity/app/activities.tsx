import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, FlatList
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useGetActivities, useGetPlaces } from "@workspace/api-client-react";
import { useCity } from "@/context/CityContext";
import { EmptyState, ErrorState, LIST_PERFORMANCE_PROPS, useListRefreshControl } from "@/components/ListStates";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SkeletonCard } from "@/components/SkeletonCard";
import { TrendingStrip, TrendingStripItem } from "@/components/TrendingStrip";
import { NearbyFilters } from "@/components/NearbyFilters";
import { useNearby } from "@/hooks/useNearby";

// ─── Constants ───────────────────────────────────────────────────────────────

type MainTab = "activities" | "nightlife";

const ACTIVITY_FILTERS = [
  { id: "all",       label: "All"       },
  { id: "adventure", label: "Adventure" },
  { id: "cultural",  label: "Cultural"  },
  { id: "wellness",  label: "Wellness"  },
  { id: "sports",    label: "Sports"    },
  { id: "workshop",  label: "Workshop"  },
  { id: "tour",      label: "Tours"     },
];

const NIGHTLIFE_FILTERS = [
  { id: "all",      label: "All"        },
  { id: "cocktail", label: "Cocktails"  },
  { id: "bar",      label: "Bars"       },
  { id: "club",     label: "Clubs"      },
  { id: "live",     label: "Live Music" },
  { id: "rooftop",  label: "Rooftop"   },
  { id: "pub",      label: "Pubs"       },
];

const ACT_COLOR   = "#dc2626";
const NIGHT_COLOR = "#be185d";

// Deep enough to carry white pill text and to read as text on their own tint.
const CATEGORY_COLORS: Record<string, string> = {
  adventure: "#dc2626",
  cultural:  "#4f46e5",
  wellness:  "#047857",
  sports:    "#0369a1",
  workshop:  "#b45309",
  tour:      "#be185d",
};

const CATEGORY_ICONS: Record<string, string> = {
  adventure: "zap",
  cultural:  "book",
  wellness:  "heart",
  sports:    "activity",
  workshop:  "tool",
  tour:      "map",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDur(mins: number | null | undefined) {
  if (!mins) return "";
  const h = Math.floor(mins / 60), m = mins % 60;
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ActivitiesScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedCity } = useCity();

  const [mainTab, setMainTab]                 = useState<MainTab>("activities");
  const [activityFilter, setActivityFilter]   = useState("all");
  const [nightlifeFilter, setNightlifeFilter] = useState("all");

  const topPadding    = Math.max(insets.top, 20);
  const bottomPadding = Platform.OS === "web" ? 84 : 84 + insets.bottom;
  const cityName      = selectedCity?.name;
  const isLocal       = cityName === "Mumbai" || cityName === "Bangalore";
  const currSymbol    = isLocal ? "₹" : "$";

  const nearby = useNearby();

  // ── Data ────────────────────────────────────────────────────────────────
  const {
    data: activities = [], isLoading: actLoading, isRefetching: actRefetching,
    error: actError, refetch: refetchAct,
  } = useGetActivities({
    city: cityName,
    category: activityFilter !== "all" ? activityFilter : undefined,
    ...nearby.queryParams,
  });

  // Unfiltered activities for the trending strip
  const {
    data: allActivities = [],
  } = useGetActivities({ city: cityName });

  const {
    data: nightlifePlaces = [], isLoading: nightLoading, isRefetching: nightRefetching,
    error: nightError, refetch: refetchNight,
  } = useGetPlaces({ city: cityName, category: "nightlife", ...nearby.queryParams });

  const filteredNightlife = nightlifeFilter === "all"
    ? nightlifePlaces
    : nightlifePlaces.filter(p =>
        p.tags?.some(t => t.toLowerCase().includes(nightlifeFilter))
      );

  const currentError   = mainTab === "activities" ? actError   : nightError;
  const currentRefetch = mainTab === "activities" ? refetchAct : refetchNight;
  const currentAccent  = mainTab === "activities" ? ACT_COLOR  : NIGHT_COLOR;

  const refreshControl = useListRefreshControl(
    mainTab === "activities" ? actRefetching : nightRefetching,
    currentRefetch,
    currentAccent,
  );

  // ── Trending strip items ─────────────────────────────────────────────────

  const actTrendingItems: TrendingStripItem[] = allActivities.slice(0, 8).map(a => ({
    id:       String(a.id),
    title:    a.name,
    imageUrl: a.imageUrl,
    meta1:    fmtDur(a.durationMinutes) || (a.category.charAt(0).toUpperCase() + a.category.slice(1)),
    meta2:    a.rating != null ? `⭐ ${a.rating.toFixed(1)}` : undefined,
    route:    `/activity/${a.id}`,
  }));

  const nightTrendingItems: TrendingStripItem[] = nightlifePlaces.slice(0, 8).map(p => ({
    id:       String(p.id),
    title:    p.name,
    imageUrl: p.imageUrl,
    meta1:    (p.tags ?? []).slice(0, 2).join(" · ") || "Nightlife",
    meta2:    p.rating != null ? `⭐ ${p.rating.toFixed(1)}` : undefined,
    route:    `/place/${p.id}`,
  }));

  // ── Renders ─────────────────────────────────────────────────────────────

  const renderActivityCard = ({ item }: { item: typeof activities[number] }) => {
    const catColor = CATEGORY_COLORS[item.category] ?? "#4f46e5";
    const catIcon  = CATEGORY_ICONS[item.category]  ?? "zap";
    const hours = item.durationMinutes ? Math.floor(item.durationMinutes / 60) : 0;
    const mins  = item.durationMinutes ? item.durationMinutes % 60 : 0;
    const durationStr = hours > 0
      ? (mins > 0 ? `${hours}h ${mins}m` : `${hours}h`)
      : `${mins}m`;

    return (
      <TouchableOpacity
        style={[styles.activityCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => router.push(`/activity/${item.id}` as any)}
        activeOpacity={0.85}
      >
        <View style={styles.cardInner}>
          <Image
            source={{ uri: item.imageUrl ?? "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=600" }}
            style={styles.activityImage}
            contentFit="cover"
          />
          <View style={styles.activityBody}>
            <View style={[styles.catBadge, { backgroundColor: catColor + "1a" }]}>
              <Feather name={catIcon as any} size={11} color={catColor} />
              <Text style={[styles.catText, { color: catColor }]}>
                {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
              </Text>
            </View>

            <Text style={[styles.activityName, { color: colors.foreground }]} numberOfLines={2}>
              {item.name}
            </Text>

            {item.description ? (
              <Text style={[styles.activityDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}

            <View style={styles.activityMeta}>
              {!!item.durationMinutes && (
                <View style={styles.metaItem}>
                  <Feather name="clock" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{durationStr}</Text>
                </View>
              )}
              {!!item.rating && (
                <View style={styles.metaItem}>
                  <Feather name="star" size={12} color="#b45309" />
                  <Text style={[styles.metaText, { color: colors.foreground }]}>{item.rating.toFixed(1)}</Text>
                </View>
              )}
            </View>

            <View style={[styles.activityFooter, { borderTopColor: colors.border }]}>
              <Text style={[styles.priceText, { color: catColor }]}>
                {item.price ? `${currSymbol}${Math.round(item.price).toLocaleString()} / person` : "Free"}
              </Text>
              <View style={[styles.arrowBtn, { backgroundColor: catColor + "15" }]}>
                <Feather name="arrow-right" size={14} color={catColor} />
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderNightlifeCard = ({ item }: { item: typeof nightlifePlaces[number] }) => (
    <TouchableOpacity
      style={[styles.nightCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push(`/place/${item.id}` as any)}
      activeOpacity={0.85}
    >
      <Image
        source={{ uri: item.imageUrl ?? "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=600" }}
        style={styles.nightImage}
        contentFit="cover"
      />
      <View style={styles.nightBody}>
        <View style={styles.nightTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.nightName, { color: colors.foreground }]} numberOfLines={1}>
              {item.name}
            </Text>
            {item.address ? (
              <Text style={[styles.nightAddress, { color: colors.mutedForeground }]} numberOfLines={1}>
                {item.address}
              </Text>
            ) : null}
          </View>
          {item.rating != null && (
            <View style={styles.ratingChip}>
              <Feather name="star" size={11} color="#b45309" />
              <Text style={[styles.ratingText, { color: colors.foreground }]}>
                {item.rating.toFixed(1)}
              </Text>
            </View>
          )}
        </View>

        {item.openingHours ? (
          <View style={styles.hoursRow}>
            <Feather name="clock" size={11} color={colors.mutedForeground} />
            <Text style={[styles.hoursText, { color: colors.mutedForeground }]} numberOfLines={1}>
              {item.openingHours}
            </Text>
          </View>
        ) : null}

        {(item.tags ?? []).length > 0 && (
          <View style={styles.tagsRow}>
            {(item.tags ?? []).slice(0, 3).map(tag => (
              <View key={tag} style={[styles.tagChip, { backgroundColor: NIGHT_COLOR + "12" }]}>
                <Text style={[styles.tagText, { color: NIGHT_COLOR }]}>
                  {tag.charAt(0).toUpperCase() + tag.slice(1)}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={[styles.nightFooter, { borderTopColor: colors.border }]}>
          <View style={[styles.vibeChip, { backgroundColor: NIGHT_COLOR + "12" }]}>
            <MaterialCommunityIcons name="glass-cocktail" size={12} color={NIGHT_COLOR} />
            <Text style={[styles.vibeText, { color: NIGHT_COLOR }]}>Nightlife</Text>
          </View>
          <TouchableOpacity
            style={[styles.viewBtn, { backgroundColor: NIGHT_COLOR }]}
            onPress={() => router.push(`/place/${item.id}` as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.viewBtnText}>View</Text>
            <Feather name="arrow-right" size={12} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = (icon: string, title: string) => (
    <View style={styles.emptyContainer}>
      <Feather name={icon as any} size={40} color={colors.mutedForeground} />
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{title}</Text>
    </View>
  );

  // ── Layout ──────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Activities" topPadding={topPadding} />

      {/* Main tab switcher */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.tabBtn,
            mainTab === "activities" && { borderBottomColor: ACT_COLOR, borderBottomWidth: 2 },
          ]}
          onPress={() => setMainTab("activities")}
          activeOpacity={0.8}
        >
          <Feather
            name="zap"
            size={14}
            color={mainTab === "activities" ? ACT_COLOR : colors.mutedForeground}
          />
          <Text style={[
            styles.tabLabel,
            { color: mainTab === "activities" ? ACT_COLOR : colors.mutedForeground },
          ]}>
            Things To Do
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabBtn,
            mainTab === "nightlife" && { borderBottomColor: NIGHT_COLOR, borderBottomWidth: 2 },
          ]}
          onPress={() => setMainTab("nightlife")}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="glass-cocktail"
            size={14}
            color={mainTab === "nightlife" ? NIGHT_COLOR : colors.mutedForeground}
          />
          <Text style={[
            styles.tabLabel,
            { color: mainTab === "nightlife" ? NIGHT_COLOR : colors.mutedForeground },
          ]}>
            Nightlife
          </Text>
        </TouchableOpacity>
      </View>

      <NearbyFilters
        controls={nearby}
        accent={mainTab === "activities" ? ACT_COLOR : NIGHT_COLOR}
        showOpenNow={mainTab === "activities"}
      />

      {/* Sub-filters */}
      {mainTab === "activities" && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersContent}
        >
          {ACTIVITY_FILTERS.map(f => (
            <TouchableOpacity
              key={f.id}
              style={[
                styles.pill,
                {
                  backgroundColor: activityFilter === f.id ? ACT_COLOR : colors.card,
                  borderColor:     activityFilter === f.id ? ACT_COLOR : colors.border,
                },
              ]}
              onPress={() => setActivityFilter(f.id)}
            >
              <Text style={[styles.pillText, { color: activityFilter === f.id ? "#fff" : colors.foreground }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {mainTab === "nightlife" && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersContent}
        >
          {NIGHTLIFE_FILTERS.map(f => (
            <TouchableOpacity
              key={f.id}
              style={[
                styles.pill,
                {
                  backgroundColor: nightlifeFilter === f.id ? NIGHT_COLOR : colors.card,
                  borderColor:     nightlifeFilter === f.id ? NIGHT_COLOR : colors.border,
                },
              ]}
              onPress={() => setNightlifeFilter(f.id)}
            >
              <Text style={[styles.pillText, { color: nightlifeFilter === f.id ? "#fff" : colors.foreground }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Content */}
      {currentError ? (
        <ErrorState
          error={currentError}
          onRetry={currentRefetch}
          accent={currentAccent}
          subject={mainTab === "activities" ? "activities" : "nightlife"}
        />
      ) : mainTab === "activities" ? (
        actLoading ? (
          <>
            <TrendingStrip
              items={actTrendingItems}
              accentColor={ACT_COLOR}
              isLoading={true}
              label="Trending Activities"
            />
            <View style={styles.skeletonWrap}>
              <SkeletonCard height={160} />
              <SkeletonCard height={160} />
              <SkeletonCard height={160} />
            </View>
          </>
        ) : (
          <FlatList
            data={activities}
            keyExtractor={item => `act-${item.id}`}
            contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding }]}
            showsVerticalScrollIndicator={false}
            renderItem={renderActivityCard}
            refreshControl={refreshControl}
            {...LIST_PERFORMANCE_PROPS}
            ListHeaderComponent={
              <TrendingStrip
                items={actTrendingItems}
                accentColor={ACT_COLOR}
                isLoading={false}
                label="Trending Activities"
              />
            }
            ListEmptyComponent={
              <EmptyState
                icon="zap"
                accent={ACT_COLOR}
                title="No activities found"
                message={
                  activityFilter !== "all"
                    ? "Nothing in this category right now. Try another one."
                    : `No activities listed in ${cityName ?? "this city"} yet.`
                }
              />
            }
          />
        )
      ) : (
        nightLoading ? (
          <>
            <TrendingStrip
              items={nightTrendingItems}
              accentColor={NIGHT_COLOR}
              isLoading={true}
              label="Trending Nightlife"
            />
            <View style={styles.skeletonWrap}>
              <SkeletonCard height={260} />
              <SkeletonCard height={260} />
              <SkeletonCard height={260} />
            </View>
          </>
        ) : (
          <FlatList
            data={filteredNightlife}
            keyExtractor={item => `night-${item.id}`}
            contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding }]}
            showsVerticalScrollIndicator={false}
            renderItem={renderNightlifeCard}
            refreshControl={refreshControl}
            {...LIST_PERFORMANCE_PROPS}
            ListHeaderComponent={
              <TrendingStrip
                items={nightTrendingItems}
                accentColor={NIGHT_COLOR}
                isLoading={false}
                label="Trending Nightlife"
              />
            }
            ListEmptyComponent={
              <EmptyState
                icon="moon"
                accent={NIGHT_COLOR}
                title="No nightlife venues found"
                message={
                  cityName
                    ? `Nothing listed in ${cityName} for this filter yet.`
                    : "Select a city to browse nightlife."
                }
              />
            }
          />
        )
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // ── Tab bar ──
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },

  // ── Sub-filters ──
  filtersScroll: { flexGrow: 0, flexShrink: 0 },
  filtersContent: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  pillText: { fontFamily: "Inter_500Medium", fontSize: 13 },

  // ── Skeleton ──
  skeletonWrap: { flex: 1, padding: 16, gap: 12 },

  // ── Empty ──
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontFamily: "Inter_500Medium", fontSize: 16, textAlign: "center", paddingHorizontal: 32 },

  // ── Shared list ──
  listContent: { padding: 16, gap: 14 },

  // ── Activity card (horizontal) ──
  activityCard: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      web: { boxShadow: "0 2px 10px rgba(0,0,0,0.07)" } as any,
      default: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3 },
    }),
  },
  cardInner: { flexDirection: "row", alignItems: "stretch" },
  activityImage: { width: 120, minHeight: 140 },
  activityBody: { flex: 1, padding: 14, gap: 6 },
  catBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: "flex-start" },
  catText: { fontFamily: "Inter_600SemiBold", fontSize: 10 },
  activityName: { fontFamily: "Inter_700Bold", fontSize: 14, lineHeight: 19 },
  activityDesc: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17 },
  activityMeta: { flexDirection: "row", gap: 12 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontFamily: "Inter_500Medium", fontSize: 11 },
  activityFooter: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: 8, marginTop: 2, borderTopWidth: StyleSheet.hairlineWidth,
  },
  priceText: { fontFamily: "Inter_700Bold", fontSize: 14 },
  arrowBtn: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },

  // ── Nightlife card (vertical) ──
  nightCard: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      web: { boxShadow: "0 2px 10px rgba(0,0,0,0.08)" } as any,
      default: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 },
    }),
  },
  nightImage: { width: "100%", height: 180 },
  nightBody: { padding: 14, gap: 8 },
  nightTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  nightName: { fontFamily: "Inter_700Bold", fontSize: 15, lineHeight: 21 },
  nightAddress: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  ratingChip: { flexDirection: "row", alignItems: "center", gap: 3, flexShrink: 0 },
  ratingText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  hoursRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  hoursText: { fontFamily: "Inter_400Regular", fontSize: 12 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tagChip: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8 },
  tagText: { fontFamily: "Inter_500Medium", fontSize: 11 },
  nightFooter: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth,
  },
  vibeChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  vibeText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  viewBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 },
  viewBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff" },
});
