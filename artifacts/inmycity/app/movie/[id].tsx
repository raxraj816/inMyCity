import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useGetMovieById, getGetMovieByIdQueryKey } from "@workspace/api-client-react";
import { ErrorState } from "@/components/ListStates";
import { formatPriceForCity } from "@workspace/city-config";

export default function MovieDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const movieId = parseInt(id, 10);
  const { data: movie, isLoading, error, refetch } = useGetMovieById(movieId, {
    query: { enabled: !!movieId, queryKey: getGetMovieByIdQueryKey(movieId) }
  });

  // Inline rather than a full-screen fallback: the user arrived from a list and needs a way
  // back, not an app-restart prompt.
  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 20) }]}>
        <ErrorState error={error} onRetry={refetch} subject="this movie" />
        <TouchableOpacity
          style={styles.errorBack}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={[styles.errorBackText, { color: colors.mutedForeground }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (isLoading || !movie) return <View style={[styles.container, { backgroundColor: colors.background }]} />;


  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        {/* Poster */}
        <View style={styles.posterContainer}>
          <Image
            source={{ uri: movie.posterUrl ?? "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800" }}
            style={styles.poster}
            contentFit="cover"
          />
          <View style={[styles.posterOverlay]} />

          <View style={[styles.topActions, { paddingTop: Math.max(insets.top, 20) }]}>
            <TouchableOpacity style={[styles.circleButton, { backgroundColor: "rgba(0,0,0,0.5)" }]} onPress={() => router.back()}>
              <Feather name="arrow-left" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Status badge on poster */}
          <View style={[
            styles.posterBadge,
            { backgroundColor: movie.status === "now_showing" ? "#047857" : "#b45309" }
          ]}>
            <Text style={styles.posterBadgeText}>
              {movie.status === "now_showing" ? "Now Showing" : "Coming Soon"}
            </Text>
          </View>
        </View>

        {/* Content */}
        <View style={[styles.content, { backgroundColor: colors.background, paddingBottom: insets.bottom + 110 }]}>
          {/* Genre + Language */}
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: "#7c3aed1a", borderColor: "#7c3aed20" }]}>
              <Text style={[styles.badgeText, { color: "#7c3aed" }]}>{movie.genre}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>{movie.language}</Text>
            </View>
          </View>

          <Text style={[styles.title, { color: colors.foreground }]}>{movie.title}</Text>

          {/* Stats row */}
          <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {movie.rating && (
              <View style={styles.statItem}>
                <Feather name="star" size={18} color="#b45309" />
                <Text style={[styles.statValue, { color: colors.foreground }]}>{movie.rating.toFixed(1)}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Rating</Text>
              </View>
            )}
            {movie.durationMinutes && (
              <>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                  <Feather name="clock" size={18} color="#7c3aed" />
                  <Text style={[styles.statValue, { color: colors.foreground }]}>
                    {Math.floor(movie.durationMinutes / 60)}h {movie.durationMinutes % 60}m
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Duration</Text>
                </View>
              </>
            )}
            {movie.releaseDate && (
              <>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                  <Feather name="calendar" size={18} color="#0369a1" />
                  <Text style={[styles.statValue, { color: colors.foreground }]}>
                    {new Date(movie.releaseDate).getFullYear()}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Year</Text>
                </View>
              </>
            )}
          </View>

          {/* Synopsis */}
          {movie.synopsis && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Synopsis</Text>
              <Text style={[styles.description, { color: colors.mutedForeground }]}>{movie.synopsis}</Text>
            </View>
          )}

          {/* Director & Cast */}
          {(movie.director || (movie.cast && movie.cast.length > 0)) && (
            <View style={[styles.castCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {movie.director && (
                <View style={styles.castRow}>
                  <Text style={[styles.castLabel, { color: colors.mutedForeground }]}>Director</Text>
                  <Text style={[styles.castValue, { color: colors.foreground }]}>{movie.director}</Text>
                </View>
              )}
              {movie.cast && movie.cast.length > 0 && (
                <>
                  {movie.director && <View style={[styles.castDivider, { backgroundColor: colors.border }]} />}
                  <View style={styles.castRow}>
                    <Text style={[styles.castLabel, { color: colors.mutedForeground }]}>Cast</Text>
                    <Text style={[styles.castValue, { color: colors.foreground }]}>{movie.cast.join(", ")}</Text>
                  </View>
                </>
              )}
            </View>
          )}

          {/* Venue */}
          {movie.venue && (
            <View style={[styles.venueRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.iconBox, { backgroundColor: "#7c3aed1a" }]}>
                <Feather name="map-pin" size={18} color="#7c3aed" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.venueName, { color: colors.foreground }]}>{movie.venue}</Text>
                <Text style={[styles.venueCity, { color: colors.mutedForeground }]}>{movie.city}</Text>
              </View>
            </View>
          )}

          {/* Tags */}
          {movie.tags && movie.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {movie.tags.map(tag => (
                <View key={tag} style={[styles.tag, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.tagText, { color: colors.foreground }]}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/*
        No booking button. inMyCity has no ticketing agreement, so it cannot sell this seat, and
        section 2.4 of the launch plan is explicit that the in-between — a Book button that opens
        a cinema chain's homepage — teaches people the app is a mockup. Until an integration
        exists this is curated information: what is on, roughly what a ticket costs, and where.
      */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom || 24, backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>Typical ticket</Text>
          <Text style={[styles.priceValue, { color: colors.foreground }]}>
            {movie.price ? formatPriceForCity(movie.price, movie.city) : "Varies by screen"}
          </Text>
        </View>
        <View style={styles.bottomNote}>
          <Feather name="info" size={13} color={colors.mutedForeground} />
          <Text style={[styles.bottomNoteText, { color: colors.mutedForeground }]} numberOfLines={2}>
            {movie.venue ? `Showing at ${movie.venue}. Book with the cinema.` : "Book with the cinema."}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  errorBack: { alignSelf: "center", padding: 16, minHeight: 44 },
  errorBackText: { fontFamily: "Inter_500Medium", fontSize: 15 },
  container: { flex: 1 },
  posterContainer: { height: 420, position: "relative" },
  poster: { width: "100%", height: "100%" },
  posterOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, height: 80 },
  topActions: { position: "absolute", top: 0, left: 0, paddingHorizontal: 20 },
  circleButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  posterBadge: {
    position: "absolute", bottom: 16, right: 16,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  posterBadgeText: { fontFamily: "Inter_700Bold", fontSize: 12, color: "#fff" },
  content: { padding: 24, marginTop: -24, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  badgeRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  badge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  badgeText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  title: { fontFamily: "Inter_700Bold", fontSize: 28, lineHeight: 34, marginBottom: 20 },
  statsCard: {
    flexDirection: "row", borderRadius: 16, padding: 16, marginBottom: 24,
    borderWidth: StyleSheet.hairlineWidth, justifyContent: "space-around", alignItems: "center",
  },
  statItem: { alignItems: "center", gap: 4 },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 15 },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 11 },
  statDivider: { width: 1, height: 36 },
  section: { marginBottom: 24 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 18, marginBottom: 8 },
  description: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 24 },
  castCard: { borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: StyleSheet.hairlineWidth, gap: 4 },
  castRow: { flexDirection: "row", gap: 12 },
  castLabel: { fontFamily: "Inter_500Medium", fontSize: 13, width: 70 },
  castValue: { fontFamily: "Inter_400Regular", fontSize: 13, flex: 1, lineHeight: 20 },
  castDivider: { height: StyleSheet.hairlineWidth, marginVertical: 8 },
  venueRow: {
    flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 16,
    padding: 14, marginBottom: 20, borderWidth: StyleSheet.hairlineWidth,
  },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  venueName: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  venueCity: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  tagText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 24, paddingTop: 16, borderTopWidth: 1,
  },
  priceLabel: { fontFamily: "Inter_500Medium", fontSize: 12, marginBottom: 2 },
  priceValue: { fontFamily: "Inter_700Bold", fontSize: 20 },
  bottomNote: { flex: 1.3, flexDirection: "row", alignItems: "center", gap: 7, justifyContent: "flex-end" },
  bottomNoteText: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17, flexShrink: 1 },
});
