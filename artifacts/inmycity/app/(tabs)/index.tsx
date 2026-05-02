import {
  View,
  FlatList,
  StyleSheet,
  Platform,
  Text,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";

import { useColors } from "@/hooks/useColors";
import {
  useGetPlaces,
  useGetExploreSummary,
  useGetItineraries,
} from "@workspace/api-client-react";
import { useCity } from "@/context/CityContext";
import { CityPicker } from "@/components/CityPicker";

import { CategoryFilter } from "@/components/CategoryFilter";
import { StatsBar } from "@/components/StatsBar";
import { PlaceCard } from "@/components/PlaceCard";
import { ItineraryCard } from "@/components/ItineraryCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { ErrorFallback } from "@/components/ErrorFallback";

const CATEGORIES = ["food", "attraction", "essentials", "nightlife"];

export default function ExploreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selectedCity, showPicker } = useCity();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const cityName = selectedCity?.name;

  const {
    data: places,
    isLoading: placesLoading,
    error: placesError,
    refetch: refetchPlaces,
  } = useGetPlaces({ city: cityName, category: selectedCategory || undefined });

  const { data: summary } = useGetExploreSummary({ city: cityName });
  const { data: itineraries } = useGetItineraries({ city: cityName });

  const topPadding = Platform.OS === "web" ? 20 : insets.top + 4;
  const bottomPadding = Platform.OS === "web" ? 84 : 84 + insets.bottom;

  if (placesError) {
    return <ErrorFallback error={placesError as Error} resetError={refetchPlaces} />;
  }

  const renderHeader = () => (
    <View>
      {/* Top bar: logo + profile */}
      <View style={[styles.topBar, { paddingTop: topPadding }]}>
        <View style={styles.topRow}>
          <Text style={[styles.appName, { color: colors.amber }]}>inMyCity</Text>
          <TouchableOpacity
            onPress={() => router.push("/profile")}
            activeOpacity={0.75}
            style={[styles.profileBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Feather name="user" size={17} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        {/* City selector row */}
        <TouchableOpacity
          style={[styles.cityBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={showPicker}
          activeOpacity={0.75}
        >
          <Feather name="map-pin" size={13} color={colors.amber} />
          <Text style={[styles.cityBtnText, { color: colors.foreground }]} numberOfLines={1}>
            {selectedCity?.name ?? "Select City"}
          </Text>
          <Feather name="chevron-down" size={13} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      {summary && (
        <StatsBar
          places={summary.totalPlaces}
          events={summary.totalEvents}
          deals={summary.totalDeals}
        />
      )}

      {/* City Guides */}
      {itineraries && itineraries.length > 0 && (
        <View>
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>City Guides</Text>
            <Feather name="map" size={15} color={colors.amber} />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.guidesScroll}
          >
            {itineraries.map((itin) => (
              <View key={itin.id} style={styles.guideCard}>
                <ItineraryCard itinerary={itin} />
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Places section header + filters */}
      <View style={styles.sectionRow}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Places</Text>
        <Feather name="compass" size={15} color={colors.amber} />
      </View>
      <CategoryFilter
        categories={CATEGORIES}
        selectedCategory={selectedCategory}
        onSelect={setSelectedCategory}
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {placesLoading ? (
        <View style={styles.loadingContainer}>
          {renderHeader()}
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
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
                <Feather name="compass" size={32} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nothing here yet</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Try switching city or changing the filter.
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
  loadingContainer: { flex: 1 },
  skeleton: { marginHorizontal: 20, marginBottom: 16 },

  topBar: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  appName: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    letterSpacing: -0.5,
  },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  cityBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  cityBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },

  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  guidesScroll: {
    paddingHorizontal: 20,
    paddingBottom: 4,
    gap: 12,
  },
  guideCard: {
    width: 240,
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
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
});
