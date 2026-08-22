import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  Platform, FlatList,
} from "react-native";
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
  { id: "all",       label: "All"        },
  { id: "cocktail",  label: "Cocktails"  },
  { id: "bar",       label: "Bars"       },
  { id: "club",      label: "Clubs"      },
  { id: "live",      label: "Live Music" },
  { id: "rooftop",   label: "Rooftop"    },
  { id: "pub",       label: "Pubs"       },
];

const ACCENT = "#be185d";

export default function NightlifeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedCity } = useCity();
  const [activeFilter, setActiveFilter] = useState("all");

  const nearby = useNearby();

  const { data: places = [], isLoading, isRefetching, error, refetch } = useGetPlaces({
    city: selectedCity?.name,
    category: "nightlife",
    ...nearby.queryParams,
  });

  const filtered = activeFilter === "all"
    ? places
    : places.filter(p =>
        p.tags?.some(t => t.toLowerCase().includes(activeFilter)) ||
        p.category?.toLowerCase().includes(activeFilter)
      );

  const trendingItems: TrendingStripItem[] = places.slice(0, 8).map(p => ({
    id:       String(p.id),
    title:    p.name,
    imageUrl: p.imageUrl,
    meta1:    p.tags?.[0]
      ? p.tags[0].charAt(0).toUpperCase() + p.tags[0].slice(1)
      : "Nightlife",
    meta2:    p.rating != null ? `⭐ ${p.rating.toFixed(1)}` : undefined,
    route:    `/place/${p.id}`,
  }));

  const refreshControl = useListRefreshControl(isRefetching, refetch, ACCENT);

  const ListHeader = (
    <View>
      <ScreenHeader
        title="Nightlife"
        topPadding={Math.max(insets.top, 20)}
      />

      {/* Filter pills */}
      <FlatList
        horizontal
        data={FILTERS}
        keyExtractor={f => f.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.pill,
              {
                backgroundColor: activeFilter === item.id ? ACCENT : colors.card,
                borderColor: activeFilter === item.id ? ACCENT : colors.border,
              },
            ]}
            onPress={() => setActiveFilter(item.id)}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.pillText,
                { color: activeFilter === item.id ? "#fff" : colors.foreground },
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      <NearbyFilters controls={nearby} accent={ACCENT} />

      {/* Tonight hot spots strip */}
      {trendingItems.length > 0 && (
        <TrendingStrip
          items={trendingItems}
          accentColor={ACCENT}
          label="Tonight's Hot Spots"
        />
      )}

      {/* Section label */}
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
        {filtered.length} VENUES
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {error ? (
        <ErrorState error={error} onRetry={refetch} accent={ACCENT} subject="nightlife" />
      ) : isLoading ? (
        <View>
          {ListHeader}
          <SkeletonCard style={styles.skeleton} />
          <SkeletonCard style={styles.skeleton} />
          <SkeletonCard style={styles.skeleton} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={p => String(p.id)}
          renderItem={({ item }) => <PlaceCard place={item} />}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 84 : 84 + insets.bottom }}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
          {...LIST_PERFORMANCE_PROPS}
          ListEmptyComponent={
            <EmptyState
              icon="moon"
              title="No venues found"
              accent={ACCENT}
              message="Try a different filter, or switch city from the header."
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterList: {
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
  pillText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  skeleton: { marginHorizontal: 20, marginBottom: 16 },
  empty: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
});
