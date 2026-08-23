import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Share } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { formatPriceForCity } from "@workspace/city-config";
import type { FeedItem } from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";
import { addsSomething, endsLabel, formatCount, hostOf, timeAgo, whenLabel } from "./format";

/**
 * One card in the Pulse feed.
 *
 * Every kind draws the same skeleton — a header saying who is speaking, a body, an action row —
 * because that is the only thing that makes a column of news, offers, events and posts read as
 * one feed rather than four feeds shuffled together. What changes between kinds is the body:
 * a post is text and maybe a photo, and everything else hangs an attachment block under its
 * image the way a shared link does. Facebook's feed has looked like this for fifteen years for
 * a reason; a reader already knows how to read it.
 *
 * The card is one tap target with at most one button on it. The old tile grid made every item
 * a thumbnail among five siblings and left "what do I do with this" unanswered.
 */

type Colors = ReturnType<typeof useColors>;

/** A quiet accent per kind. Enough to tell cards apart while scrolling, not enough to shout. */
const ACCENT: Record<FeedItem["kind"], string> = {
  news: "#0369a1",
  deal: "#047857",
  event: "#7c3aed",
  post: "#0e7490",
  ad: "#64748b",
};

const ICON: Record<FeedItem["kind"], React.ComponentProps<typeof Feather>["name"]> = {
  news: "file-text",
  deal: "tag",
  event: "calendar",
  post: "message-circle",
  ad: "briefcase",
};

/** A post short enough to be the whole card gets set like a statement rather than a caption. */
const BIG_TEXT_LIMIT = 180;

export type FeedCardProps = {
  item: FeedItem;
  city: string;
  onOpen: () => void;
  onToggleReaction: (kind: "like" | "save") => void;
  onReport: () => void;
};

export function FeedCard({ item, city, onOpen, onToggleReaction, onReport }: FeedCardProps) {
  const colors = useColors();
  const accent = ACCENT[item.kind];

  const share = () => {
    const line = item.kind === "post" ? item.body ?? item.title : item.title;
    void Share.share({ message: item.link ? `${line}\n\n${item.link}` : line });
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Header item={item} colors={colors} accent={accent} onReport={onReport} />

      {item.kind === "post" ? (
        <PostBody item={item} colors={colors} />
      ) : (
        <Attachment item={item} colors={colors} accent={accent} city={city} onOpen={onOpen} />
      )}

      <Actions
        item={item}
        colors={colors}
        onToggleReaction={onToggleReaction}
        onShare={share}
        onOpen={onOpen}
      />
    </View>
  );
}

/**
 * Who is speaking.
 *
 * Provenance sits at the top rather than buried at the bottom, because on a feed of civic
 * claims the source is part of the claim. A sponsored card names its advertiser here and
 * carries a label that is not conditional on anything.
 */
