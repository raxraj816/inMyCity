import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { RatingStars } from "./RatingStars";
import type { Place } from "@workspace/api-client-react";

type Props = {
  place: Place;
};

export function PlaceCard({ place }: Props) {
  const colors = useColors();
  const router = useRouter();

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "food": return colors.amber;
      case "attraction": return colors.info;
      case "nightlife": return "#a855f7"; // purple
      case "essentials": return colors.success;
      default: return colors.mutedForeground;
    }
  };

  const getCategoryBg = (category: string) => {
    switch (category.toLowerCase()) {
      case "food": return colors.amberLight;
      case "attraction": return colors.infoLight;
      case "nightlife": return "#f3e8ff";
      case "essentials": return colors.successLight;
      default: return colors.muted;
    }
  };

  const categoryColor = getCategoryColor(place.category);
  const categoryBg = getCategoryBg(place.category);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.card, { backgroundColor: colors.card }]}
      onPress={() => router.push(`/place/${place.id}`)}
    >
        <View style={styles.imageContainer}>
          {place.imageUrl ? (
            <Image
              source={{ uri: place.imageUrl }}
              style={styles.image}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={[styles.image, { backgroundColor: categoryBg }]} />
          )}
          
          <View style={[styles.badge, { backgroundColor: categoryColor }]}>
            <Text style={styles.badgeText}>{place.category}</Text>
          </View>
          
          {place.isOpen !== null && (
            <View style={[
              styles.openBadge, 
              { backgroundColor: place.isOpen ? colors.success : colors.destructive }
            ]}>
              <Text style={styles.openBadgeText}>{place.isOpen ? "Open" : "Closed"}</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
              {place.name}
            </Text>
            {place.distanceKm != null && (
              <View style={styles.distanceContainer}>
                <Feather name="map-pin" size={12} color={colors.mutedForeground} />
                <Text style={[styles.distance, { color: colors.mutedForeground }]}>
                  {place.distanceKm.toFixed(1)} km
                </Text>
              </View>
            )}
          </View>

          <Text style={[styles.address, { color: colors.mutedForeground }]} numberOfLines={1}>
            {place.address}
          </Text>

          <View style={styles.footer}>
            {place.rating != null && (
              <View style={styles.ratingContainer}>
                <RatingStars rating={place.rating} />
                {place.reviewCount != null && (
                  <Text style={[styles.reviewCount, { color: colors.mutedForeground }]}>
                    ({place.reviewCount})
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginBottom: 16,
    marginHorizontal: 20,
    overflow: "hidden",
    ...Platform.select({
      native: {
        shadowColor: "#0f172a",
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
      },
      web: { boxShadow: "0 4px 12px rgba(15,23,42,0.08)" },
    }),
  },
  imageContainer: {
    height: 180,
    width: "100%",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  badge: {
    position: "absolute",
    top: 12,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    textTransform: "capitalize",
  },
  openBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  openBadgeText: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 10,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    flex: 1,
    marginRight: 8,
  },
  distanceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  distance: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  address: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    marginBottom: 12,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  reviewCount: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
});
