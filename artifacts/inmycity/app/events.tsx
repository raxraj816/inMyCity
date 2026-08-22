import { useState } from "react";
import { View, FlatList, StyleSheet, Platform, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useGetEvents } from "@workspace/api-client-react";
import { useCity } from "@/context/CityContext";

import { CategoryFilter } from "@/components/CategoryFilter";
import { EventCard } from "@/components/EventCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { ErrorFallback } from "@/components/ErrorFallback";
import { ScreenHeader } from "@/components/ScreenHeader";
import { TrendingStrip, TrendingStripItem } from "@/components/TrendingStrip";
import { NearbyFilters } from "@/components/NearbyFilters";
import { useNearby } from "@/hooks/useNearby";

const CATEGORIES = ["music", "food", "art", "comedy", "film", "wellness", "networking", "sports"];
const ACCENT = "#6366f1";

function fmtDate(d: string | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function EventsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedCity } = useCity();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const nearby = useNearby();

  const {
    data: events,
    isLoading,
    error,
    refetch,
  } = useGetEvents({
    city: selectedCity?.name,
    category: selectedCategory || undefined,
    ...nearby.queryParams,
  });

  const topPadding = Math.max(insets.top, 20);
  const bottomPadding = Platform.OS === "web" ? 84 : 84 + insets.bottom;

  const trendingItems: TrendingStripItem[] = (events ?? []).slice(0, 8).map(e => ({
    id:       String(e.id),
    title:    e.title,
    imageUrl: e.imageUrl,
    meta1:    fmtDate(e.startDate) || "Upcoming",
    meta2:    e.venue ?? undefined,
    route:    `/event/${e.id}`,
  }));

  if (error) {
    return <ErrorFallback error={error as Error} resetError={refetch} />;
  }

  const ListHeader = (
    <TrendingStrip
      items={trendingItems}
      accentColor={ACCENT}
      isLoading={isLoading && !events}
      label="Trending Events"
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      <ScreenHeader title="Events" topPadding={topPadding} />

      <CategoryFilter
        categories={CATEGORIES}
        selectedCategory={selectedCategory}
        onSelect={setSelectedCategory}
      />

      <NearbyFilters controls={nearby} accent={ACCENT} showOpenNow={false} />

      {isLoading && !events ? (
        <>
          {ListHeader}
          <View style={styles.loadingArea}>
            <SkeletonCard height={160} style={styles.skeleton} />
            <SkeletonCard height={160} style={styles.skeleton} />
            <SkeletonCard height={160} style={styles.skeleton} />
          </View>
        </>
      ) : (
        <FlatList
          data={events || []}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <EventCard event={item} />}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={{ paddingBottom: bottomPadding }}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isLoading}
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyContainer}>
                <View style={[styles.emptyIconContainer, { backgroundColor: colors.muted }]}>
                  <Feather name="calendar" size={32} color={colors.mutedForeground} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No events found</Text>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  {selectedCategory
                    ? `No ${selectedCategory} events in ${selectedCity?.name ?? "this city"}.`
                    : `No upcoming events in ${selectedCity?.name ?? "this city"}.`}
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
