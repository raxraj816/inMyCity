import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useColors } from "@/hooks/useColors";
import type { Deal } from "@workspace/api-client-react";

type Props = {
  deal: Deal;
};

export function DealCard({ deal }: Props) {
  const colors = useColors();
  const router = useRouter();

  // Calculate days left
  let daysLeft = 0;
  if (deal.expiresAt) {
    const expiry = new Date(deal.expiresAt);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    daysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.card, { backgroundColor: colors.card }]}
      onPress={() => router.push(`/deal/${deal.id}`)}
    >
        <View style={styles.imageContainer}>
          {deal.imageUrl ? (
            <Image
              source={{ uri: deal.imageUrl }}
              style={styles.image}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={[styles.image, { backgroundColor: colors.muted }]} />
          )}
          
          <View style={[styles.discountBadge, { backgroundColor: colors.destructive }]}>
            <Text style={styles.discountText}>{deal.discountText}</Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
            {deal.title}
          </Text>

          <Text style={[styles.placeName, { color: colors.mutedForeground }]} numberOfLines={1}>
            {deal.placeName}
          </Text>

          <View style={styles.footer}>
            <View style={styles.priceContainer}>
              {deal.originalPrice !== null && (
                <Text style={[styles.originalPrice, { color: colors.mutedForeground }]}>
                  ${deal.originalPrice}
                </Text>
              )}
              {deal.dealPrice !== null && (
                <Text style={[styles.dealPrice, { color: colors.amber }]}>
                  ${deal.dealPrice}
                </Text>
              )}
            </View>

            {deal.expiresAt && (
              <View style={[styles.expiryContainer, { backgroundColor: colors.muted }]}>
                <Feather name="clock" size={12} color={colors.mutedForeground} />
                <Text style={[styles.expiryText, { color: colors.mutedForeground }]}>
                  {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
                </Text>
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
    height: 140,
    width: "100%",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  discountBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  discountText: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  content: {
    padding: 16,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    marginBottom: 4,
    lineHeight: 22,
  },
  placeName: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    marginBottom: 12,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  originalPrice: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    textDecorationLine: "line-through",
  },
  dealPrice: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  expiryContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  expiryText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
});
