import React, { useState } from "react";
import { View, Text, StyleSheet, Platform, TouchableOpacity, ScrollView, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { EmptyState, ErrorState, useListRefreshControl } from "@/components/ListStates";
import { SkeletonCard } from "@/components/SkeletonCard";
import { AiChatFab } from "@/components/AiChatFab";
import { NewsShorts } from "@/components/NewsShorts";
import { ReportContentSheet, type ReportTarget } from "@/components/ReportContentSheet";
import { useCity } from "@/context/CityContext";
import { formatPriceForCity } from "@workspace/city-config";
import {
  getGetNewsItemsQueryKey,
  getGetPulseDigestQueryKey,
  useGetNewsItems,
  useGetPulseDigest,
  useTogglePulseReaction,
  type DigestEntry,
  type DigestSection,
} from "@workspace/api-client-react";

/**
 * Pulse — the front page.
 *
 * It began as a feed of one content type behind a row of filter chips, which meant the busiest
 * tab in the app could only ever show the least of what the app knows. It is a digest now: what
 * is on tonight, where to eat, what is about to run out, what the city desk has written, and
 * what people are asking — ranked on the server so "top" is one rule rather than whatever order
 * six list calls happened to return in.
 *
 * The chips are gone because a filter over five posts filters nothing, and because the sections
 * below are a better answer to the same question. Q&A lost its tab and kept its content: it is
 * a section here, and tapping through opens the answer.
 */
type MainTab = "pulse" | "news";

const TABS: { id: MainTab; label: string; icon: React.ComponentProps<typeof Feather>["name"] }[] = [
  { id: "pulse", label: "Pulse", icon: "zap" },
  { id: "news", label: "News", icon: "bell" },
];

/** Where a tap goes, per section kind. Pulse posts are read in place and go nowhere. */
const ROUTES: Record<DigestSection["kind"], ((id: number) => string) | null> = {
  pulse: null,
  event: (id) => `/event/${id}`,
  place: (id) => `/place/${id}`,
  deal: (id) => `/deal/${id}`,
  activity: (id) => `/activity/${id}`,
  movie: (id) => `/movie/${id}`,
  question: (id) => `/qa/${id}`,
};

const SECTION_ACCENT: Record<string, string> = {
  featured: "#b45309",
  now: "#7c3aed",
  pulse: "#0e7490",
  eat: "#c2410c",
  deals: "#047857",
  do: "#dc2626",
  watch: "#4f46e5",
  asked: "#0369a1",
};

function timeAgo(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  const days = Math.floor(minutes / 1440);
  return days < 7 ? `${days}d ago` : `${Math.floor(days / 7)}w ago`;
}

/** "Tonight 7:30 pm" reads better than a date for anything inside the next couple of days. */
function whenLabel(iso: string) {
  const date = new Date(iso);
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const days = Math.round((date.getTime() - Date.now()) / 86_400_000);
  const sameDay = date.toDateString() === new Date().toDateString();

  if (sameDay) return `Today ${time}`;
  if (days <= 1) return `Tomorrow ${time}`;
  return `${date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} · ${time}`;
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
    case "place":
      return entry.rating ? `★ ${entry.rating.toFixed(1)}` : null;
    case "deal":
      return [entry.discountText, entry.price ? formatPriceForCity(entry.price, city) : null]
        .filter(Boolean)
        .join(" · ");
    case "activity":
      return [
        entry.rating ? `★ ${entry.rating.toFixed(1)}` : null,
        entry.price ? formatPriceForCity(entry.price, city, entry.currency) : "Free",
      ]
        .filter(Boolean)
        .join(" · ");
    case "movie":
      // Genre and language are the tile's subtitle already; repeating them here read as a
      // stutter — "★ 4.8 · Horror Comedy · Hindi" above "Horror Comedy · Hindi".
      return entry.rating ? `★ ${entry.rating.toFixed(1)}` : null;
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

  const [activeTab, setActiveTab] = useState<MainTab>("pulse");
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);

  const cityName = selectedCity?.name;
  const topPadding = Platform.OS === "web" ? 20 : insets.top + 4;
  const bottomPad = Platform.OS === "web" ? 84 : 84 + insets.bottom;

  const digestParams = { city: cityName ?? "" };
  const newsParams = { city: cityName };
  const enabled = Boolean(cityName);

  const digest = useGetPulseDigest(digestParams, {
    query: { enabled, queryKey: getGetPulseDigestQueryKey(digestParams) },
  });
  const news = useGetNewsItems(newsParams, {
    query: { enabled, queryKey: getGetNewsItemsQueryKey(newsParams) },
  });

  const toggleReaction = useTogglePulseReaction();

  const refreshControl = useListRefreshControl(digest.isRefetching || news.isRefetching, () => {
    digest.refetch();
    news.refetch();
  });

  const header = (
    <View style={[styles.header, { paddingTop: topPadding, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      <View style={styles.titleRow}>
        <View>
          <Text style={[styles.wordmark, { color: colors.amber }]}>inMyCity</Text>
          <Text style={[styles.wordmarkSub, { color: colors.mutedForeground }]}>
            {cityName ? `${cityName} · What's happening` : "Select a city to begin"}
          </Text>
        </View>
      </View>

      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={tab.label}
            >
              <View style={styles.tabInner}>
                <Feather name={tab.icon} size={14} color={active ? colors.amber : colors.mutedForeground} />
                <Text style={[styles.tabLabel, { color: active ? colors.amber : colors.mutedForeground }]}>{tab.label}</Text>
              </View>
              {active && <View style={[styles.tabUnderline, { backgroundColor: colors.amber }]} />}
            </TouchableOpacity>
          );
        })}
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

  const renderDigest = () => {
    if (digest.isLoading) {
      return (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: bottomPad }}>
          {[0, 1, 2].map((key) => (
            <SkeletonCard key={key} />
          ))}
        </ScrollView>
      );
    }

    if (digest.isError) {
      return <ErrorState error={digest.error} onRetry={() => digest.refetch()} subject="Pulse" />;
    }

    const sections = digest.data?.sections ?? [];
    if (sections.length === 0) {
      return (
        <EmptyState
          icon="zap"
          title={`Nothing in ${cityName} yet`}
          message="Pulse fills up as places, events and posts are published. Pull down to check again."
        />
      );
    }

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: bottomPad }}
        refreshControl={refreshControl}
      >
        {sections.map((section) => (
          <View key={section.id} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: SECTION_ACCENT[section.id] ?? colors.amber }]} />
              <Text style={[styles.sectionLabel, { color: colors.foreground }]}>{section.label}</Text>
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
            ) : section.kind === "question" ? (
              <View style={styles.postList}>
                {section.entries.map((entry) => (
                  <QuestionRow
                    key={entry.id}
                    entry={entry}
                    colors={colors}
                    onOpen={() => router.push(`/qa/${entry.id}` as never)}
                    onReport={() =>
                      setReportTarget({ targetType: "qa_question", targetId: entry.id, label: entry.title })
                    }
                  />
                ))}
              </View>
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
    );
  };

  const renderNews = () => {
    if (news.isLoading) {
      return (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          {[0, 1].map((key) => (
            <SkeletonCard key={key} height={280} />
          ))}
        </ScrollView>
      );
    }

    if (news.isError) {
      return <ErrorState error={news.error} onRetry={() => news.refetch()} subject="local news" />;
    }

    const items = news.data ?? [];
    if (items.length === 0) {
      return (
        <EmptyState
          icon="bell"
          title="No news published yet"
          message={`We only show ${cityName} news once an editor has checked the source. Nothing has cleared review today.`}
        />
      );
    }

    return (
      <NewsShorts
        items={items}
        bottomInset={bottomPad}
        onReport={(item) =>
          setReportTarget({ targetType: "news_item", targetId: item.id, label: item.headline })
        }
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {header}
      {activeTab === "pulse" ? renderDigest() : renderNews()}
      <ReportContentSheet target={reportTarget} onClose={() => setReportTarget(null)} />
      {/* News is a full-screen reader; a floating button there covers the story it floats over. */}
      {activeTab === "pulse" ? <AiChatFab /> : null}
    </View>
  );
}

