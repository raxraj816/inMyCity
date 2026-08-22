import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useColors } from "@/hooks/useColors";
import type { Itinerary } from "@workspace/api-client-react";

type Props = {
  itinerary: Itinerary;
};

function ItineraryCardComponent({ itinerary }: Props) {
  const colors = useColors();
  const router = useRouter();

  const stopCount = itinerary.stops?.length ?? 0;
  const accessibilityLabel = [
    itinerary.title,
    itinerary.city,
    `${itinerary.durationDays} day itinerary`,
    `${stopCount} stops`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.card, { backgroundColor: colors.card }]}
      onPress={() => router.push(`/itinerary/${itinerary.id}`)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Opens this itinerary"
    >
        <View style={styles.imageContainer}>
          {itinerary.coverImageUrl ? (
            <Image
              source={{ uri: itinerary.coverImageUrl }}
              style={styles.image}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          ) : (
            <View style={[styles.image, { backgroundColor: colors.navy }]} />
          )}
          
          <View style={[styles.durationBadge, { backgroundColor: colors.amber }]}>
            <Text style={styles.durationText}>{itinerary.durationDays} Day{itinerary.durationDays > 1 ? 's' : ''}</Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={[styles.city, { color: colors.primary }]} numberOfLines={1}>
            {itinerary.city}
          </Text>
          
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
            {itinerary.title}
          </Text>

          <View style={styles.footer}>
            <View style={styles.statContainer}>
              <Feather name="map-pin" size={14} color={colors.mutedForeground} />
              <Text style={[styles.statText, { color: colors.mutedForeground }]}>
                {itinerary.stops?.length || 0} stops
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
  );
}

/** Memoized: these sit in long lists that re-render whenever a filter above them changes. */
export const ItineraryCard = React.memo(ItineraryCardComponent);

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
  durationBadge: {
    position: "absolute",
    bottom: 12,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  durationText: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
  content: {
    padding: 16,
  },
  city: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    textTransform: "uppercase",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    marginBottom: 12,
    lineHeight: 24,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
});
