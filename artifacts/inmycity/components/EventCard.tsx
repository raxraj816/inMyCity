import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useColors } from "@/hooks/useColors";
import type { Event } from "@workspace/api-client-react";

type Props = {
  event: Event;
};

export function EventCard({ event }: Props) {
  const colors = useColors();
  const router = useRouter();

  const date = new Date(event.startDate);
  const month = date.toLocaleString("default", { month: "short" });
  const day = date.getDate();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.card, { backgroundColor: colors.card }]}
      onPress={() => router.push(`/event/${event.id}`)}
    >
        <View style={styles.imageContainer}>
          {event.imageUrl ? (
            <Image
              source={{ uri: event.imageUrl }}
              style={styles.image}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={[styles.image, { backgroundColor: colors.muted }]} />
          )}
          
          <View style={[styles.dateBadge, { backgroundColor: colors.card }]}>
            <Text style={[styles.dateMonth, { color: colors.primary }]}>{month}</Text>
            <Text style={[styles.dateDay, { color: colors.foreground }]}>{day}</Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
            {event.title}
          </Text>

          <View style={styles.venueContainer}>
            <Feather name="map-pin" size={14} color={colors.mutedForeground} />
            <Text style={[styles.venue, { color: colors.mutedForeground }]} numberOfLines={1}>
              {event.venue}
            </Text>
          </View>

          <View style={styles.footer}>
            <View style={[styles.badge, { backgroundColor: colors.muted }]}>
              <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>{event.category}</Text>
            </View>
            
            <View style={[
              styles.priceBadge, 
              { backgroundColor: event.isFree ? colors.successLight : colors.amberLight }
            ]}>
              <Text style={[
                styles.priceText, 
                { color: event.isFree ? colors.success : colors.amber }
              ]}>
                {event.isFree ? "Free" : (event.price ? `$${event.price}` : "Tickets")}
              </Text>
            </View>
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
    height: 160,
    width: "100%",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  dateBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      native: {
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      },
      web: { boxShadow: "0 2px 4px rgba(0,0,0,0.10)" },
    }),
  },
  dateMonth: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    textTransform: "uppercase",
  },
  dateDay: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  content: {
    padding: 16,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    marginBottom: 8,
    lineHeight: 24,
  },
  venueContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  venue: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    flex: 1,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  priceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  priceText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
});