type Colors = ReturnType<typeof useColors>;

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
        {entry.subtitle ? (
          <Text style={[styles.tileSubtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
            {entry.subtitle}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function QuestionRow({
  entry,
  colors,
  onOpen,
  onReport,
}: {
  entry: DigestEntry;
  colors: Colors;
  onOpen: () => void;
  onReport: () => void;
}) {
  const answers = entry.answerCount ?? 0;

  return (
    <View style={[styles.questionRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity
        style={styles.questionMain}
        onPress={onOpen}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`${entry.title}. ${answers} ${answers === 1 ? "answer" : "answers"}`}
      >
        <Text style={[styles.questionText, { color: colors.foreground }]}>{entry.title}</Text>
        <Text style={[styles.questionMeta, { color: colors.mutedForeground }]}>
          {answers} {answers === 1 ? "answer" : "answers"}
          {entry.upvoteCount ? ` · ${entry.upvoteCount} upvotes` : ""}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onReport} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Report this question" hitSlop={8}>
        <Feather name="flag" size={15} color={colors.mutedForeground} />
      </TouchableOpacity>
      <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 20, paddingBottom: 0 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingBottom: 10 },
  wordmark: { fontFamily: "Inter_700Bold", fontSize: 24, letterSpacing: -0.5 },
  wordmarkSub: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 1 },
  tabBar: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth },
  tabItem: { flex: 1, alignItems: "center" },
  tabInner: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 11 },
  tabLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  tabUnderline: { height: 2, width: "100%", borderTopLeftRadius: 2, borderTopRightRadius: 2 },

  section: { paddingTop: 14 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 16, marginBottom: 10 },
  sectionDot: { width: 7, height: 7, borderRadius: 3.5 },
  sectionLabel: { fontFamily: "Inter_700Bold", fontSize: 15 },

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

  tileScroll: { paddingHorizontal: 16, gap: 10 },
  tile: { width: 172, borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  tileImage: { width: "100%", height: 104 },
  tileBody: { padding: 11, gap: 3 },
  tileTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 18 },
  tileMeta: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  tileSubtitle: { fontFamily: "Inter_400Regular", fontSize: 11 },

  questionRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  questionMain: { flex: 1, gap: 4 },
  questionText: { fontFamily: "Inter_600SemiBold", fontSize: 14, lineHeight: 20 },
  questionMeta: { fontFamily: "Inter_400Regular", fontSize: 11 },
});
