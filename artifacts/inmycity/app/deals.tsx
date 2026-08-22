import { useState } from "react";
import { View, FlatList, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useGetDeals } from "@workspace/api-client-react";
import { useCity } from "@/context/CityContext";

import { CategoryFilter } from "@/components/CategoryFilter";
import { DealCard } from "@/components/DealCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { EmptyState, ErrorState, LIST_PERFORMANCE_PROPS, useListRefreshControl } from "@/components/ListStates";
import { ScreenHeader } from "@/components/ScreenHeader";
import { TrendingStrip, TrendingStripItem } from "@/components/TrendingStrip";
import { NearbyFilters } from "@/components/NearbyFilters";
import { useNearby } from "@/hooks/useNearby";

const CATEGORIES = ["food", "attraction", "retail", "wellness", "nightlife", "fitness"];
const ACCENT = "#047857";

export default function DealsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedCity } = useCity();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const nearby = useNearby();

  const {
    data: deals,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useGetDeals({
    city: selectedCity?.name,
    category: selectedCategory || undefined,
    ...nearby.queryParams,
  });

  const topPadding = Math.max(insets.top, 20);
  const bottomPadding = Platform.OS === "web" ? 84 : 84 + insets.bottom;

  const trendingItems: TrendingStripItem[] = (deals ?? []).slice(0, 8).map(d => ({
    id:       String(d.id),
    title:    d.title,
    imageUrl: d.imageUrl,
    meta1:    d.discountText ?? "Deal",
    meta2:    d.placeName ?? undefined,
    route:    `/deal/${d.id}`,
  }));

  const refreshControl = useListRefreshControl(isRefetching, refetch, ACCENT);

  const ListHeader = (
    <TrendingStrip
      items={trendingItems}
      accentColor={ACCENT}
      isLoading={isLoading && !deals}
      label="Trending Deals"
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      <ScreenHeader title="Deals" topPadding={topPadding} />

      <CategoryFilter
        categories={CATEGORIES}
        selectedCategory={selectedCategory}
        onSelect={setSelectedCategory}
      />

      <NearbyFilters controls={nearby} accent={ACCENT} showOpenNow={false} />

      {error ? (
        <ErrorState error={error} onRetry={refetch} accent={ACCENT} subject="deals" />
      ) : isLoading && !deals ? (
        <>
          {ListHeader}
          <View style={styles.loadingArea}>
            <SkeletonCard height={140} style={styles.skeleton} />
            <SkeletonCard height={140} style={styles.skeleton} />
            <SkeletonCard height={140} style={styles.skeleton} />
          </View>
        </>
      ) : (
        <FlatList
          data={deals || []}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <DealCard deal={item} />}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={{ paddingBottom: bottomPadding }}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
          {...LIST_PERFORMANCE_PROPS}
          ListEmptyComponent={
            !isLoading ? (
              <EmptyState
                icon="tag"
                title="No deals found"
                accent={ACCENT}
                message={
                  selectedCategory
                    ? `No ${selectedCategory} deals in ${selectedCity?.name ?? "this city"} right now.`
                    : `No active deals in ${selectedCity?.name ?? "this city"} right now.`
                }
              />
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingArea: { flex: 1, paddingTop: 8 },
  skeleton: { marginHorizontal: 20, marginBottom: 16 },
});
