import React, { useState } from "react";
import { View, Text, StyleSheet, Platform, TouchableOpacity, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { EmptyState, ErrorState, useListRefreshControl } from "@/components/ListStates";
import { SkeletonCard } from "@/components/SkeletonCard";
import { AiChatFab } from "@/components/AiChatFab";
import { ReportContentSheet, type ReportTarget } from "@/components/ReportContentSheet";
import { useCity } from "@/context/CityContext";
import { formatPriceForCity } from "@workspace/city-config";
import {
  getGetPulseDigestQueryKey,
  useGetPulseDigest,
  useTogglePulseReaction,
  type DigestEntry,
  type DigestSection,
} from "@workspace/api-client-react";

/**
 * Pulse — what is happening in the city right now.
 *
 * One page, no tabs. It answers a single question, and everything on it is something that
 * changes: the local news, the offers that are running out, the events that have not happened
 * yet, and what the city desk has written. Top-rated restaurants and films used to be here too;
 * they are the category grid's job, and repeating them made the page longer without making it
 * more useful.
 *
 * The whole page is one request. Six list calls on the busiest screen is the pattern Phase 1
 * moved away from, and it leaves "what is top" un-auditable — the ranking is stated per section
 * on the server instead.
 */
const ROUTES: Record<DigestSection["kind"], ((id: number) => string) | null> = {
  pulse: null,
  news: (id) => `/news?start=${id}`,
  event: (id) => `/event/${id}`,
  deal: (id) => `/deal/${id}`,
};

const SECTION_ACCENT: Record<string, string> = {
  news: "#0369a1",
  deals: "#047857",
  now: "#7c3aed",
  pulse: "#0e7490",
};

function timeAgo(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  const days = Math.floor(minutes / 1440);
  return days < 7 ? `${days}d ago` : `${Math.floor(days / 7)}w ago`;
}

/** "Today 7:00 pm" reads better than a date for anything inside the next couple of days. */
function whenLabel(iso: string) {
  const date = new Date(iso);
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const sameDay = date.toDateString() === new Date().toDateString();
  const days = Math.round((date.getTime() - Date.now()) / 86_400_000);

  if (sameDay) return `Today ${time}`;
  if (days <= 1) return `Tomorrow ${time}`;
  return `${date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} · ${time}`;
}

/** How long an offer has left. The reason the deals section is on this page at all. */
function endsLabel(iso: string | null | undefined) {
  if (!iso) return null;
  const days = Math.ceil((Date.parse(iso) - Date.now()) / 86_400_000);
  if (days <= 0) return "Ends today";
  if (days === 1) return "Ends tomorrow";
  if (days <= 14) return `${days} days left`;
  return null;
}

/**
 * Whether the subtitle says anything the title has not.
 *
 * A deal is titled "Bade Miyan — Buy 2 Kebab Plates, Get 1 Free" and its subtitle is the shop
 * it is at, which the title has already named. Drawing both puts the same words on the card
 * twice and pushes what is actually new further down.
 */
function addsSomething(title: string, subtitle: string | null | undefined): boolean {
  if (!subtitle) return false;
  return !title.toLowerCase().includes(subtitle.toLowerCase());
}

function formatCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return n.toString();
}

/** The one line under a tile. Prices go through the city's currency, never a written symbol. */
function metaFor(kind: DigestSection["kind"], entry: DigestEntry, city: string): string | null {
  switch (kind) {
    case "event": {
      const when = entry.startDate ? whenLabel(entry.startDate) : null;
      const price = entry.isFree ? "Free" : entry.price ? formatPriceForCity(entry.price, city) : null;
      return [when, price].filter(Boolean).join(" · ") || null;
    }
    case "deal":
      // Deal titles already carry the discount ("Bade Miyan — Buy 2 Kebab Plates, Get 1 Free"),
      // so repeating it here is a stutter. How long is left is the fact the title lacks; the
      // price is the fallback when the offer is not close enough to be urgent.
      return (
        endsLabel(entry.startDate) ??
        (entry.price
          ? formatPriceForCity(entry.price, city)
          : addsSomething(entry.title, entry.discountText)
            ? entry.discountText ?? null
            : null)
      );
    default:
      return null;
  }
}

