import { View, FlatList, StyleSheet, Platform, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useGetItineraries } from "@workspace/api-client-react";

import { ItineraryCard } from "@/components/ItineraryCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { EmptyState, ErrorState, LIST_PERFORMANCE_PROPS, useListRefreshControl } from "@/components/ListStates";

export default function TouristScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const {
    data: itineraries,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useGetItineraries();

  const refreshControl = useListRefreshControl(isRefetching, refetch);

  const topPadding = Math.max(insets.top, 20);
  const bottomPadding = Platform.OS === "web" ? 84 : 84 + insets.bottom;


  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* ── Sticky header ── */}
      <View
        style={[
          styles.stickyHeader,
          {
            paddingTop: topPadding,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground }]} accessibilityRole="header">
          City Guides
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
          Curated itineraries to make the most of your trip
        </Text>
      </View>

      {/* ── Scrollable content ── */}
      {error ? (
        <ErrorState error={error} onRetry={refetch} subject="guides" />
      ) : isLoading && !itineraries ? (
        <View style={styles.loadingArea}>
          <SkeletonCard height={180} style={styles.skeleton} />
          <SkeletonCard height={180} style={styles.skeleton} />
          <SkeletonCard height={180} style={styles.skeleton} />
        </View>
      ) : (
        <FlatList
          data={itineraries || []}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <ItineraryCard itinerary={item} />}
          contentContainerStyle={{ paddingBottom: bottomPadding, paddingTop: 16 }}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
          {...LIST_PERFORMANCE_PROPS}
          ListEmptyComponent={
            !isLoading ? (
              <EmptyState
                icon="map"
                title="No guides found"
                message="Check back later for new curated itineraries."
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
  stickyHeader: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    marginBottom: 3,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
  loadingArea: { flex: 1, paddingTop: 16 },
  skeleton: { marginHorizontal: 20, marginBottom: 16 },
});
