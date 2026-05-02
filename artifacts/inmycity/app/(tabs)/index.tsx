import {
  View,
  FlatList,
  StyleSheet,
  Platform,
  Text,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useGetPlaces } from "@workspace/api-client-react";
import { useCity } from "@/context/CityContext";
import { CityPicker } from "@/components/CityPicker";
import { CategoryGrid } from "@/components/CategoryGrid";
import { PlaceCard } from "@/components/PlaceCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { ErrorFallback } from "@/components/ErrorFallback";
import { AppHeader } from "@/components/AppHeader";

export default function ExploreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedCity } = useCity();

  const cityName = selectedCity?.name;
  const topPadding = Math.max(insets.top, 20);
  const bottomPadding = Platform.OS === "web" ? 84 : 84 + insets.bottom;

  const {
    data: places,
    isLoading: placesLoading,
    error: placesError,
    refetch: refetchPlaces,
  } = useGetPlaces({ city: cityName });

  if (placesError) {
    return <ErrorFallback error={placesError as Error} resetError={refetchPlaces} />;
  }

  const trending = (places || []).slice(0, 10);

  // Scrollable section header — grid + trending label
  const ListHeader = () => (
    <View>
      <View style={styles.sectionRow}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Explore</Text>
      </View>
      <CategoryGrid />
      <View style={styles.sectionRow}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Trending in {cityName ?? "City"}
        </Text>
        <Feather name="trending-up" size={15} color={colors.amber} />
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* ── Sticky header — never scrolls ── */}
      <AppHeader
        subtitle="City At Your Fingertips"
        topPadding={topPadding}
        showCityPicker
      />

      {/* ── Scrollable content ── */}
      {placesLoading ? (
        <View style={styles.loadingArea}>
          <ListHeader />
          <SkeletonCard height={180} style={styles.skeleton} />
          <SkeletonCard height={180} style={styles.skeleton} />
        </View>
      ) : (
        <FlatList
          data={trending}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <PlaceCard place={item} />}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={{ paddingBottom: bottomPadding }}
          showsVerticalScrollIndicator={false}
          onRefresh={refetchPlaces}
          refreshing={placesLoading}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
                <Feather name="compass" size={32} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nothing here yet</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Try switching to a different city.
              </Text>
            </View>
          }
        />
      )}

      <CityPicker />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingArea: { flex: 1 },
  skeleton: { marginHorizontal: 20, marginBottom: 16 },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 48,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 20, marginBottom: 8 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 15, textAlign: "center", lineHeight: 22 },
});
