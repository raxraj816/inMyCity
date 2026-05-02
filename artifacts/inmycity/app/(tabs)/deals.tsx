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

const CATEGORIES = ["food", "attraction", "retail", "wellness", "nightlife", "fitness"];

export default function DealsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedCity } = useCity();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const {
    data: deals,
    isLoading,
    error,
    refetch
  } = useGetDeals({
    city: selectedCity?.name,
    category: selectedCategory || undefined,
  });

  const topPadding = Math.max(insets.top, 20);
  const bottomPadding = Platform.OS === "web" ? 84 : 84 + insets.bottom;

  if (error) {
    return <ErrorFallback error={error as Error} resetError={refetch} />;
  }

  const renderHeader = () => (
    <View>
      <AppHeader subtitle="Deals" topPadding={topPadding} />
      <CategoryFilter
        categories={CATEGORIES}
        selectedCategory={selectedCategory}
        onSelect={setSelectedCategory}
      />
    </View>
  );

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={[styles.emptyContainer, { paddingTop: 60 }]}>
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
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isLoading && !deals ? (
        <View style={styles.loadingContainer}>
          {renderHeader()}
          <SkeletonCard height={140} style={styles.skeleton} />
          <SkeletonCard height={140} style={styles.skeleton} />
          <SkeletonCard height={140} style={styles.skeleton} />
        </View>
      ) : (
        <FlatList
          data={deals || []}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <DealCard deal={item} />}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={{ paddingBottom: bottomPadding }}
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
  },
  cityTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  cityTagText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  loadingContainer: { flex: 1 },
  skeleton: { marginHorizontal: 20, marginBottom: 16 },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
  emptyIconContainer: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 20, marginBottom: 8 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 16, textAlign: "center" },
});
