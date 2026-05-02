import { View, FlatList, StyleSheet, Platform, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useGetItineraries } from "@workspace/api-client-react";

import { ItineraryCard } from "@/components/ItineraryCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { ErrorFallback } from "@/components/ErrorFallback";

export default function TouristScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const {
    data: itineraries,
    isLoading,
    error,
    refetch
  } = useGetItineraries();

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 84 : 84 + insets.bottom;

  if (error) {
    return <ErrorFallback error={error as Error} resetError={refetch} />;
  }

  const renderHeader = () => (
    <View style={[{ paddingTop: topPadding }, styles.header]}>
      <Text style={[styles.headerTitle, { color: colors.foreground }]}>City Guides</Text>
      <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
        Curated itineraries to make the most of your trip
      </Text>
    </View>
  );

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={[styles.emptyContainer, { paddingTop: 60 }]}>
        <View style={[styles.emptyIconContainer, { backgroundColor: colors.muted }]}>
          <Feather name="map" size={32} color={colors.mutedForeground} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No guides found</Text>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          Check back later for new curated itineraries.
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isLoading && !itineraries ? (
        <View style={styles.loadingContainer}>
          {renderHeader()}
          <SkeletonCard height={180} style={styles.skeleton} />
          <SkeletonCard height={180} style={styles.skeleton} />
          <SkeletonCard height={180} style={styles.skeleton} />
        </View>
      ) : (
        <FlatList
          data={itineraries || []}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <ItineraryCard itinerary={item} />}
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
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
  },
  skeleton: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
    fontSize: 16,
    textAlign: "center",
  },
});
