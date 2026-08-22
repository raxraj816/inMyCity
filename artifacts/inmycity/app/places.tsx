import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, FlatList
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useGetPlaces } from "@workspace/api-client-react";
import { useCity } from "@/context/CityContext";
import { PlaceCard } from "@/components/PlaceCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { ErrorFallback } from "@/components/ErrorFallback";
import { ScreenHeader } from "@/components/ScreenHeader";
import { NearbyFilters } from "@/components/NearbyFilters";
import { useNearby } from "@/hooks/useNearby";

const FILTERS = [
  { id: "all",        label: "All",         category: undefined      },
  { id: "attraction", label: "Attractions",  category: "attraction"  },
  { id: "nightlife",  label: "Nightlife",    category: "nightlife"   },
  { id: "essentials", label: "Essentials",   category: "essentials"  },
];

const ACCENT = "#6366f1";

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

  const { data: places = [], isLoading, error, refetch } = useGetPlaces({
    city: selectedCity?.name,
    category: activeCategory,
    ...nearby.queryParams,
  });

  if (error) return <ErrorFallback error={error as Error} resetError={refetch} />;

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
            >
              <Text style={[styles.pillText, { color: active ? "#fff" : colors.foreground }]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <NearbyFilters controls={nearby} accent={ACCENT} />

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          {[1, 2, 3].map(i => <SkeletonCard key={i} height={240} style={styles.skeleton} />)}
        </View>
      ) : places.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIcon, { backgroundColor: ACCENT + "15" }]}>
            <Feather name="map-pin" size={32} color={ACCENT} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No places found</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {nearby.nearbyEnabled || nearby.openNowEnabled
              ? "Nothing matches those filters right now. Try turning one off."
              : activeFilter !== "all"
                ? `No ${activeFilter} spots in ${selectedCity?.name ?? "this city"} yet.`
                : `No places in ${selectedCity?.name ?? "this city"} yet.`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={places}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => <PlaceCard place={item} />}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isLoading}
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
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 40 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 20 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 15, textAlign: "center", lineHeight: 22 },
});
