import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
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

const FILTERS = [
  { id: "all",        label: "All",         category: undefined      },
  { id: "attraction", label: "Attractions",  category: "attraction"  },
  { id: "nightlife",  label: "Nightlife",    category: "nightlife"   },
  { id: "essentials", label: "Essentials",   category: "essentials"  },
  { id: "wellness",   label: "Spa & Salons", category: "wellness"    },
];

const ACCENT = "#4f46e5";

export default function PlacesScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedCity } = useCity();
  const { filter: initialFilter } = useLocalSearchParams<{ filter?: string }>();
  const [activeFilter, setActiveFilter] = useState(
    FILTERS.some(f => f.id === initialFilter) ? (initialFilter as string) : "all"
  );

  const activeCategory = FILTERS.find(f => f.id === activeFilter)?.category;
  const nearby = useNearby();

  const { data: places = [], isLoading, isRefetching, error, refetch } = useGetPlaces({
    city: selectedCity?.name,
    category: activeCategory,
    ...nearby.queryParams,
  });

  const refreshControl = useListRefreshControl(isRefetching, refetch, ACCENT);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Places" topPadding={Math.max(insets.top, 20)} />

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
                { backgroundColor: active ? ACCENT : colors.card, borderColor: active ? ACCENT : colors.border }
              ]}
              onPress={() => setActiveFilter(f.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${f.label} places`}
            >
              <Text style={[styles.pillText, { color: active ? "#fff" : colors.foreground }]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <NearbyFilters controls={nearby} accent={ACCENT} />

      {/* Content */}
      {error ? (
        <ErrorState error={error} onRetry={refetch} accent={ACCENT} subject="places" />
      ) : isLoading ? (
        <View style={styles.loadingContainer}>
          {[1, 2, 3].map(i => <SkeletonCard key={i} height={240} style={styles.skeleton} />)}
        </View>
      ) : (
        <FlatList
          data={places}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => <PlaceCard place={item} />}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
          {...LIST_PERFORMANCE_PROPS}
          ListEmptyComponent={
            <EmptyState
              icon="map-pin"
              title="No places found"
              accent={ACCENT}
              message={
                nearby.nearbyEnabled || nearby.openNowEnabled
                  ? "Nothing matches those filters right now. Try turning one off."
                  : activeFilter !== "all"
                    ? `No ${activeFilter} spots in ${selectedCity?.name ?? "this city"} yet.`
                    : `No places in ${selectedCity?.name ?? "this city"} yet.`
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },
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
