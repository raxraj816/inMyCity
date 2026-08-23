import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { SearchResult } from "@workspace/api-client-react";
import { currencyFor, formatPrice } from "@workspace/city-config";

/**
 * One row of search results, whatever kind it is.
 *
 * Search returns places, events, hotels, activities, movies and deals interleaved by
 * relevance, so they share one row shape: image, name, what it is, and the one fact that
 * decides whether to tap — open now, how far, when it starts, what it costs. Six different
 * card designs in one scrolling list would make the ranking impossible to read.
 */

type FeatherIcon = React.ComponentProps<typeof Feather>["name"];

type KindMeta = {
  label: string;
  icon: FeatherIcon;
  /** Named route rather than an interpolated string, so the router can type-check the target. */
  pathname:
    | "/place/[id]"
    | "/event/[id]"
    | "/deal/[id]"
    | "/hotel/[id]"
    | "/activity/[id]"
    | "/movie/[id]";
};

const KIND_META: Record<SearchResult["kind"], KindMeta> = {
  place: { label: "Place", icon: "map-pin", pathname: "/place/[id]" },
  event: { label: "Event", icon: "calendar", pathname: "/event/[id]" },
  deal: { label: "Deal", icon: "tag", pathname: "/deal/[id]" },
  hotel: { label: "Hotel", icon: "home", pathname: "/hotel/[id]" },
  activity: { label: "Activity", icon: "activity", pathname: "/activity/[id]" },
  movie: { label: "Movie", icon: "film", pathname: "/movie/[id]" },
};

const IMAGE_SIZE = 72;

function formatStartDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** The single most decision-relevant fact this result carries, and how to read it aloud. */
function detailFor(result: SearchResult): { text: string; label: string } | null {
  if (result.distanceKm != null) {
    return {
      text: `${result.distanceKm.toFixed(1)} km`,
      label: `${result.distanceKm.toFixed(1)} kilometres away`,
    };
  }
  if (result.startDate) {
    const formatted = formatStartDate(result.startDate);
    return formatted ? { text: formatted, label: `Starts ${formatted}` } : null;
  }
  if (result.price != null && result.price > 0) {
    // The row's own currency, never a symbol written here: this card renders results from
    // every city the catalogue holds, and a hardcoded ₹ prices a New York activity in rupees.
    const currency = currencyFor(result.city, result.currency);
    const amount = Math.round(result.price);
    return {
      text: formatPrice(amount, currency),
      label: `${amount} ${currency.code}`,
    };
  }
  return null;
}

function SearchResultCardComponent({ result }: { result: SearchResult }) {
  const colors = useColors();
  const router = useRouter();
  const meta = KIND_META[result.kind];
  const detail = detailFor(result);

  const openLabel = result.isOpen === true ? "Open now" : result.isOpen === false ? "Closed" : null;

  // One sentence for a screen reader instead of six separate stops.
  const accessibilityLabel = [
    result.title,
    meta.label,
    result.subtitle,
    result.rating != null ? `rated ${result.rating.toFixed(1)} out of 5` : null,
    detail?.label,
    openLabel,
    result.badge,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      activeOpacity={0.8}
      onPress={() => router.push({ pathname: meta.pathname, params: { id: String(result.id) } })}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={`Opens this ${meta.label.toLowerCase()}`}
    >
      {result.imageUrl ? (
        <Image
          source={{ uri: result.imageUrl }}
          style={styles.image}
          contentFit="cover"
          transition={150}
          cachePolicy="memory-disk"
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      ) : (
        <View style={[styles.image, styles.imageFallback, { backgroundColor: colors.muted }]}>
          <Feather name={meta.icon} size={22} color={colors.mutedForeground} />
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
            {result.title}
          </Text>
          {detail ? (
            <Text style={[styles.detail, { color: colors.mutedForeground }]}>{detail.text}</Text>
          ) : null}
        </View>

        {result.subtitle ? (
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
            {result.subtitle}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          <View style={[styles.kindChip, { backgroundColor: colors.muted }]}>
            <Feather name={meta.icon} size={11} color={colors.mutedForeground} />
            <Text style={[styles.kindText, { color: colors.mutedForeground }]}>{meta.label}</Text>
          </View>

          {result.rating != null ? (
            <Text style={[styles.rating, { color: colors.mutedForeground }]}>
              ⭐ {result.rating.toFixed(1)}
            </Text>
          ) : null}

          {openLabel ? (
            <Text
              style={[
                styles.status,
                { color: result.isOpen ? colors.success : colors.destructive },
              ]}
            >
              {openLabel}
            </Text>
          ) : null}

          {result.badge ? (
            <View style={[styles.badge, { backgroundColor: colors.amber }]}>
              <Text style={styles.badgeText} numberOfLines={1}>
                {result.badge}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

/**
 * Memoized: results re-render on every keystroke while the debounced query settles, and the
 * rows themselves have not changed.
 */
export const SearchResultCard = React.memo(SearchResultCardComponent);

/** Fixed so the list can lay out without measuring — see `getItemLayout` in the search screen. */
export const SEARCH_RESULT_HEIGHT = IMAGE_SIZE + 24 + 12;

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  image: { width: IMAGE_SIZE, height: IMAGE_SIZE, borderRadius: 10 },
  imageFallback: { alignItems: "center", justifyContent: "center" },
  body: { flex: 1, gap: 3 },
  titleRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  title: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 15 },
  detail: { fontFamily: "Inter_500Medium", fontSize: 12 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 13 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  kindChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  kindText: { fontFamily: "Inter_500Medium", fontSize: 11 },
  rating: { fontFamily: "Inter_400Regular", fontSize: 12 },
  status: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, maxWidth: 130 },
  badgeText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#fff" },
});
