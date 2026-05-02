import { useState } from "react";
import { View, FlatList, StyleSheet, Platform, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useGetEvents } from "@workspace/api-client-react";
import { useLocation } from "@/context/LocationContext";

import { CategoryFilter } from "@/components/CategoryFilter";
import { EventCard } from "@/components/EventCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { ErrorFallback } from "@/components/ErrorFallback";

const CATEGORIES = ["music", "food", "art", "comedy", "film", "wellness", "networking"];

export default function EventsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { location } = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const {
    data: events,
    isLoading,
    error,
    refetch
  } = useGetEvents({
    lat: location?.lat,
    lng: location?.lng,
    category: selectedCategory || undefined,
  });

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 84 : 84 + insets.bottom;

  if (error) {
    return <ErrorFallback error={error as Error} resetError={refetch} />;
  }

  const renderHeader = () => (
    <View style={{ paddingTop: topPadding }}>
      <Text style={[styles.headerTitle, { color: colors.foreground }]}>Discover Events</Text>
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
          <Feather name="calendar" size={32} color={colors.mutedForeground} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No events found</Text>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          We couldn't find any events {selectedCategory ? `in ${selectedCategory}` : 'nearby'}.
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isLoading && !events ? (
        <View style={styles.loadingContainer}>
          {renderHeader()}
          <SkeletonCard height={160} style={styles.skeleton} />
          <SkeletonCard height={160} style={styles.skeleton} />
          <SkeletonCard height={160} style={styles.skeleton} />
        </View>
      ) : (
        <FlatList
          data={events || []}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <EventCard event={item} />}
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
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    paddingHorizontal: 20,
    marginBottom: 8,
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