export default function FeedsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { selectedCity } = useCity();

  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);

  const cityName = selectedCity?.name;
  const topPadding = Platform.OS === "web" ? 20 : insets.top + 4;
  const bottomPad = Platform.OS === "web" ? 84 : 84 + insets.bottom;

  const params = { city: cityName ?? "" };
  const digest = useGetPulseDigest(params, {
    query: { enabled: Boolean(cityName), queryKey: getGetPulseDigestQueryKey(params) },
  });

  const toggleReaction = useTogglePulseReaction();
  const refreshControl = useListRefreshControl(digest.isRefetching, () => digest.refetch());

  const header = (
    <View style={[styles.header, { paddingTop: topPadding, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      <View>
        <Text style={[styles.wordmark, { color: colors.amber }]}>inMyCity</Text>
        <Text style={[styles.wordmarkSub, { color: colors.mutedForeground }]}>
          {cityName ? `${cityName} · What's happening` : "Select a city to begin"}
        </Text>
      </View>
      <View style={[styles.liveChip, { backgroundColor: "#dc262618" }]} accessible accessibilityLabel="Updated live">
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>Live</Text>
      </View>
    </View>
  );

  if (!cityName) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {header}
        <EmptyState
          icon="map-pin"
          title="Pick a city first"
          message="Pulse is local by definition. Choose a city and this fills with what's happening there."
          action={{ label: "Choose a city", onPress: () => router.push("/(tabs)") }}
        />
      </View>
    );
  }

  if (digest.isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {header}
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: bottomPad }}>
          {[0, 1, 2].map((key) => (
            <SkeletonCard key={key} />
          ))}
        </ScrollView>
      </View>
    );
  }

  if (digest.isError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {header}
        <ErrorState error={digest.error} onRetry={() => digest.refetch()} subject="Pulse" />
      </View>
    );
  }

  const sections = digest.data?.sections ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {header}

      {sections.length === 0 ? (
        <EmptyState
          icon="zap"
          title={`Nothing happening in ${cityName} yet`}
          message="News, offers and events appear here as they are published. Pull down to check again."
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 6, paddingBottom: bottomPad }}
          refreshControl={refreshControl}
        >
          {sections.map((section) => (
            <View key={section.id} style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionDot, { backgroundColor: SECTION_ACCENT[section.id] ?? colors.amber }]} />
                <Text style={[styles.sectionLabel, { color: colors.foreground }]}>{section.label}</Text>
                {section.id === "news" ? (
                  <TouchableOpacity
                    style={styles.seeAll}
                    onPress={() => router.push("/news" as never)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Read all local news"
                  >
                    <Text style={[styles.seeAllText, { color: colors.amber }]}>Read all</Text>
                    <Feather name="chevron-right" size={14} color={colors.amber} />
                  </TouchableOpacity>
                ) : null}
              </View>

              {section.kind === "pulse" ? (
                <View style={styles.postList}>
                  {section.entries.map((entry) => (
                    <PostCard
                      key={entry.id}
                      entry={entry}
                      colors={colors}
                      onToggle={(kind) =>
                        toggleReaction.mutate(
                          { id: entry.id, data: { kind } },
                          { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/pulse/digest"] }) },
                        )
                      }
                      onReport={() =>
                        setReportTarget({ targetType: "pulse_post", targetId: entry.id, label: entry.body ?? entry.title })
                      }
                    />
                  ))}
                </View>
              ) : section.kind === "news" ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tileScroll}>
                  {section.entries.map((entry) => (
                    <NewsTile
                      key={entry.id}
                      entry={entry}
                      colors={colors}
                      onPress={() => router.push(`/news?start=${entry.id}` as never)}
                    />
                  ))}
                </ScrollView>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tileScroll}>
                  {section.entries.map((entry) => (
                    <Tile
                      key={entry.id}
                      entry={entry}
                      meta={metaFor(section.kind, entry, cityName)}
                      colors={colors}
                      onPress={() => {
                        const route = ROUTES[section.kind];
                        if (route) router.push(route(entry.id) as never);
                      }}
                    />
                  ))}
                </ScrollView>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      <ReportContentSheet target={reportTarget} onClose={() => setReportTarget(null)} />
      <AiChatFab />
    </View>
  );
}

type Colors = ReturnType<typeof useColors>;

