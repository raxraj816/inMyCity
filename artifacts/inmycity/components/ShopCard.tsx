import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform, Linking } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";

type Deal = {
  id: number;
  discountText?: string | null;
  placeId?: number | null;
};

type Place = {
  id: number;
  name: string;
  address?: string | null;
  imageUrl?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  openingHours?: string | null;
  phone?: string | null;
  tags?: string[] | null;
};

type Props = {
  shop: Place;
  deal?: Deal | null;
};

function isOpenNow(openingHours: string | null | undefined): boolean | null {
  if (!openingHours) return null;
  const lower = openingHours.toLowerCase();
  if (lower.includes("24/7") || lower.includes("always open")) return true;
  const now = new Date();
  const hour = now.getHours();
  const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const todayAbbr = dayNames[now.getDay()];
  if (!lower.includes(todayAbbr) && !lower.includes("daily")) return null;
  const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?([ap]m)?.*?[-–].*?(\d{1,2})(?::(\d{2}))?([ap]m)?/);
  if (!timeMatch) return null;
  const parseHour = (h: string, m: string, ampm: string | undefined) => {
    let n = parseInt(h, 10);
    if (ampm === "pm" && n !== 12) n += 12;
    if (ampm === "am" && n === 12) n = 0;
    return n + (m ? parseInt(m, 10) / 60 : 0);
  };
  const open = parseHour(timeMatch[1], timeMatch[2], timeMatch[3]);
  const close = parseHour(timeMatch[4], timeMatch[5], timeMatch[6]);
  return hour + now.getMinutes() / 60 >= open && hour + now.getMinutes() / 60 < close;
}

function friendlyTag(tag: string): string {
  const MAP: Record<string, string> = {
    apparel: "Apparel",
    electronics: "Electronics",
    beauty: "Beauty",
    home: "Home",
    pharmacy: "Pharmacy",
    books: "Books",
    grocery: "Grocery",
    sports: "Sports",
    gifts: "Gifts",
    handicrafts: "Crafts",
    music: "Music",
    luxury: "Luxury",
    fashion: "Fashion",
    "ethnic wear": "Ethnic",
    jewellery: "Jewellery",
  };
  return MAP[tag.toLowerCase()] ?? (tag.charAt(0).toUpperCase() + tag.slice(1));
}

const SHOP_COLOR = "#c2410c";

function ShopCardComponent({ shop, deal }: Props) {
  const colors = useColors();
  const router = useRouter();
  const openStatus = isOpenNow(shop.openingHours);

  const handleCall = () => {
    if (shop.phone) {
      Linking.openURL(`tel:${shop.phone}`);
    }
  };

  const visibleTags = (shop.tags ?? [])
    .filter(t => t !== "mall" && t !== "street market" && t !== "branded" && t !== "iconic")
    .slice(0, 2);

  const accessibilityLabel = [
    shop.name,
    shop.rating != null ? `rated ${shop.rating.toFixed(1)} out of 5` : null,
    openStatus === true ? "Open now" : openStatus === false ? "Closed" : null,
    deal ? `Deal: ${deal.discountText ?? "available"}` : null,
    shop.address,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push(`/place/${shop.id}` as any)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Opens this shop"
    >
      <View style={styles.imageWrap}>
        <Image
          source={{ uri: shop.imageUrl ?? "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=600" }}
          style={styles.image}
          contentFit="cover"
          cachePolicy="memory-disk"
          accessibilityElementsHidden
          importantForAccessibility="no"
        />

        {openStatus !== null && (
          <View style={[
            styles.openBadge,
              // White on green-700/red-600 rather than the lighter shades, which failed AA.
            { backgroundColor: openStatus ? "#15803d" : "#dc2626" },
          ]}>
            <Text style={styles.openBadgeText}>{openStatus ? "Open" : "Closed"}</Text>
          </View>
        )}

        {deal && (
          <View style={styles.dealBadge}>
            <Feather name="tag" size={10} color="#fff" />
            <Text style={styles.dealBadgeText}>{deal.discountText ?? "Deal"}</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={styles.nameBlock}>
            <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
              {shop.name}
            </Text>
            {shop.address ? (
              <Text style={[styles.address, { color: colors.mutedForeground }]} numberOfLines={1}>
                {shop.address}
              </Text>
            ) : null}
          </View>

          {shop.phone ? (
            <TouchableOpacity
              style={[styles.callBtn, { backgroundColor: SHOP_COLOR + "15", borderColor: SHOP_COLOR + "30" }]}
              onPress={handleCall}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Call ${shop.name}`}
              accessibilityHint="Opens your phone app"
            >
              <Feather name="phone" size={14} color={SHOP_COLOR} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.metaRow}>
          {shop.rating != null && (
            <View style={styles.metaChip}>
              <Feather name="star" size={11} color="#b45309" />
              <Text style={[styles.metaText, { color: colors.foreground }]}>
                {shop.rating.toFixed(1)}
              </Text>
              {shop.reviewCount ? (
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                  ({shop.reviewCount.toLocaleString()})
                </Text>
              ) : null}
            </View>
          )}
          {shop.openingHours ? (
            <View style={styles.metaChip}>
              <Feather name="clock" size={11} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]} numberOfLines={1}>
                {shop.openingHours.split(",")[0]}
              </Text>
            </View>
          ) : null}
        </View>

        {visibleTags.length > 0 && (
          <View style={styles.tagRow}>
            {visibleTags.map(tag => (
              <View key={tag} style={[styles.tag, { backgroundColor: SHOP_COLOR + "12" }]}>
                <Text style={[styles.tagText, { color: SHOP_COLOR }]}>{friendlyTag(tag)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.viewBtn, { backgroundColor: SHOP_COLOR }]}
            onPress={() => router.push(`/place/${shop.id}` as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.viewBtnText}>View</Text>
            <Feather name="arrow-right" size={13} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

/** Memoized: the shops list re-renders on every category chip tap. */
export const ShopCard = React.memo(ShopCardComponent);

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      web: { boxShadow: "0 2px 10px rgba(0,0,0,0.08)" } as any,
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 3,
      },
    }),
  },
  imageWrap: {
    position: "relative",
  },
  image: {
    width: "100%",
    height: 170,
  },
  openBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  openBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: "#fff",
  },
  dealBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#15803d",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  dealBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: "#fff",
  },
  body: {
    padding: 14,
    gap: 8,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  nameBlock: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    lineHeight: 21,
  },
  address: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  callBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    flexShrink: 0,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "center",
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tag: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
  footer: {
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: "flex-end",
  },
  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  viewBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#fff",
  },
});
