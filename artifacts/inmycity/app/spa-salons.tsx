import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useGetPlaces } from "@workspace/api-client-react";
import { useCity } from "@/context/CityContext";
import { PlaceCard } from "@/components/PlaceCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { EmptyState, ErrorState, LIST_PERFORMANCE_PROPS, useListRefreshControl } from "@/components/ListStates";
import { ScreenHeader } from "@/components/ScreenHeader";
import { NearbyFilters } from "@/components/NearbyFilters";
import { useNearby } from "@/hooks/useNearby";

/**
 * Spa and salon venues, served from the `wellness` place category.
 *
 * The tile that leads here used to say "Explore" and open the City Guide tab — a second door
 * to a screen the tab bar already offers. It is a category of its own now, filtered the same
 * way Shops and Restaurants are.
 */
const ACCENT = "#0e7490";

const FILTERS = [
  { id: "all",    label: "All"        },
  { id: "spa",    label: "Spas"       },
  { id: "salon",  label: "Salons"     },
  { id: "hair",   label: "Hair"       },
  { id: "skin",   label: "Skin"       },
  { id: "ayurveda", label: "Ayurveda" },
];

export default function SpaSalonsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedCity } = useCity();
  const [activeFilter, setActiveFilter] = useState("all");

  const nearby = useNearby();

  const { data: places = [], isLoading, isRefetching, error, refetch } = useGetPlaces({
    city: selectedCity?.name,
    category: "wellness",
    ...nearby.queryParams,
  });

  const filtered =
    activeFilter === "all"
      ? places
      : places.filter((place) => place.tags?.some((tag) => tag.toLowerCase().includes(activeFilter)));

  const refreshControl = useListRefreshControl(isRefetching, refetch, ACCENT);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Spa & Salons" topPadding={Math.max(insets.top, 20)} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filtersContent}
      >
        {FILTERS.map((filter) => {
          const active = activeFilter === filter.id;
          return (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.pill,
                { backgroundColor: active ? ACCENT : colors.card, borderColor: active ? ACCENT : colors.border },
              ]}
              onPress={() => setActiveFilter(filter.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${filter.label} spa and salon venues`}
            >
              <Text style={[styles.pillText, { color: active ? "#fff" : colors.foreground }]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <NearbyFilters controls={nearby} accent={ACCENT} />

      {error ? (
        <ErrorState error={error} onRetry={refetch} accent={ACCENT} subject="spas and salons" />
      ) : isLoading ? (
        <View style={styles.loadingContainer}>
          {[1, 2, 3].map((key) => (
            <SkeletonCard key={key} height={240} style={styles.skeleton} />
          ))}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <PlaceCard place={item} />}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
          {...LIST_PERFORMANCE_PROPS}
          ListEmptyComponent={
            <EmptyState
              icon="heart"
              accent={ACCENT}
              title="Nothing here yet"
              message={
                activeFilter !== "all"
                  ? `No ${activeFilter} listings in ${selectedCity?.name ?? "this city"} yet. Try another filter.`
                  : `We haven't added spas or salons in ${selectedCity?.name ?? "this city"} yet.`
              }
              action={
                activeFilter !== "all"
                  ? { label: "Show everything", onPress: () => setActiveFilter("all") }
                  : undefined
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
});
