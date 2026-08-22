import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useGetHotelById, getGetHotelByIdQueryKey } from "@workspace/api-client-react";
import { ErrorFallback } from "@/components/ErrorFallback";
import { VenueActions } from "@/components/VenueActions";
import { MapPreview } from "@/components/MapPreview";

const CATEGORY_COLORS: Record<string, string> = {
  budget: "#10b981",
  "mid-range": "#0ea5e9",
  luxury: "#f59e0b",
  boutique: "#ec4899",
};

export default function HotelDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const hotelId = parseInt(id, 10);
  const { data: hotel, isLoading, error, refetch } = useGetHotelById(hotelId, {
    query: { enabled: !!hotelId, queryKey: getGetHotelByIdQueryKey(hotelId) }
  });

  if (error) return <ErrorFallback error={error as Error} resetError={refetch} />;
  if (isLoading || !hotel) return <View style={[styles.container, { backgroundColor: colors.background }]} />;

  const catColor = CATEGORY_COLORS[hotel.category] ?? "#6366f1";
  const isLocal = hotel.city === "Mumbai" || hotel.city === "Bangalore";
  const currencySymbol = isLocal ? "₹" : "$";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        {/* Hero image */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: hotel.imageUrl ?? "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800" }}
            style={styles.hero}
            contentFit="cover"
          />
          <View style={[styles.topActions, { paddingTop: Math.max(insets.top, 20) }]}>
            <TouchableOpacity style={[styles.circleButton, { backgroundColor: "rgba(0,0,0,0.5)" }]} onPress={() => router.back()}>
              <Feather name="arrow-left" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={[styles.heroCategoryBadge, { backgroundColor: catColor }]}>
            <Text style={styles.heroCategoryText}>
              {hotel.category.charAt(0).toUpperCase() + hotel.category.slice(1)}
            </Text>
          </View>
        </View>

        {/* Content */}
        <View style={[styles.content, { backgroundColor: colors.background, paddingBottom: insets.bottom + 110 }]}>
          <Text style={[styles.hotelName, { color: colors.foreground }]}>{hotel.name}</Text>

          {/* Address */}
          <View style={styles.addressRow}>
            <Feather name="map-pin" size={14} color={colors.mutedForeground} />
            <Text style={[styles.addressText, { color: colors.mutedForeground }]}>{hotel.address}</Text>
          </View>

          {/* Phone and website already have their own Contact section below. */}
          <VenueActions name={hotel.name} lat={hotel.lat} lng={hotel.lng} />

          <MapPreview name={hotel.name} lat={hotel.lat} lng={hotel.lng} />

          {/* Rating + reviews */}
          {hotel.rating && (
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map(star => (
                <Feather
                  key={star}
                  name="star"
                  size={16}
                  color={star <= Math.round(hotel.rating!) ? "#f59e0b" : colors.border}
                />
              ))}
              <Text style={[styles.ratingNum, { color: colors.foreground }]}>{hotel.rating.toFixed(1)}</Text>
              {hotel.reviewCount && (
                <Text style={[styles.reviewCount, { color: colors.mutedForeground }]}>
                  ({hotel.reviewCount.toLocaleString()} reviews)
                </Text>
              )}
            </View>
          )}

          {/* Check-in/out + Price card */}
          <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.infoCell}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Check-in</Text>
              <View style={styles.infoValueRow}>
                <Feather name="log-in" size={14} color={catColor} />
                <Text style={[styles.infoValue, { color: colors.foreground }]}>{hotel.checkIn ?? "—"}</Text>
              </View>
            </View>
            <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
            <View style={styles.infoCell}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Check-out</Text>
              <View style={styles.infoValueRow}>
                <Feather name="log-out" size={14} color={catColor} />
                <Text style={[styles.infoValue, { color: colors.foreground }]}>{hotel.checkOut ?? "—"}</Text>
              </View>
            </View>
            <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
            <View style={styles.infoCell}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Per Night</Text>
              <Text style={[styles.priceValue, { color: catColor }]}>
                {hotel.pricePerNight ? `${currencySymbol}${Math.round(hotel.pricePerNight).toLocaleString()}` : "—"}
              </Text>
            </View>
          </View>

          {/* Description */}
          {hotel.description && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About</Text>
              <Text style={[styles.description, { color: colors.mutedForeground }]}>{hotel.description}</Text>
            </View>
          )}

          {/* Amenities */}
          {hotel.amenities && hotel.amenities.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Amenities</Text>
              <View style={styles.amenitiesGrid}>
                {hotel.amenities.map(a => (
                  <View key={a} style={[styles.amenityItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Feather name="check" size={13} color={catColor} />
                    <Text style={[styles.amenityText, { color: colors.foreground }]}>{a}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Contact */}
          {(hotel.phone || hotel.website) && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Contact</Text>
              {hotel.phone && (
                <TouchableOpacity style={[styles.contactRow, { borderColor: colors.border }]} onPress={() => hotel.phone && Linking.openURL(`tel:${hotel.phone}`)}>
                  <View style={[styles.contactIcon, { backgroundColor: colors.card }]}>
                    <Feather name="phone" size={16} color={catColor} />
                  </View>
                  <Text style={[styles.contactText, { color: colors.foreground }]}>{hotel.phone}</Text>
                  <Feather name="external-link" size={14} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
              {hotel.website && (
                <TouchableOpacity style={[styles.contactRow, { borderColor: colors.border }]} onPress={() => hotel.website && Linking.openURL(hotel.website)}>
                  <View style={[styles.contactIcon, { backgroundColor: colors.card }]}>
                    <Feather name="globe" size={16} color={catColor} />
                  </View>
                  <Text style={[styles.contactText, { color: colors.foreground }]} numberOfLines={1}>{hotel.website}</Text>
                  <Feather name="external-link" size={14} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Tags */}
          {hotel.tags && hotel.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {hotel.tags.map(tag => (
                <View key={tag} style={[styles.tag, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.tagText, { color: colors.foreground }]}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom || 24, backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <View>
          <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>Starting from</Text>
          <Text style={[styles.bottomPrice, { color: colors.foreground }]}>
            {hotel.pricePerNight ? `${currencySymbol}${Math.round(hotel.pricePerNight).toLocaleString()}/night` : "Check availability"}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.bookBtn, { backgroundColor: catColor }]}
          onPress={() => hotel.website && Linking.openURL(hotel.website)}
          disabled={!hotel.website}
        >
          <Text style={styles.bookBtnText}>Book Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroContainer: { height: 320, position: "relative" },
  hero: { width: "100%", height: "100%" },
  topActions: { position: "absolute", top: 0, left: 0, paddingHorizontal: 20 },
  circleButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  heroCategoryBadge: {
    position: "absolute", bottom: 16, right: 16,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  heroCategoryText: { fontFamily: "Inter_700Bold", fontSize: 12, color: "#fff" },
  content: { padding: 24, marginTop: -24, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  hotelName: { fontFamily: "Inter_700Bold", fontSize: 26, lineHeight: 32, marginBottom: 8 },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  addressText: { fontFamily: "Inter_400Regular", fontSize: 14, flex: 1 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 20 },
  ratingNum: { fontFamily: "Inter_700Bold", fontSize: 15, marginLeft: 4 },
  reviewCount: { fontFamily: "Inter_400Regular", fontSize: 13 },
  infoCard: {
    flexDirection: "row", borderRadius: 16, padding: 16, marginBottom: 24,
    borderWidth: StyleSheet.hairlineWidth, justifyContent: "space-around",
  },
  infoCell: { alignItems: "center", gap: 6 },
  infoLabel: { fontFamily: "Inter_400Regular", fontSize: 11 },
  infoValueRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  infoValue: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  infoDivider: { width: 1, alignSelf: "stretch" },
  priceValue: { fontFamily: "Inter_700Bold", fontSize: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 18, marginBottom: 12 },
  description: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 24 },
  amenitiesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  amenityItem: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1,
  },
  amenityText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  contactRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  contactIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
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
  bottomPrice: { fontFamily: "Inter_700Bold", fontSize: 18 },
  bookBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12 },
  bookBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 16 },
});
