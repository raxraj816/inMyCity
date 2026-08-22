import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, FlatList
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useGetMovies } from "@workspace/api-client-react";
import { useCity } from "@/context/CityContext";
import { EmptyState, ErrorState, LIST_PERFORMANCE_PROPS, useListRefreshControl } from "@/components/ListStates";
import { ScreenHeader } from "@/components/ScreenHeader";
import { formatPriceForCity } from "@workspace/city-config";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "now_showing", label: "Now Showing" },
  { id: "coming_soon", label: "Coming Soon" },
];

/** Violet-600: the previous violet-500 pills could not carry white text at AA. */
const ACCENT = "#7c3aed";

export default function MoviesScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedCity } = useCity();
  const [activeFilter, setActiveFilter] = useState("all");

  const { data: movies = [], isLoading, isRefetching, error, refetch } = useGetMovies({
    city: selectedCity?.name,
    status: activeFilter !== "all" ? (activeFilter as "now_showing" | "coming_soon") : undefined,
  });

  const refreshControl = useListRefreshControl(isRefetching, refetch, ACCENT);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Movies" topPadding={Math.max(insets.top, 20)} />

      {/* Filter Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={styles.filtersContent}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.id}
            style={[
              styles.pill,
              { backgroundColor: activeFilter === f.id ? ACCENT : colors.card, borderColor: activeFilter === f.id ? ACCENT : colors.border }
            ]}
            onPress={() => setActiveFilter(f.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeFilter === f.id }}
            accessibilityLabel={`${f.label} movies`}
          >
            <Text style={[styles.pillText, { color: activeFilter === f.id ? "#fff" : colors.foreground }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Movie List */}
      {error ? (
        <ErrorState error={error} onRetry={refetch} accent={ACCENT} subject="movies" />
      ) : isLoading ? (
        <View style={styles.loadingContainer}>
          {[1, 2, 3, 4].map(i => (
            <View key={i} style={[styles.skeletonCard, { backgroundColor: colors.card }]} />
          ))}
        </View>
      ) : (
        <FlatList
          data={movies}
          keyExtractor={item => String(item.id)}
          numColumns={2}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={movies.length > 0 ? styles.row : undefined}
          refreshControl={refreshControl}
          {...LIST_PERFORMANCE_PROPS}
          ListEmptyComponent={
            <EmptyState
              icon="film"
              title="No movies found"
              accent={ACCENT}
              message={
                activeFilter !== "all"
                  ? "Nothing in this listing right now. Try the other tab."
                  : `No showtimes listed for ${selectedCity?.name ?? "this city"} yet.`
              }
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.movieCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(`/movie/${item.id}` as any)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={[
                item.title,
                item.genre,
                item.status === "now_showing" ? "Now showing" : "Coming soon",
                item.rating != null ? `rated ${item.rating.toFixed(1)} out of 5` : null,
              ]
                .filter(Boolean)
                .join(", ")}
              accessibilityHint="Opens this movie"
            >
              <View style={styles.posterContainer}>
                <Image
                  source={{ uri: item.posterUrl ?? "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400" }}
                  style={styles.poster}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
                {/* Status badge */}
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: item.status === "now_showing" ? "#047857" : "#b45309" }
                ]}>
                  <Text style={styles.statusText}>
                    {item.status === "now_showing" ? "Now Showing" : "Coming Soon"}
                  </Text>
                </View>
              </View>
              <View style={styles.movieInfo}>
                <Text style={[styles.movieTitle, { color: colors.foreground }]} numberOfLines={2}>{item.title}</Text>
                <Text style={[styles.movieGenre, { color: colors.mutedForeground }]}>{item.genre}</Text>
                <View style={styles.metaRow}>
                  {item.rating && (
                    <View style={styles.ratingRow}>
                      <Feather name="star" size={11} color="#b45309" />
                      <Text style={[styles.ratingText, { color: colors.foreground }]}>{item.rating.toFixed(1)}</Text>
                    </View>
                  )}
                  {item.durationMinutes && (
                    <Text style={[styles.durationText, { color: colors.mutedForeground }]}>
                      {Math.floor(item.durationMinutes / 60)}h {item.durationMinutes % 60}m
                    </Text>
                  )}
                </View>
                {item.price && (
                  <Text style={[styles.priceText, { color: ACCENT }]}>
                    {formatPriceForCity(item.price, item.city)}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },
  filtersScroll: { flexGrow: 0, flexShrink: 0 },
  filtersContent: { flexDirection: "row", flexWrap: "nowrap", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  pill: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1,
  },
  pillText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  loadingContainer: { padding: 16, gap: 12 },
  skeletonCard: { height: 200, borderRadius: 16 },
  listContent: { padding: 16 },
  row: { gap: 12, marginBottom: 12 },
  movieCard: {
    flex: 1, borderRadius: 16, overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      web: { boxShadow: "0 2px 8px rgba(0,0,0,0.08)" },
      default: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
    }),
  },
  posterContainer: { position: "relative" },
  poster: { width: "100%", aspectRatio: 0.7 },
  statusBadge: {
    position: "absolute", bottom: 8, left: 8,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
  },
  statusText: { fontFamily: "Inter_600SemiBold", fontSize: 9, color: "#fff" },
  movieInfo: { padding: 10, gap: 4 },
  movieTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 18 },
  movieGenre: { fontFamily: "Inter_400Regular", fontSize: 11 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  durationText: { fontFamily: "Inter_400Regular", fontSize: 11 },
  priceText: { fontFamily: "Inter_700Bold", fontSize: 13, marginTop: 2 },
});
