import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useGetActivityById, getGetActivityByIdQueryKey } from "@workspace/api-client-react";
import { ErrorState } from "@/components/ListStates";
import { VenueActions } from "@/components/VenueActions";
import { MapPreview } from "@/components/MapPreview";
import { formatPriceForCity } from "@workspace/city-config";

const CATEGORY_COLORS: Record<string, string> = {
  adventure: "#dc2626",
  cultural: "#4f46e5",
  wellness: "#047857",
  sports: "#0369a1",
  workshop: "#b45309",
  tour: "#be185d",
};

const CATEGORY_ICONS: Record<string, string> = {
  adventure: "zap",
  cultural: "book",
  wellness: "heart",
  sports: "activity",
  workshop: "tool",
  tour: "map",
};

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const activityId = parseInt(id, 10);
  const { data: activity, isLoading, error, refetch } = useGetActivityById(activityId, {
    query: { enabled: !!activityId, queryKey: getGetActivityByIdQueryKey(activityId) }
  });

  // Inline rather than a full-screen fallback: the user arrived from a list and needs a way
  // back, not an app-restart prompt.
  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 20) }]}>
        <ErrorState error={error} onRetry={refetch} subject="this activity" />
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
  if (isLoading || !activity) return <View style={[styles.container, { backgroundColor: colors.background }]} />;

  const catColor = CATEGORY_COLORS[activity.category] ?? "#4f46e5";
  const catIcon = CATEGORY_ICONS[activity.category] ?? "zap";
  const hours = activity.durationMinutes ? Math.floor(activity.durationMinutes / 60) : 0;
  const mins = activity.durationMinutes ? activity.durationMinutes % 60 : 0;
  const durationStr = hours > 0 ? (mins > 0 ? `${hours}h ${mins}m` : `${hours}h`) : `${mins}m`;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: activity.imageUrl ?? "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800" }}
            style={styles.hero}
            contentFit="cover"
          />
          <View style={[styles.topActions, { paddingTop: Math.max(insets.top, 20) }]}>
            <TouchableOpacity style={[styles.circleButton, { backgroundColor: "rgba(0,0,0,0.5)" }]} onPress={() => router.back()}>
              <Feather name="arrow-left" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={[styles.heroBadge, { backgroundColor: catColor }]}>
            <Feather name={catIcon as any} size={12} color="#fff" />
            <Text style={styles.heroBadgeText}>
              {activity.category.charAt(0).toUpperCase() + activity.category.slice(1)}
            </Text>
          </View>
        </View>

        {/* Content */}
        <View style={[styles.content, { backgroundColor: colors.background, paddingBottom: insets.bottom + 110 }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>{activity.name}</Text>

          {/* Location */}
          <View style={styles.locationRow}>
            <Feather name="map-pin" size={14} color={colors.mutedForeground} />
            <Text style={[styles.locationText, { color: colors.mutedForeground }]}>{activity.address}</Text>
          </View>

          {/* Phone is surfaced in the contact row further down. */}
          <VenueActions name={activity.name} lat={activity.lat} lng={activity.lng} />

          <MapPreview name={activity.name} lat={activity.lat} lng={activity.lng} />

          {/* Stats */}
          <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {activity.durationMinutes && (
              <View style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: catColor + "15" }]}>
                  <Feather name="clock" size={18} color={catColor} />
                </View>
                <Text style={[styles.statValue, { color: colors.foreground }]}>{durationStr}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Duration</Text>
              </View>
            )}
            {activity.rating && (
              <>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                  <View style={[styles.statIcon, { backgroundColor: "#b4530915" }]}>
                    <Feather name="star" size={18} color="#b45309" />
                  </View>
                  <Text style={[styles.statValue, { color: colors.foreground }]}>{activity.rating.toFixed(1)}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                    {activity.reviewCount ? `${activity.reviewCount.toLocaleString()} reviews` : "Rating"}
                  </Text>
                </View>
              </>
            )}
            {activity.price !== undefined && activity.price !== null && (
              <>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                  <View style={[styles.statIcon, { backgroundColor: catColor + "15" }]}>
                    <Feather name="tag" size={18} color={catColor} />
                  </View>
                  <Text style={[styles.statValue, { color: colors.foreground }]}>
                    {activity.price === 0
                      ? "Free"
                      : formatPriceForCity(Math.round(activity.price), activity.city, activity.currency)}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Per Person</Text>
                </View>
              </>
            )}
          </View>

          {/* Description */}
          {activity.description && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About</Text>
              <Text style={[styles.description, { color: colors.mutedForeground }]}>{activity.description}</Text>
            </View>
          )}

          {/* Opening Hours */}
          {activity.openingHours && (
            <View style={[styles.hoursRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.iconBox, { backgroundColor: catColor + "15" }]}>
                <Feather name="clock" size={18} color={catColor} />
              </View>
              <View>
                <Text style={[styles.hoursLabel, { color: colors.mutedForeground }]}>Hours</Text>
                <Text style={[styles.hoursValue, { color: colors.foreground }]}>{activity.openingHours}</Text>
              </View>
            </View>
          )}

          {/* Contact / Booking */}
          {(activity.phone || activity.bookingUrl) && (
            <View style={styles.section}>
              {activity.phone && (
                <TouchableOpacity
                  style={[styles.contactRow, { borderColor: colors.border, backgroundColor: colors.card }]}
                  onPress={() => activity.phone && Linking.openURL(`tel:${activity.phone}`)}
                >
                  <Feather name="phone" size={16} color={catColor} />
                  <Text style={[styles.contactText, { color: colors.foreground }]}>{activity.phone}</Text>
                  <Feather name="external-link" size={13} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Tags */}
          {activity.tags && activity.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {activity.tags.map(tag => (
                <View key={tag} style={[styles.tag, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.tagText, { color: colors.foreground }]}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom || 24, backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <View>
          <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>
            {activity.price === 0 ? "Entry" : "Price"}
          </Text>
          <Text style={[styles.bottomPrice, { color: colors.foreground }]}>
            {activity.price === 0
              ? "Free"
              : activity.price
              ? `${formatPriceForCity(Math.round(activity.price), activity.city, activity.currency)} / person`
              : "Contact for price"}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.bookBtn, { backgroundColor: catColor, opacity: activity.bookingUrl ? 1 : 0.6 }]}
          onPress={() => activity.bookingUrl && Linking.openURL(activity.bookingUrl)}
          disabled={!activity.bookingUrl}
        >
          <Text style={styles.bookBtnText}>Book Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  errorBack: { alignSelf: "center", padding: 16, minHeight: 44 },
  errorBackText: { fontFamily: "Inter_500Medium", fontSize: 15 },
  container: { flex: 1 },
  heroContainer: { height: 300, position: "relative" },
  hero: { width: "100%", height: "100%" },
  topActions: { position: "absolute", top: 0, left: 0, paddingHorizontal: 20 },
  circleButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  heroBadge: {
    position: "absolute", bottom: 16, right: 16,
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  heroBadgeText: { fontFamily: "Inter_700Bold", fontSize: 12, color: "#fff" },
  content: { padding: 24, marginTop: -24, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  title: { fontFamily: "Inter_700Bold", fontSize: 26, lineHeight: 32, marginBottom: 8 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 20 },
  locationText: { fontFamily: "Inter_400Regular", fontSize: 14, flex: 1 },
  statsRow: {
    flexDirection: "row", justifyContent: "space-around", alignItems: "center",
    borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: StyleSheet.hairlineWidth,
  },
  statItem: { alignItems: "center", gap: 6 },
  statIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 15 },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 11 },
  statDivider: { width: 1, height: 40 },
  section: { marginBottom: 24 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 18, marginBottom: 10 },
  description: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 24 },
  hoursRow: {
    flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 16,
    padding: 14, marginBottom: 24, borderWidth: StyleSheet.hairlineWidth,
  },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  hoursLabel: { fontFamily: "Inter_400Regular", fontSize: 11, marginBottom: 2 },
  hoursValue: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  contactRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  contactText: { fontFamily: "Inter_500Medium", fontSize: 14, flex: 1 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  tagText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 24, paddingTop: 16, borderTopWidth: 1,
  },
  priceLabel: { fontFamily: "Inter_400Regular", fontSize: 12, marginBottom: 2 },
  bottomPrice: { fontFamily: "Inter_700Bold", fontSize: 16 },
  bookBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12 },
  bookBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 16 },
});
