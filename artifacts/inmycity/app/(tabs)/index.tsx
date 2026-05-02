import { useState } from "react";
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

import { useColors } from "@/hooks/useColors";
import { useGetPlaces, useGetExploreSummary, useGetItineraries } from "@workspace/api-client-react";
import { useCity } from "@/context/CityContext";
import { CityPicker } from "@/components/CityPicker";

import { CategoryFilter } from "@/components/CategoryFilter";
import { StatsBar } from "@/components/StatsBar";
import { PlaceCard } from "@/components/PlaceCard";
import { ItineraryCard } from "@/components/ItineraryCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { ErrorFallback } from "@/components/ErrorFallback";

type Mode = "resident" | "tourist";
const CATEGORIES = ["food", "attraction", "essentials", "nightlife"];

export default function ExploreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedCity, showPicker } = useCity();
  const [mode, setMode] = useState<Mode>("resident");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const cityName = selectedCity?.name;

  const {
    data: places,
    isLoading: placesLoading,
    error: placesError,
    refetch: refetchPlaces,
  } = useGetPlaces({
    city: cityName,
    category: mode === "resident" ? (selectedCategory || undefined) : undefined,
  });

  const { data: summary } = useGetExploreSummary({ city: cityName });

  const { data: itineraries } = useGetItineraries({ city: cityName });

  const topPadding = Platform.OS === "web" ? 20 : insets.top + 4;
  const bottomPadding = Platform.OS === "web" ? 84 : 84 + insets.bottom;

  if (placesError) {
    return <ErrorFallback error={placesError as Error} resetError={refetchPlaces} />;
  }

  const displayPlaces =
    mode === "tourist"
      ? (places || []).filter((p) => p.category === "attraction" || p.category === "food").slice(0, 20)
      : places || [];

  const renderCityHeader = () => (
    <View style={[styles.cityHeader, { paddingTop: topPadding }]}>
      <Text style={[styles.appName, { color: colors.amber }]}>inMyCity</Text>
      <TouchableOpacity style={[styles.cityBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={showPicker} activeOpacity={0.75}>
        <Feather name="map-pin" size={13} color={colors.amber} />
        <Text style={[styles.cityBtnText, { color: colors.foreground }]} numberOfLines={1}>
          {selectedCity?.name ?? "Select City"}
        </Text>
        <Feather name="chevron-down" size={14} color={colors.mutedForeground} />
      </TouchableOpacity>
    </View>
  );

  const renderModeToggle = () => (
    <View style={[styles.modeContainer, { backgroundColor: colors.muted }]}>
      <TouchableOpacity
        style={[styles.modePill, mode === "resident" && { backgroundColor: colors.background }]}
        onPress={() => { setMode("resident"); setSelectedCategory(null); }}
        activeOpacity={0.8}
      >
        <Feather name="home" size={13} color={mode === "resident" ? colors.amber : colors.mutedForeground} />
        <Text style={[styles.modePillText, { color: mode === "resident" ? colors.foreground : colors.mutedForeground }]}>
          For You
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.modePill, mode === "tourist" && { backgroundColor: colors.background }]}
        onPress={() => { setMode("tourist"); setSelectedCategory(null); }}
        activeOpacity={0.8}
      >
        <Feather name="camera" size={13} color={mode === "tourist" ? colors.amber : colors.mutedForeground} />
        <Text style={[styles.modePillText, { color: mode === "tourist" ? colors.foreground : colors.mutedForeground }]}>
          Visitor Guide
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderItinerariesRow = () => {
    if (!itineraries || itineraries.length === 0) return null;
    return (
      <View>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>City Guides</Text>
          <Feather name="map" size={16} color={colors.amber} />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.itinerariesScroll}
        >
          {itineraries.map((itin) => (
            <View key={itin.id} style={styles.itineraryCardWrapper}>
              <ItineraryCard itinerary={itin} />
            </View>
          ))}
        </ScrollView>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Top Picks</Text>
          <Feather name="star" size={16} color={colors.amber} />
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View>
      {renderCityHeader()}
      <View style={styles.modeWrapper}>
        {renderModeToggle()}
      </View>
      {mode === "tourist" && renderItinerariesRow()}
      {mode === "resident" && summary && (
        <StatsBar
          places={summary.totalPlaces}
          events={summary.totalEvents}
          deals={summary.totalDeals}
        />
      )}
      {mode === "resident" && (
        <CategoryFilter
          categories={CATEGORIES}
          selectedCategory={selectedCategory}
          onSelect={setSelectedCategory}
        />
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {placesLoading ? (
        <View style={styles.loadingContainer}>
          {renderHeader()}
          <SkeletonCard height={180} style={styles.skeleton} />
          <SkeletonCard height={180} style={styles.skeleton} />
          <SkeletonCard height={180} style={styles.skeleton} />
        </View>
      ) : (
        <FlatList
          data={displayPlaces}
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
  cityHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  appName: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    letterSpacing: -0.5,
  },
  cityBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 180,
  },
  cityBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    flexShrink: 1,
  },
  modeWrapper: {
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  modeContainer: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 3,
    marginBottom: 8,
  },
  modePill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 12,
  },
  modePillText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  itinerariesScroll: {
    paddingHorizontal: 20,
    paddingBottom: 4,
    gap: 12,
  },
  itineraryCardWrapper: {
    width: 240,
  },
  divider: {
    height: 1,
    marginHorizontal: 20,
    marginTop: 8,
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