function Header({
  item,
  colors,
  accent,
  onReport,
}: {
  item: FeedItem;
  colors: Colors;
  accent: string;
  onReport: () => void;
}) {
  const { name, meta } = speaker(item);

  const reportable = item.kind === "post" || item.kind === "news";

  return (
    <View style={styles.header}>
      <View style={[styles.avatar, { backgroundColor: accent + "1a" }]}>
        {item.kind === "post" && item.authorName ? (
          <Text style={[styles.avatarText, { color: accent }]}>{item.authorName.charAt(0).toUpperCase()}</Text>
        ) : (
          <Feather name={ICON[item.kind]} size={16} color={accent} />
        )}
      </View>

      <View style={styles.headerText}>
        <View style={styles.headerNameRow}>
          <Text style={[styles.headerName, { color: colors.foreground }]} numberOfLines={1}>
            {name}
          </Text>
          {item.trustLabel ? (
            <View style={[styles.trustChip, { backgroundColor: accent + "14" }]}>
              <Text style={[styles.trustText, { color: accent }]}>{item.trustLabel}</Text>
            </View>
          ) : null}
        </View>
        {meta ? (
          <Text style={[styles.headerMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>

      {item.kind === "ad" ? (
        <View style={[styles.sponsoredChip, { borderColor: colors.border }]}>
          <Text style={[styles.sponsoredText, { color: colors.mutedForeground }]}>Sponsored</Text>
        </View>
      ) : reportable ? (
        <TouchableOpacity
          onPress={onReport}
          activeOpacity={0.7}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Report this"
        >
          <Feather name="more-horizontal" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/** A post is its words, and a photo only if there is one. Same as a status update. */
function PostBody({ item, colors }: { item: FeedItem; colors: Colors }) {
  const big = !item.imageUrl && (item.body?.length ?? 0) <= BIG_TEXT_LIMIT;

  return (
    <>
      {item.body ? (
        <Text style={[big ? styles.postBodyBig : styles.postBody, { color: colors.foreground }]}>{item.body}</Text>
      ) : null}
      <CardImage uri={item.imageUrl} style={styles.postMedia} colors={colors} />
    </>
  );
}

/**
 * Everything that is not a post: an image, then a block naming what it is and what to do.
 *
 * The block is drawn whether or not there is a photo. An offer with no image is a normal card
 * with a strong first line, not a card with a hole in it — which is the whole reason a feed can
 * carry content the catalogue never photographed.
 */
function Attachment({
  item,
  colors,
  accent,
  city,
  onOpen,
}: {
  item: FeedItem;
  colors: Colors;
  accent: string;
  city: string;
  onOpen: () => void;
}) {
  const eyebrow = eyebrowFor(item, city);
  const cta = ctaFor(item);

  return (
    <TouchableOpacity onPress={onOpen} activeOpacity={0.9} accessibilityRole="button" accessibilityLabel={item.title}>
      <CardImage uri={item.imageUrl} style={styles.hero} colors={colors} />

      <View style={[styles.attachment, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        {eyebrow ? (
          <Text style={[styles.eyebrow, { color: accent }]} numberOfLines={1}>
            {eyebrow.toUpperCase()}
          </Text>
        ) : null}

        <Text style={[styles.attachmentTitle, { color: colors.foreground }]} numberOfLines={3}>
          {item.title}
        </Text>

        {item.body && item.kind !== "deal" ? (
          <Text style={[styles.attachmentBody, { color: colors.mutedForeground }]} numberOfLines={3}>
            {item.body}
          </Text>
        ) : null}

        {cta ? (
          <View style={[styles.cta, { borderColor: accent }]}>
            <Text style={[styles.ctaText, { color: accent }]}>{cta}</Text>
            <Feather name="arrow-right" size={13} color={accent} />
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}


/**
 * Card media that removes itself when it cannot load.
 *
 * A missing photo is already a supported layout — plenty of rows in the catalogue have never
 * been photographed, and their cards read fine without one. A photo that fails to arrive should
 * land in that same layout rather than leaving a tall blank rectangle above the text, which is
 * what a fixed aspect ratio does with a broken URL.
 */
function CardImage({
  uri,
  style,
  colors,
}: {
  uri: string | null | undefined;
  style: object;
  colors: Colors;
}) {
  const [failed, setFailed] = useState(false);

  if (!uri || failed) return null;

  return (
    <Image
      source={{ uri }}
      style={[style, { backgroundColor: colors.muted }]}
      contentFit="cover"
      transition={150}
      onError={() => setFailed(true)}
    />
  );
}

/**
 * The action row.
 *
 * Likes and saves are shown only where they can actually be recorded, which today is a Pulse
 * post — those counters are real rows in `pulse_post_reactions`. Drawing a heart on a news card
 * that quietly forgets the tap would be worse than not drawing one.
 */
function Actions({
  item,
  colors,
  onToggleReaction,
  onShare,
  onOpen,
}: {
  item: FeedItem;
  colors: Colors;
  onToggleReaction: (kind: "like" | "save") => void;
  onShare: () => void;
  onOpen: () => void;
}) {
  return (
    <View style={[styles.actions, { borderTopColor: colors.border }]}>
      {item.kind === "post" ? (
        <>
          <TouchableOpacity
            style={styles.action}
            onPress={() => onToggleReaction("like")}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={item.viewerHasLiked ? "Remove like" : "Like this post"}
          >
            <Feather name="heart" size={18} color={item.viewerHasLiked ? "#dc2626" : colors.mutedForeground} />
            {item.likeCount ? (
              <Text style={[styles.actionCount, { color: item.viewerHasLiked ? "#dc2626" : colors.mutedForeground }]}>
                {formatCount(item.likeCount)}
              </Text>
            ) : null}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.action}
            onPress={() => onToggleReaction("save")}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={item.viewerHasSaved ? "Remove save" : "Save this post"}
          >
            <Feather name="bookmark" size={18} color={item.viewerHasSaved ? colors.amber : colors.mutedForeground} />
            {item.saveCount ? (
              <Text style={[styles.actionCount, { color: item.viewerHasSaved ? colors.amber : colors.mutedForeground }]}>
                {formatCount(item.saveCount)}
              </Text>
            ) : null}
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity
          style={styles.action}
          onPress={onOpen}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Open ${item.title}`}
        >
          <Feather name="external-link" size={17} color={colors.mutedForeground} />
          <Text style={[styles.actionCount, { color: colors.mutedForeground }]}>Open</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.action, styles.actionEnd]}
        onPress={onShare}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Share ${item.title}`}
      >
        <Feather name="share-2" size={17} color={colors.mutedForeground} />
      </TouchableOpacity>
    </View>
  );
}

/**
 * Who the card is from, and the line under their name.
 *
 * An event and an offer are attributed to the venue or the shop rather than to a category, the
 * way a page post is: "Marine Drive Promenade" tells a reader more than the word "Event", and
 * the kind is already obvious from the icon and the line beneath. Whatever the header says here
 * the attachment below does not repeat.
 */
function speaker(item: FeedItem): { name: string; meta: string } {
  const parts: (string | null | undefined)[] = [];

  switch (item.kind) {
    case "post":
      parts.push(item.authorHandle, item.location, item.publishedAt ? timeAgo(item.publishedAt) : null);
      return { name: item.authorName ?? item.title, meta: join(parts) };

    case "news":
      parts.push(hostOf(item.link), item.publishedAt ? timeAgo(item.publishedAt) : null);
      return { name: item.source ?? "Local news", meta: join(parts) };

    case "event":
      parts.push("Event", item.category);
      return { name: item.subtitle ?? "Event", meta: join(parts) };

    case "deal":
      parts.push("Offer", item.category);
      return { name: item.subtitle ?? "Offer", meta: join(parts) };

    case "ad":
      return { name: item.advertiserName ?? item.title, meta: "" };
  }
}

function join(parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(" · ");
}

/**
 * The one line that says why this card is here now.
 *
 * Prices resolve through the city's own currency; nothing in this file writes a symbol.
 */
function eyebrowFor(item: FeedItem, city: string): string | null {
  switch (item.kind) {
    case "event": {
      const when = item.startDate ? whenLabel(item.startDate) : null;
      const price = item.isFree ? "Free" : item.price ? formatPriceForCity(item.price, city) : null;
      return [when, price].filter(Boolean).join(" · ") || "Event";
    }
    case "deal": {
      // The title already carries the discount, so repeating it stutters. What the title lacks
      // is how long is left; the price is the fallback when the offer is not close to ending.
      const urgency = endsLabel(item.expiresAt);
      if (urgency) return urgency;
      if (addsSomething(item.title, item.discountText)) return item.discountText ?? null;
      return item.price ? formatPriceForCity(item.price, city) : "Offer";
    }
    case "news":
      return item.category ?? "Local news";
    case "ad":
      return item.advertiserName ?? null;
    case "post":
      return null;
  }
}

function ctaFor(item: FeedItem): string | null {
  switch (item.kind) {
    case "news":
      return "Read";
    case "event":
      return "View event";
    case "deal":
      return "Get offer";
    case "ad":
      return item.ctaLabel ?? "Learn more";
    case "post":
      return null;
  }
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, overflow: "hidden" },

  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingTop: 13, paddingBottom: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 15 },
  headerText: { flex: 1 },
  headerNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerName: { fontFamily: "Inter_600SemiBold", fontSize: 14, flexShrink: 1 },
  trustChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  trustText: { fontFamily: "Inter_600SemiBold", fontSize: 10 },
  headerMeta: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 2 },
  sponsoredChip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  sponsoredText: { fontFamily: "Inter_600SemiBold", fontSize: 10 },

  postBody: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 22, paddingHorizontal: 14, paddingBottom: 12 },
  postBodyBig: { fontFamily: "Inter_500Medium", fontSize: 19, lineHeight: 27, paddingHorizontal: 14, paddingTop: 4, paddingBottom: 18 },
  postMedia: { width: "100%", aspectRatio: 1.25 },

  hero: { width: "100%", aspectRatio: 1.5 },
  attachment: { paddingHorizontal: 14, paddingVertical: 12, gap: 4, borderTopWidth: StyleSheet.hairlineWidth },
  eyebrow: { fontFamily: "Inter_700Bold", fontSize: 10.5, letterSpacing: 0.6 },
  attachmentTitle: { fontFamily: "Inter_700Bold", fontSize: 16, lineHeight: 22 },
  attachmentBody: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 },
  cta: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", marginTop: 8, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  ctaText: { fontFamily: "Inter_600SemiBold", fontSize: 12.5 },

  actions: { flexDirection: "row", alignItems: "center", gap: 20, borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 10 },
  action: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 2 },
  actionEnd: { marginLeft: "auto" },
  actionCount: { fontFamily: "Inter_500Medium", fontSize: 12 },
});
