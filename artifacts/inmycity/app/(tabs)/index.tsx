import { useState } from "react";
import { View, FlatList, StyleSheet, Platform, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useGetPlaces, useGetExploreSummary } from "@workspace/api-client-react";
import { useLocation } from "@/context/LocationContext";

import { CategoryFilter } from "@/components/CategoryFilter";
import { StatsBar } from "@/components/StatsBar";
import { PlaceCard } from "@/components/PlaceCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { ErrorFallback } from "@/components/ErrorFallback";

const CATEGORIES = ["food", "attraction", "essentials", "nightlife"];

export default function ExploreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { location, isLoading: locationLoading } = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const {
    data: places,
    isLoading: placesLoading,
    error: placesError,
    refetch: refetchPlaces
  } = useGetPlaces({
    lat: location?.lat,
    lng: location?.lng,
    category: selectedCategory || undefined,
  });

  const {
    data: summary,
    isLoading: summaryLoading,
  } = useGetExploreSummary({
    lat: location?.lat,
    lng: location?.lng,
  });

  const isLoading = placesLoading || summaryLoading;

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 84 : 84 + insets.bottom;

  if (placesError) {
    return <ErrorFallback error={placesError as Error} resetError={refetchPlaces} />;
  }

  const renderHeader = () => (
    <View style={{ paddingTop: topPadding }}>
      {summary && (
        <StatsBar
          places={summary.totalPlaces}
          events={summary.totalEvents}
          deals={summary.totalDeals}
        />
      )}
      <CategoryFilter
        categories={CATEGORIES}
        selectedCategory={selectedCategory}
        onSelect={setSelectedCategory}
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          {renderHeader()}
          <SkeletonCard height={180} style={styles.skeleton} />
          <SkeletonCard height={180} style={styles.skeleton} />
          <SkeletonCard height={180} style={styles.skeleton} />
        </View>
      ) : (
        <FlatList
          data={places || []}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <PlaceCard place={item} />}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={{ paddingBottom: bottomPadding }}
          showsVerticalScrollIndicator={false}
          onRefresh={refetchPlaces}
          refreshing={placesLoading}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
  },
  skeleton: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
});
