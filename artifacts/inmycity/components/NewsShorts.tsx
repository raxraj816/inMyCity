import React, { useState } from "react";
import { Dimensions, FlatList, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import type { NewsItem } from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";

/**
 * Local news as short cards, one story to a screen.
 *
 * The format is the point: a headline, an image and roughly sixty words is what can be read
 * standing on a moving train, which is where most of this will be read. Swiping is the only
 * interaction, and the full article is one tap away at the publisher.
 *
 * Every card names its source, when it was published and how far the story has been checked,
 * because the app did not write any of this — it selected it.
 */
type FeatherIcon = React.ComponentProps<typeof Feather>["name"];

const CATEGORY_META: Record<string, { label: string; icon: FeatherIcon; color: string }> = {
  local: { label: "Local", icon: "map-pin", color: "#7c3aed" },
  traffic: { label: "Traffic", icon: "alert-triangle", color: "#c2410c" },
  weather: { label: "Weather", icon: "cloud-rain", color: "#2563eb" },
  civic: { label: "Civic", icon: "info", color: "#15803d" },
  sports: { label: "Sports", icon: "activity", color: "#15803d" },
  business: { label: "Business", icon: "briefcase", color: "#047857" },
  transit: { label: "Transit", icon: "navigation", color: "#0e7490" },
};

const FALLBACK = { label: "News", icon: "info" as FeatherIcon, color: "#7c3aed" };

function timeAgo(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  const days = Math.floor(minutes / 1440);
  return days < 7 ? `${days}d ago` : `${Math.floor(days / 7)}w ago`;
}

export function NewsShorts({
  items,
  bottomInset = 0,
  initialIndex = 0,
  onReport,
}: {
  items: NewsItem[];
  /** Height of anything the list scrolls underneath, so the footer is not hidden by it. */
  bottomInset?: number;
  /** Which story to open on, so tapping the third headline starts at the third story. */
  initialIndex?: number;
  onReport: (item: NewsItem) => void;
}) {
  const colors = useColors();
  // Each card is exactly the height of the space this list was given, which is what makes the
  // swipe land on one story rather than somewhere between two.
  const [height, setHeight] = useState(() => Dimensions.get("window").height);
  const [index, setIndex] = useState(initialIndex);

  const cardHeight = Math.max(240, height - bottomInset);

  /**
   * `pagingEnabled` is a touch gesture, so a mouse wheel on the web build scrolls straight past
   * the snap and lands between two stories. CSS scroll-snap is the web equivalent; React Native
   * Web forwards these style keys through to CSS, and native ignores them.
   */
  const snapStyle = Platform.OS === "web" ? ({ scrollSnapType: "y mandatory" } as object) : undefined;
  const cardSnapStyle = Platform.OS === "web" ? ({ scrollSnapAlign: "start" } as object) : undefined;

  return (
    <View
      style={styles.container}
      onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
    >
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        pagingEnabled
        style={snapStyle}
        snapToInterval={cardHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        getItemLayout={(_, position) => ({ length: cardHeight, offset: cardHeight * position, index: position })}
        initialScrollIndex={initialIndex > 0 && initialIndex < items.length ? initialIndex : undefined}
        // Wheel scrolling never produces a momentum end event, so the counter is driven by the
        // scroll position itself and simply updates more often than it strictly needs to.
        scrollEventThrottle={64}
        onScroll={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.y / cardHeight))}
        renderItem={({ item }) => (
          <ShortCard
            item={item}
            height={cardHeight}
            snapStyle={cardSnapStyle}
            colors={colors}
            onReport={() => onReport(item)}
          />
        )}
      />

      {items.length > 1 ? (
        <View style={[styles.counter, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.counterText, { color: colors.mutedForeground }]}>
            {Math.min(index + 1, items.length)} / {items.length}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function ShortCard({
  item,
  height,
  snapStyle,
  colors,
  onReport,
}: {
  item: NewsItem;
  height: number;
  snapStyle: object | undefined;
  colors: ReturnType<typeof useColors>;
  onReport: () => void;
}) {
  const meta = CATEGORY_META[item.category] ?? FALLBACK;

  return (
    <View style={[styles.card, { height, backgroundColor: colors.background }, snapStyle]}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.image} contentFit="cover" transition={180} />
      ) : (
        <View style={[styles.image, styles.imageFallback, { backgroundColor: meta.color + "14" }]}>
          <Feather name={meta.icon} size={34} color={meta.color} />
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={[styles.categoryChip, { backgroundColor: meta.color + "18" }]}>
            <Feather name={meta.icon} size={11} color={meta.color} />
            <Text style={[styles.categoryText, { color: meta.color }]}>{meta.label}</Text>
          </View>
          <TouchableOpacity
            onPress={onReport}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Report this story"
            hitSlop={8}
          >
            <Feather name="flag" size={15} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.headline, { color: colors.foreground }]} numberOfLines={3}>
          {item.headline}
        </Text>

        {item.summary ? (
          <Text style={[styles.summary, { color: colors.mutedForeground }]} numberOfLines={7}>
            {item.summary}
          </Text>
        ) : null}

        <View style={styles.footer}>
          <Text style={[styles.provenance, { color: colors.mutedForeground }]} numberOfLines={1}>
            {[item.source, timeAgo(item.publishedAt), item.trustLabel].filter(Boolean).join(" · ")}
          </Text>

          {item.link ? (
            <TouchableOpacity
              style={[styles.readButton, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={() => Linking.openURL(item.link!).catch(() => undefined)}
              activeOpacity={0.85}
              accessibilityRole="link"
              accessibilityLabel={`Read the full story at ${item.source}`}
            >
              <Text style={[styles.readText, { color: colors.amber }]}>Read the full story</Text>
              <Feather name="external-link" size={13} color={colors.amber} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { width: "100%" },
  // A third of the card. Any more and a long headline pushes the read button off screen,
  // which on a one-story-per-screen layout means it simply cannot be reached.
  image: { width: "100%", height: "34%" },
  imageFallback: { alignItems: "center", justifyContent: "center" },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16, gap: 9, overflow: "hidden" },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  categoryChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  categoryText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  headline: { fontFamily: "Inter_700Bold", fontSize: 20, lineHeight: 27 },
  summary: { fontFamily: "Inter_400Regular", fontSize: 14.5, lineHeight: 23, flexShrink: 1 },
  footer: { marginTop: "auto", gap: 10 },
  provenance: { fontFamily: "Inter_500Medium", fontSize: 12 },
  readButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
  },
  readText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  counter: {
    position: "absolute",
    top: 10,
    right: 16,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({ web: { boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }, default: {} }),
  },
  counterText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
});
