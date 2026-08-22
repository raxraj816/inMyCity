import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, FlatList
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useGetHotels } from "@workspace/api-client-react";
import { useCity } from "@/context/CityContext";
import { EmptyState, ErrorState, LIST_PERFORMANCE_PROPS, useListRefreshControl } from "@/components/ListStates";
import { ScreenHeader } from "@/components/ScreenHeader";
import { NearbyFilters } from "@/components/NearbyFilters";
import { useNearby } from "@/hooks/useNearby";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "budget", label: "Budget" },
  { id: "mid-range", label: "Mid-Range" },
  { id: "luxury", label: "Luxury" },
  { id: "boutique", label: "Boutique" },
];

// Shades chosen to stay readable as text on their own tinted pill.
const CATEGORY_COLORS: Record<string, string> = {
  budget: "#047857",
  "mid-range": "#0369a1",
  luxury: "#b45309",
  boutique: "#db2777",
};

const ACCENT = "#b45309";

export default function HotelsScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedCity } = useCity();
  const [activeFilter, setActiveFilter] = useState("all");

  const nearby = useNearby();

  const { data: hotels = [], isLoading, isRefetching, error, refetch } = useGetHotels({
    city: selectedCity?.name,
    category: activeFilter !== "all" ? activeFilter : undefined,
    ...nearby.queryParams,
  });

  const refreshControl = useListRefreshControl(isRefetching, refetch, ACCENT);

  const isLocal = selectedCity?.name === "Mumbai" || selectedCity?.name === "Bangalore";
  const currencySymbol = isLocal ? "₹" : "$";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Hotels" topPadding={Math.max(insets.top, 20)} />

      {/* Filter Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={styles.filtersContent}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.id}
            style={[
              styles.pill,
              { backgroundColor: activeFilter === f.id ? ACCENT : colors.card, borderColor: activeFilter === f.id ? ACCENT : colors.border }
            ]}
            onPress={() => setActiveFilter(f.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeFilter === f.id }}
            accessibilityLabel={`${f.label} hotels`}
          >
            <Text style={[styles.pillText, { color: activeFilter === f.id ? "#fff" : colors.foreground }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <NearbyFilters controls={nearby} accent={ACCENT} showOpenNow={false} />

      {/* Hotels List */}
      {error ? (
        <ErrorState error={error} onRetry={refetch} accent={ACCENT} subject="hotels" />
      ) : isLoading ? (
        <View style={styles.loadingContainer}>
          {[1, 2, 3].map(i => (
            <View key={i} style={[styles.skeletonCard, { backgroundColor: colors.card }]} />
          ))}
        </View>
      ) : (
        <FlatList
          data={hotels}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
          {...LIST_PERFORMANCE_PROPS}
          ListEmptyComponent={
            <EmptyState
              icon="home"
              title="No hotels found"
              accent={ACCENT}
              message={
                activeFilter !== "all"
                  ? `No ${activeFilter} hotels in ${selectedCity?.name ?? "this city"} yet. Try another price band.`
                  : `No hotels listed in ${selectedCity?.name ?? "this city"} yet.`
              }
            />
          }
          renderItem={({ item }) => {
            const catColor = CATEGORY_COLORS[item.category] ?? "#4f46e5";
            return (
              <TouchableOpacity
                style={[styles.hotelCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push(`/hotel/${item.id}` as any)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={[
                  item.name,
                  item.category,
                  item.rating != null ? `rated ${item.rating.toFixed(1)} out of 5` : null,
                  item.pricePerNight
                    ? `from ${currencySymbol}${Math.round(item.pricePerNight)} per night`
                    : null,
                  item.address,
                ]
                  .filter(Boolean)
                  .join(", ")}
                accessibilityHint="Opens this hotel"
              >
                <Image
                  source={{ uri: item.imageUrl ?? "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600" }}
                  style={styles.hotelImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
                <View style={styles.hotelBody}>
                  <View style={styles.hotelHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.hotelName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
                      <Text style={[styles.hotelAddress, { color: colors.mutedForeground }]} numberOfLines={1}>{item.address}</Text>
                    </View>
                    <View style={[styles.categoryPill, { backgroundColor: catColor + "1a", borderColor: catColor + "30" }]}>
                      <Text style={[styles.categoryText, { color: catColor }]}>
                        {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.hotelMeta}>
                    {item.rating && (
                      <View style={styles.ratingRow}>
                        <Feather name="star" size={13} color="#b45309" />
                        <Text style={[styles.ratingText, { color: colors.foreground }]}>{item.rating.toFixed(1)}</Text>
                        {item.reviewCount && (
                          <Text style={[styles.reviewCount, { color: colors.mutedForeground }]}>({item.reviewCount.toLocaleString()})</Text>
                        )}
                      </View>
                    )}
                    {item.amenities && item.amenities.length > 0 && (
                      <View style={styles.amenitiesRow}>
                        {item.amenities.slice(0, 3).map(a => (
                          <View key={a} style={[styles.amenityTag, { backgroundColor: colors.background }]}>
                            <Text style={[styles.amenityText, { color: colors.mutedForeground }]}>{a}</Text>
                          </View>
                        ))}
                        {item.amenities.length > 3 && (
                          <Text style={[styles.amenityMore, { color: colors.mutedForeground }]}>+{item.amenities.length - 3}</Text>
                        )}
                      </View>
                    )}
                  </View>

                  <View style={[styles.hotelFooter, { borderTopColor: colors.border }]}>
                    <View>
                      <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>Per night from</Text>
                      <Text style={[styles.priceValue, { color: ACCENT }]}>
                        {item.pricePerNight ? `${currencySymbol}${Math.round(item.pricePerNight).toLocaleString()}` : "—"}
                      </Text>
                    </View>
                    <View style={[styles.viewBtn, { backgroundColor: ACCENT }]}>
                      <Text style={styles.viewBtnText}>View</Text>
                      <Feather name="arrow-right" size={14} color="#fff" />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },
  filtersScroll: { flexGrow: 0, flexShrink: 0 },
  filtersContent: { flexDirection: "row", flexWrap: "nowrap", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  pillText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  loadingContainer: { padding: 16, gap: 12 },
  skeletonCard: { height: 240, borderRadius: 16 },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontFamily: "Inter_500Medium", fontSize: 16 },
  listContent: { padding: 16, gap: 16 },
  hotelCard: {
    borderRadius: 20, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      web: { boxShadow: "0 2px 12px rgba(0,0,0,0.08)" },
      default: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
    }),
  },
  hotelImage: { width: "100%", height: 200 },
  hotelBody: { padding: 16 },
  hotelHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 10 },
  hotelName: { fontFamily: "Inter_700Bold", fontSize: 16, marginBottom: 2 },
  hotelAddress: { fontFamily: "Inter_400Regular", fontSize: 12 },
  categoryPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  categoryText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  hotelMeta: { gap: 8, marginBottom: 12 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  reviewCount: { fontFamily: "Inter_400Regular", fontSize: 12 },
  amenitiesRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  amenityTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  amenityText: { fontFamily: "Inter_400Regular", fontSize: 11 },
  amenityMore: { fontFamily: "Inter_400Regular", fontSize: 11, alignSelf: "center" },
  hotelFooter: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth,
  },
  priceLabel: { fontFamily: "Inter_400Regular", fontSize: 11, marginBottom: 2 },
  priceValue: { fontFamily: "Inter_700Bold", fontSize: 20 },
  viewBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
  },
  viewBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
});
