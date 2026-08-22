import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useGetPlaces } from "@workspace/api-client-react";
import { useCity } from "@/context/CityContext";
import { PlaceCard } from "@/components/PlaceCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { EmptyState, ErrorState, LIST_PERFORMANCE_PROPS, useListRefreshControl } from "@/components/ListStates";
import { ScreenHeader } from "@/components/ScreenHeader";
import { TrendingStrip, TrendingStripItem } from "@/components/TrendingStrip";
import { NearbyFilters } from "@/components/NearbyFilters";
import { useNearby } from "@/hooks/useNearby";

const FILTERS = [
  { id: "all",         label: "All"         },
  { id: "restaurant",  label: "Restaurants" },
  { id: "cafe",        label: "Cafes"       },
  { id: "street food", label: "Street Food" },
  { id: "bar",         label: "Bars"        },
];

const ACCENT = "#c2410c";

export default function DiningScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedCity } = useCity();
  const [activeFilter, setActiveFilter] = useState("all");

  const nearby = useNearby();

  const { data: places = [], isLoading, isRefetching, error, refetch } = useGetPlaces({
    city: selectedCity?.name,
    category: "food",
    ...nearby.queryParams,
  });

  const filtered = activeFilter === "all"
    ? places
    : places.filter(p => p.tags?.some(t => t.toLowerCase() === activeFilter) || p.category?.toLowerCase() === activeFilter);

  // Build trending strip items from all places (unfiltered)
  const trendingItems: TrendingStripItem[] = places.slice(0, 8).map(p => ({
    id:       String(p.id),
    title:    p.name,
    imageUrl: p.imageUrl,
    meta1:    p.tags?.[0]
      ? p.tags[0].charAt(0).toUpperCase() + p.tags[0].slice(1)
      : "Dining",
    meta2:    p.rating != null ? `⭐ ${p.rating.toFixed(1)}` : undefined,
    route:    `/place/${p.id}`,
  }));

  const refreshControl = useListRefreshControl(isRefetching, refetch, ACCENT);

  // Header injected into FlatList so it scrolls with content
  const ListHeader = (
    <TrendingStrip
      items={trendingItems}
      accentColor={ACCENT}
      isLoading={isLoading}
      label="Trending Dining"
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Dining" topPadding={Math.max(insets.top, 20)} />

      {/* Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filtersContent}
      >
        {FILTERS.map(f => {
          const active = activeFilter === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              style={[
                styles.pill,
                { backgroundColor: active ? ACCENT : colors.card, borderColor: active ? ACCENT : colors.border },
              ]}
              onPress={() => setActiveFilter(f.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${f.label} in dining`}
            >
              <Text style={[styles.pillText, { color: active ? "#fff" : colors.foreground }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <NearbyFilters controls={nearby} accent={ACCENT} />

      {/* Content */}
      {error ? (
        <ErrorState error={error} onRetry={refetch} accent={ACCENT} subject="dining spots" />
      ) : isLoading ? (
        <>
          {ListHeader}
          <View style={styles.loadingContainer}>
            {[1, 2, 3].map(i => <SkeletonCard key={i} height={240} style={styles.skeleton} />)}
          </View>
        </>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => <PlaceCard place={item} />}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={{ paddingTop: 0, paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
          {...LIST_PERFORMANCE_PROPS}
          ListEmptyComponent={
            <EmptyState
              icon="coffee"
              title="No restaurants found"
              accent={ACCENT}
              message={
                activeFilter !== "all"
                  ? `No ${activeFilter} spots in ${selectedCity?.name ?? "this city"} yet.`
                  : `No dining spots in ${selectedCity?.name ?? "this city"} yet.`
              }
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filtersScroll: { flexGrow: 0, flexShrink: 0 },
  filtersContent: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  loadingContainer: { padding: 16, gap: 12 },
  skeleton: { marginHorizontal: 20, marginBottom: 4 },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 40 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 20 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 15, textAlign: "center", lineHeight: 22 },
});
