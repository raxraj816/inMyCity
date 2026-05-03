import { useState } from "react";
import { View, FlatList, StyleSheet, Platform, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useGetDeals } from "@workspace/api-client-react";
import { useCity } from "@/context/CityContext";

import { CategoryFilter } from "@/components/CategoryFilter";
import { DealCard } from "@/components/DealCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { ErrorFallback } from "@/components/ErrorFallback";
import { AppHeader } from "@/components/AppHeader";
import { TrendingStrip, TrendingStripItem } from "@/components/TrendingStrip";

const CATEGORIES = ["food", "attraction", "retail", "wellness", "nightlife", "fitness"];
const ACCENT = "#10b981";

export default function DealsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedCity } = useCity();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const {
    data: deals,
    isLoading,
    error,
    refetch,
  } = useGetDeals({
    city: selectedCity?.name,
    category: selectedCategory || undefined,
  });

  const topPadding = Math.max(insets.top, 20);
  const bottomPadding = Platform.OS === "web" ? 84 : 84 + insets.bottom;

  // Build trending strip — top 8 deals
  const trendingItems: TrendingStripItem[] = (deals ?? []).slice(0, 8).map(d => ({
    id:       String(d.id),
    title:    d.title,
    imageUrl: d.imageUrl,
    meta1:    d.discountText ?? "Deal",
    meta2:    d.placeName ?? undefined,
    route:    `/deal/${d.id}`,
  }));

  if (error) {
    return <ErrorFallback error={error as Error} resetError={refetch} />;
  }

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

      {/* ── Sticky header ── */}
      <AppHeader subtitle="Deals" topPadding={topPadding} />

      {/* ── Sticky category filter bar ── */}
      <CategoryFilter
        categories={CATEGORIES}
        selectedCategory={selectedCategory}
        onSelect={setSelectedCategory}
      />

      {/* ── Scrollable content ── */}
      {isLoading && !deals ? (
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
          onRefresh={refetch}
          refreshing={isLoading}
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyContainer}>
                <View style={[styles.emptyIconContainer, { backgroundColor: colors.muted }]}>
                  <Feather name="tag" size={32} color={colors.mutedForeground} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No deals found</Text>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  {selectedCategory
                    ? `No ${selectedCategory} deals in ${selectedCity?.name ?? "this city"}.`
                    : `No active deals in ${selectedCity?.name ?? "this city"}.`}
                </Text>
              </View>
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
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingTop: 60, paddingHorizontal: 40 },
  emptyIconContainer: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 20, marginBottom: 8 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 16, textAlign: "center" },
});