/** News gets a taller card with the standfirst, because a headline alone is not a story. */
function NewsTile({ entry, colors, onPress }: { entry: DigestEntry; colors: Colors; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.newsTile, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${entry.title}. From ${entry.subtitle ?? "a local source"}`}
    >
      {entry.imageUrl ? (
        <Image source={{ uri: entry.imageUrl }} style={styles.newsTileImage} contentFit="cover" transition={150} />
      ) : (
        <View style={[styles.newsTileImage, { backgroundColor: colors.muted }]} />
      )}
      <View style={styles.newsTileBody}>
        <Text style={[styles.newsTileTitle, { color: colors.foreground }]} numberOfLines={3}>
          {entry.title}
        </Text>
        {entry.body ? (
          <Text style={[styles.newsTileSummary, { color: colors.mutedForeground }]} numberOfLines={3}>
            {entry.body}
          </Text>
        ) : null}
        <Text style={[styles.newsTileSource, { color: colors.mutedForeground }]} numberOfLines={1}>
          {[entry.subtitle, entry.publishedAt ? timeAgo(entry.publishedAt) : null].filter(Boolean).join(" · ")}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function Tile({
  entry,
  meta,
  colors,
  onPress,
}: {
  entry: DigestEntry;
  meta: string | null;
  colors: Colors;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={[entry.title, meta].filter(Boolean).join(". ")}
    >
      {entry.imageUrl ? (
        <Image source={{ uri: entry.imageUrl }} style={styles.tileImage} contentFit="cover" transition={150} />
      ) : (
        <View style={[styles.tileImage, { backgroundColor: colors.muted }]} />
      )}
      <View style={styles.tileBody}>
        <Text style={[styles.tileTitle, { color: colors.foreground }]} numberOfLines={2}>
          {entry.title}
        </Text>
        {meta ? (
          <Text style={[styles.tileMeta, { color: colors.amber }]} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
        {addsSomething(entry.title, entry.subtitle) ? (
          <Text style={[styles.tileSubtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
            {entry.subtitle}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function PostCard({
  entry,
  colors,
  onToggle,
  onReport,
}: {
  entry: DigestEntry;
  colors: Colors;
  onToggle: (kind: "like" | "save") => void;
  onReport: () => void;
}) {
  const provenance = [entry.source, entry.trustLabel, entry.confidence ? `${entry.confidence} confidence` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={[styles.postCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.postAuthorRow}>
        <View style={[styles.postAvatar, { backgroundColor: colors.amber + "20" }]}>
          <Text style={[styles.postAvatarText, { color: colors.amber }]}>
            {(entry.authorName ?? entry.title).charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.postAuthorMeta}>
          <Text style={[styles.postAuthor, { color: colors.foreground }]} numberOfLines={1}>
            {entry.authorName ?? entry.title}
          </Text>
          <Text style={[styles.postMetaLine, { color: colors.mutedForeground }]} numberOfLines={1}>
            {[entry.subtitle, entry.publishedAt ? timeAgo(entry.publishedAt) : null].filter(Boolean).join(" · ")}
          </Text>
        </View>
        <TouchableOpacity onPress={onReport} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Report this post" hitSlop={8}>
          <Feather name="flag" size={15} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {entry.body ? <Text style={[styles.postBody, { color: colors.foreground }]}>{entry.body}</Text> : null}

      {entry.imageUrl ? (
        <Image source={{ uri: entry.imageUrl }} style={styles.postMedia} contentFit="cover" transition={150} />
      ) : null}

      {provenance ? (
        <View style={[styles.provenance, { borderTopColor: colors.border }]}>
          <Feather name="shield" size={11} color={colors.mutedForeground} />
          <Text style={[styles.provenanceText, { color: colors.mutedForeground }]} numberOfLines={1}>
            {provenance}
          </Text>
        </View>
      ) : null}

      <View style={[styles.postActions, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={styles.postAction}
          onPress={() => onToggle("like")}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={entry.viewerHasLiked ? "Remove like" : "Like this post"}
        >
          <Feather name="heart" size={18} color={entry.viewerHasLiked ? "#dc2626" : colors.mutedForeground} />
          {entry.likeCount ? (
            <Text style={[styles.postActionCount, { color: entry.viewerHasLiked ? "#dc2626" : colors.mutedForeground }]}>
              {formatCount(entry.likeCount)}
            </Text>
          ) : null}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.postAction}
          onPress={() => onToggle("save")}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={entry.viewerHasSaved ? "Remove save" : "Save this post"}
        >
          <Feather name="bookmark" size={18} color={entry.viewerHasSaved ? colors.amber : colors.mutedForeground} />
          {entry.saveCount ? (
            <Text style={[styles.postActionCount, { color: entry.viewerHasSaved ? colors.amber : colors.mutedForeground }]}>
              {formatCount(entry.saveCount)}
            </Text>
          ) : null}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  wordmark: { fontFamily: "Inter_700Bold", fontSize: 24, letterSpacing: -0.5 },
  wordmarkSub: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 1 },
  liveChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, marginTop: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#dc2626" },
  liveText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#dc2626" },

  section: { paddingTop: 16 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 16, marginBottom: 10 },
  sectionDot: { width: 7, height: 7, borderRadius: 3.5 },
  sectionLabel: { fontFamily: "Inter_700Bold", fontSize: 16 },
  seeAll: { flexDirection: "row", alignItems: "center", gap: 2, marginLeft: "auto" },
  seeAllText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },

  tileScroll: { paddingHorizontal: 16, gap: 10 },
  tile: { width: 172, borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  tileImage: { width: "100%", height: 104 },
  tileBody: { padding: 11, gap: 3 },
  tileTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 18 },
  tileMeta: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  tileSubtitle: { fontFamily: "Inter_400Regular", fontSize: 11 },

  newsTile: { width: 268, borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  newsTileImage: { width: "100%", height: 132 },
  newsTileBody: { padding: 12, gap: 5 },
  newsTileTitle: { fontFamily: "Inter_700Bold", fontSize: 14, lineHeight: 19 },
  newsTileSummary: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17 },
  newsTileSource: { fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 1 },

  postList: { paddingHorizontal: 16, gap: 12 },
  postCard: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 10 },
  postAuthorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  postAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  postAvatarText: { fontFamily: "Inter_700Bold", fontSize: 15 },
  postAuthorMeta: { flex: 1 },
  postAuthor: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  postMetaLine: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 2 },
  postBody: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21 },
  postMedia: { width: "100%", height: 190, borderRadius: 14 },
  provenance: { flexDirection: "row", alignItems: "center", gap: 6, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 9 },
  provenanceText: { fontFamily: "Inter_400Regular", fontSize: 11, flex: 1 },
  postActions: { flexDirection: "row", alignItems: "center", gap: 18, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10 },
  postAction: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 2 },
  postActionCount: { fontFamily: "Inter_500Medium", fontSize: 12 },
});
