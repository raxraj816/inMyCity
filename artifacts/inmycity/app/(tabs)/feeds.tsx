import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  ScrollView,
  Linking,
} from "react-native";
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
import {
  getGetNewsItemsQueryKey,
  getGetPulsePostsQueryKey,
  getGetQaQuestionsQueryKey,
  useGetCommunityPolicy,
  useGetNewsItems,
  useGetPulsePosts,
  useGetQaQuestions,
  useToggleQaUpvote,
  useTogglePulseReaction,
  type NewsItem,
  type PulsePost,
  type QaQuestion,
} from "@workspace/api-client-react";

/**
 * Pulse — the reason to open the app on a Tuesday.
 *
 * Everything on this screen used to be an in-file constant keyed by city name: five hundred
 * lines of invented posts, invented news and invented engagement counts. It reads from the
 * database now, which changes what the screen is allowed to claim:
 *
 * - Counts are real. A post shows the likes it has, which at launch is usually none, and a
 *   zero is simply not drawn rather than dressed up.
 * - There is no comment button, because there are no comments. An affordance that does
 *   nothing is the same broken promise as a booking button with no booking behind it.
 * - Every post and every news item carries its source and how confident we are in it, and
 *   every one of them can be reported. That is the takedown path the IT Rules require, and it
 *   is one tap from the content rather than buried in a settings page.
 */

type MainTab = "pulse" | "news" | "qa";

const TABS: { id: MainTab; label: string; icon: React.ComponentProps<typeof Feather>["name"] }[] = [
  { id: "pulse", label: "Pulse", icon: "zap" },
  { id: "news", label: "News", icon: "bell" },
  { id: "qa", label: "Q&A", icon: "message-circle" },
];

const PULSE_FILTERS = [
  { id: "all", label: "All" },
  { id: "food", label: "Food" },
  { id: "transit", label: "Transit" },
  { id: "tips", label: "Tips" },
  { id: "events", label: "Events" },
  { id: "videos", label: "Video" },
] as const;

const TIER_CONFIG: Record<string, { label: string; color: string }> = {
  official: { label: "Official", color: "#b45309" },
  local_expert: { label: "Local expert", color: "#2563eb" },
  creator: { label: "Creator", color: "#7c3aed" },
  business: { label: "Business", color: "#047857" },
  resident: { label: "Resident", color: "#0e7490" },
};

const NEWS_CATEGORY_META: Record<string, { label: string; icon: React.ComponentProps<typeof Feather>["name"]; color: string; bg: string }> = {
  local: { label: "Local", icon: "map-pin", color: "#7c3aed", bg: "#f5f3ff" },
  traffic: { label: "Traffic", icon: "alert-triangle", color: "#c2410c", bg: "#fff7ed" },
  weather: { label: "Weather", icon: "cloud-rain", color: "#2563eb", bg: "#eff6ff" },
  civic: { label: "Civic", icon: "info", color: "#15803d", bg: "#f0fdf4" },
  sports: { label: "Sports", icon: "activity", color: "#15803d", bg: "#f0fdf4" },
  business: { label: "Business", icon: "briefcase", color: "#047857", bg: "#ecfdf5" },
  transit: { label: "Transit", icon: "navigation", color: "#0e7490", bg: "#ecfeff" },
};

const FALLBACK_CATEGORY = { label: "News", icon: "info" as const, color: "#7c3aed", bg: "#f5f3ff" };

/** The categories that belong in the alert strip: things that change your evening. */
const ALERT_CATEGORIES = new Set(["traffic", "weather", "transit", "civic"]);

function categoryMeta(category: string) {
  return NEWS_CATEGORY_META[category] ?? FALLBACK_CATEGORY;
}

function timeAgo(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (!Number.isFinite(minutes)) return "";
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  const days = Math.floor(minutes / 1440);
  return days < 7 ? `${days}d ago` : `${Math.floor(days / 7)}w ago`;
}

function formatCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return n.toString();
}

/** A trust label reads as a claim about the source, so it is always shown with one. */
function provenanceLine(trustLabel?: string | null, confidence?: string | null, source?: string | null) {
  const parts = [source, trustLabel, confidence ? `${confidence} confidence` : null].filter(Boolean);
  return parts.join(" · ");
}

export default function FeedsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { selectedCity } = useCity();

  const [activeTab, setActiveTab] = useState<MainTab>("pulse");
  const [pulseFilter, setPulseFilter] = useState<string>("all");
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);

  const cityName = selectedCity?.name;
  const topPadding = Platform.OS === "web" ? 20 : insets.top + 4;
  const bottomPad = Platform.OS === "web" ? 84 : 84 + insets.bottom;

  const pulseParams = { city: cityName, filter: pulseFilter };
  const cityParams = { city: cityName };
  const enabled = Boolean(cityName);

  const pulse = useGetPulsePosts(pulseParams, {
    query: { enabled, queryKey: getGetPulsePostsQueryKey(pulseParams) },
  });
  const news = useGetNewsItems(cityParams, {
    query: { enabled, queryKey: getGetNewsItemsQueryKey(cityParams) },
  });
  const questions = useGetQaQuestions(cityParams, {
    query: { enabled, queryKey: getGetQaQuestionsQueryKey(cityParams) },
  });
  const { data: policy } = useGetCommunityPolicy();

  const toggleReaction = useTogglePulseReaction();
  const toggleUpvote = useToggleQaUpvote();

  // Every mutation writes one row and changes one list, so the simplest correct thing is to
  // let React Query refetch the list it belongs to rather than hand-patching the cache.
  const invalidate = (key: unknown[]) => queryClient.invalidateQueries({ queryKey: key });

  const refreshControl = useListRefreshControl(
    pulse.isRefetching || news.isRefetching || questions.isRefetching,
    () => {
      pulse.refetch();
      news.refetch();
      questions.refetch();
    },
  );

  const alerts = useMemo(
    () => (news.data ?? []).filter((item) => ALERT_CATEGORIES.has(item.category)).slice(0, 6),
    [news.data],
  );

  const openLink = (url?: string | null) => {
    if (!url) return;
    Linking.openURL(url).catch(() => undefined);
  };

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
                <Feather name={tab.icon} size={13} color={active ? colors.amber : colors.mutedForeground} />
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

  const renderPulse = () => {
    if (pulse.isLoading) return <LoadingList bottomPad={bottomPad} />;
    if (pulse.isError) {
      return <ErrorState error={pulse.error} onRetry={() => pulse.refetch()} subject="Pulse" />;
    }

    const posts = pulse.data ?? [];

    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad }} refreshControl={refreshControl}>
        {alerts.length > 0 ? (
          <View style={[styles.alertSection, { borderBottomColor: colors.border }]}>
            <View style={styles.alertHeader}>
              <View style={styles.alertDot} />
              <Text style={[styles.alertHeaderLabel, { color: colors.foreground }]}>Happening now</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.alertScroll}>
              {alerts.map((item) => {
                const meta = categoryMeta(item.category);
                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.85}
                    onPress={() => openLink(item.link)}
                    disabled={!item.link}
                    style={[styles.alertCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    accessibilityRole={item.link ? "link" : "text"}
                    accessibilityLabel={`${meta.label}: ${item.headline}`}
                  >
                    <View style={[styles.alertIcon, { backgroundColor: meta.color + "18" }]}>
                      <Feather name={meta.icon} size={13} color={meta.color} />
                    </View>
                    <Text style={[styles.alertText, { color: colors.foreground }]} numberOfLines={3}>
                      {item.headline}
                    </Text>
                    <Text style={[styles.alertMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {item.source} · {timeAgo(item.publishedAt)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {PULSE_FILTERS.map((filter) => {
            const active = pulseFilter === filter.id;
            return (
              <TouchableOpacity
                key={filter.id}
                onPress={() => setPulseFilter(filter.id)}
                activeOpacity={0.8}
                style={[
                  styles.filterChip,
                  { backgroundColor: active ? colors.amber : colors.card, borderColor: active ? colors.amber : colors.border },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.filterChipText, { color: active ? "#fff" : colors.foreground }]}>{filter.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {policy?.submissionsEnabled ? (
          <TouchableOpacity
            style={[styles.composeCta, { backgroundColor: colors.accent, borderColor: colors.border }]}
            activeOpacity={0.85}
            onPress={() => router.push("/pulse/compose")}
            accessibilityRole="button"
          >
            <Feather name="edit-3" size={15} color={colors.amber} />
            <Text style={[styles.composeText, { color: colors.mutedForeground }]}>Share something about {cityName}…</Text>
          </TouchableOpacity>
        ) : null}

        {posts.length === 0 ? (
          <EmptyState
            icon="zap"
            title={pulseFilter === "all" ? `Nothing in ${cityName} Pulse yet` : "Nothing under this filter"}
            message={
              pulseFilter === "all"
                ? "Posts appear here once our editors publish them. Pull down to check again."
                : "Try another filter — the full feed usually has something."
            }
            action={pulseFilter === "all" ? undefined : { label: "Show everything", onPress: () => setPulseFilter("all") }}
          />
        ) : (
          <View style={styles.pulseList}>
            {posts.map((post) => (
              <PulseCard
                key={post.id}
                post={post}
                colors={colors}
                onToggle={(kind) =>
                  toggleReaction.mutate(
                    { id: post.id, data: { kind } },
                    { onSuccess: () => invalidate(["/api/pulse"]) },
                  )
                }
                onReport={() =>
                  setReportTarget({ targetType: "pulse_post", targetId: post.id, label: post.caption })
                }
              />
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  const renderNews = () => {
    if (news.isLoading) return <LoadingList bottomPad={bottomPad} />;
    if (news.isError) return <ErrorState error={news.error} onRetry={() => news.refetch()} subject="local news" />;

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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad }} refreshControl={refreshControl}>
        <View style={styles.newsList}>
          {items.map((item) => (
            <NewsCard
              key={item.id}
              item={item}
              colors={colors}
              onOpen={() => openLink(item.link)}
              onReport={() => setReportTarget({ targetType: "news_item", targetId: item.id, label: item.headline })}
            />
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderQa = () => {
    if (questions.isLoading) return <LoadingList bottomPad={bottomPad} />;
    if (questions.isError) {
      return <ErrorState error={questions.error} onRetry={() => questions.refetch()} subject="questions" />;
    }

    const items = questions.data ?? [];

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: bottomPad, paddingHorizontal: 16, gap: 12 }}
        refreshControl={refreshControl}
      >
        {policy?.submissionsEnabled ? (
          <TouchableOpacity
            style={[styles.composeCta, { backgroundColor: colors.accent, borderColor: colors.border, marginHorizontal: 0 }]}
            activeOpacity={0.85}
            onPress={() => router.push("/qa/ask")}
            accessibilityRole="button"
          >
            <Feather name="edit-3" size={15} color={colors.amber} />
            <Text style={[styles.composeText, { color: colors.mutedForeground }]}>Ask something about {cityName}…</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.notice, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="info" size={14} color={colors.mutedForeground} />
            <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>
              Asking opens once our moderation team is in place. These answers are written and checked by our editors.
            </Text>
          </View>
        )}

        {items.length === 0 ? (
          <EmptyState icon="message-circle" title="No questions yet" message={`Nothing has been published for ${cityName} yet.`} />
        ) : (
          items.map((question) => (
            <QuestionCard
              key={question.id}
              question={question}
              colors={colors}
              onOpen={() => router.push(`/qa/${question.id}`)}
              onUpvote={() =>
                toggleUpvote.mutate(
                  { targetType: "questions", id: question.id },
                  { onSuccess: () => invalidate(["/api/qa/questions"]) },
                )
              }
              onReport={() =>
                setReportTarget({ targetType: "qa_question", targetId: question.id, label: question.question })
              }
            />
          ))
        )}
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {header}
      {activeTab === "pulse" && renderPulse()}
      {activeTab === "news" && renderNews()}
      {activeTab === "qa" && renderQa()}
      <ReportContentSheet target={reportTarget} onClose={() => setReportTarget(null)} />
      <AiChatFab />
    </View>
  );
}

function LoadingList({ bottomPad }: { bottomPad: number }) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: bottomPad }}>
      {[0, 1, 2].map((key) => (
        <SkeletonCard key={key} />
      ))}
    </ScrollView>
  );
}

type Colors = ReturnType<typeof useColors>;

function PulseCard({
  post,
  colors,
  onToggle,
  onReport,
}: {
  post: PulsePost;
  colors: Colors;
  onToggle: (kind: "like" | "save") => void;
  onReport: () => void;
}) {
  const tier = TIER_CONFIG[post.tier] ?? { label: post.tier, color: colors.amber };
  const provenance = provenanceLine(post.trustLabel, post.confidence, post.source);

  return (
    <View style={[styles.pulseCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {post.isSponsored ? (
        <View style={[styles.sponsoredStrip, { backgroundColor: colors.muted }]}>
          <Feather name="star" size={10} color={colors.mutedForeground} />
          <Text style={[styles.sponsoredText, { color: colors.mutedForeground }]}>Sponsored</Text>
        </View>
      ) : null}

      <View style={styles.cardAuthorRow}>
        <View style={[styles.cardAvatar, { backgroundColor: tier.color + "20" }]}>
          <Text style={[styles.cardAvatarText, { color: tier.color }]}>{post.authorName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.cardAuthorMeta}>
          <View style={styles.cardAuthorNameRow}>
            <Text style={[styles.cardAuthorName, { color: colors.foreground }]} numberOfLines={1}>
              {post.authorName}
            </Text>
            <View style={[styles.tierBadge, { backgroundColor: tier.color + "18" }]}>
              <Text style={[styles.tierBadgeText, { color: tier.color }]}>{tier.label}</Text>
            </View>
          </View>
          <Text style={[styles.cardMetaLine, { color: colors.mutedForeground }]} numberOfLines={1}>
            {post.authorHandle}
            {post.location ? ` · ${post.location}` : ""} · {timeAgo(post.publishedAt)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.cardMore}
          activeOpacity={0.7}
          onPress={onReport}
          accessibilityRole="button"
          accessibilityLabel="Report this post"
        >
          <Feather name="flag" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.cardCaption, { color: colors.foreground }]}>{post.caption}</Text>

      {post.mediaUrl ? (
        <View style={styles.cardMediaWrap}>
          <Image source={{ uri: post.mediaUrl }} style={styles.cardMedia} contentFit="cover" transition={150} />
          {post.mediaType === "video" ? (
            <View style={styles.cardPlayBtn}>
              <Feather name="play" size={18} color="#fff" />
            </View>
          ) : null}
        </View>
      ) : null}

      {provenance ? (
        <View style={[styles.provenance, { borderColor: colors.border }]}>
          <Feather name="shield" size={11} color={colors.mutedForeground} />
          <Text style={[styles.provenanceText, { color: colors.mutedForeground }]} numberOfLines={1}>
            {provenance}
          </Text>
        </View>
      ) : null}

      <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={styles.cardAction}
          onPress={() => onToggle("like")}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={post.viewerHasLiked ? "Remove like" : "Like this post"}
        >
          <Feather name="heart" size={18} color={post.viewerHasLiked ? "#dc2626" : colors.mutedForeground} />
          {post.likeCount > 0 ? (
            <Text style={[styles.cardActionCount, { color: post.viewerHasLiked ? "#dc2626" : colors.mutedForeground }]}>
              {formatCount(post.likeCount)}
            </Text>
          ) : null}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cardAction}
          onPress={() => onToggle("save")}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={post.viewerHasSaved ? "Remove save" : "Save this post"}
        >
          <Feather name="bookmark" size={18} color={post.viewerHasSaved ? colors.amber : colors.mutedForeground} />
          {post.saveCount > 0 ? (
            <Text style={[styles.cardActionCount, { color: post.viewerHasSaved ? colors.amber : colors.mutedForeground }]}>
              {formatCount(post.saveCount)}
            </Text>
          ) : null}
        </TouchableOpacity>
        {post.sourceUrl ? (
          <TouchableOpacity
            style={[styles.cardAction, { marginLeft: "auto" }]}
            onPress={() => Linking.openURL(post.sourceUrl!).catch(() => undefined)}
            activeOpacity={0.7}
            accessibilityRole="link"
            accessibilityLabel="Open the source"
          >
            <Feather name="external-link" size={17} color={colors.mutedForeground} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

function NewsCard({
  item,
  colors,
  onOpen,
  onReport,
}: {
  item: NewsItem;
  colors: Colors;
  onOpen: () => void;
  onReport: () => void;
}) {
  const meta = categoryMeta(item.category);

  return (
    <View style={[styles.newsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.newsTop}>
        <View style={[styles.newsIcon, { backgroundColor: meta.bg }]}>
          <Feather name={meta.icon} size={12} color={meta.color} />
        </View>
        <View style={styles.newsSourceMeta}>
          <Text style={[styles.newsSource, { color: colors.foreground }]} numberOfLines={1}>
            {item.source}
          </Text>
          <Text style={[styles.newsProvenance, { color: colors.mutedForeground }]} numberOfLines={1}>
            {[timeAgo(item.publishedAt), meta.label, item.trustLabel, item.confidence ? `${item.confidence} confidence` : null]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </View>
        <TouchableOpacity onPress={onReport} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Report this item">
          <Feather name="flag" size={15} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        activeOpacity={item.link ? 0.86 : 1}
        onPress={onOpen}
        disabled={!item.link}
        accessibilityRole={item.link ? "link" : "text"}
        accessibilityLabel={item.headline}
      >
        <View style={styles.newsBody}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.newsImage} contentFit="cover" transition={150} />
          ) : null}
          <View style={styles.newsContent}>
            <Text style={[styles.newsHeadline, { color: colors.foreground }]} numberOfLines={3}>
              {item.headline}
            </Text>
            {item.summary ? (
              <Text style={[styles.newsSummary, { color: colors.mutedForeground }]} numberOfLines={3}>
                {item.summary}
              </Text>
            ) : null}
            {item.link ? (
              <View style={styles.newsFooter}>
                <Text style={[styles.newsRead, { color: colors.amber }]}>Read at {item.source}</Text>
                <Feather name="external-link" size={13} color={colors.amber} />
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

/**
 * A question card carries three separate actions — open, upvote, report — so the card itself
 * cannot also be one. Nesting a button inside a button is invalid HTML on the web build and a
 * hydration error, and it leaves a screen reader with controls inside a control.
 */
function QuestionCard({
  question,
  colors,
  onOpen,
  onUpvote,
  onReport,
}: {
  question: QaQuestion;
  colors: Colors;
  onOpen: () => void;
  onUpvote: () => void;
  onReport: () => void;
}) {
  return (
    <View style={[styles.qaCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.qaTop}>
        <View style={[styles.qaAvatar, { backgroundColor: colors.amber + "20" }]}>
          <Text style={[styles.qaAvatarText, { color: colors.amber }]}>{question.authorInitials}</Text>
        </View>
        <View style={styles.qaAuthorRow}>
          <Text style={[styles.qaAuthor, { color: colors.foreground }]}>{question.authorName}</Text>
          <Text style={[styles.qaTime, { color: colors.mutedForeground }]}>{timeAgo(question.publishedAt)}</Text>
        </View>
        <TouchableOpacity onPress={onReport} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Report this question">
          <Feather name="flag" size={15} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={onOpen}
        activeOpacity={0.7}
        style={styles.qaBody}
        accessibilityRole="button"
        accessibilityLabel={`${question.question}. ${question.answerCount} ${question.answerCount === 1 ? "answer" : "answers"}`}
      >
        <Text style={[styles.qaQuestion, { color: colors.foreground }]}>{question.question}</Text>

        {question.tags.length > 0 ? (
          <View style={styles.qaTags}>
            {question.tags.map((tag) => (
              <View key={tag} style={[styles.qaTag, { backgroundColor: colors.muted }]}>
                <Text style={[styles.qaTagText, { color: colors.mutedForeground }]}>{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </TouchableOpacity>

      <View style={[styles.qaFooter, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={styles.qaUpvote}
          onPress={onUpvote}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={question.viewerHasUpvoted ? "Remove upvote" : "Upvote this question"}
        >
          <Feather name="arrow-up" size={14} color={question.viewerHasUpvoted ? colors.amber : colors.mutedForeground} />
          <Text style={[styles.qaUpvoteText, { color: question.viewerHasUpvoted ? colors.amber : colors.mutedForeground }]}>
            {question.upvoteCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.qaAnswerCount}
          onPress={onOpen}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Read ${question.answerCount} ${question.answerCount === 1 ? "answer" : "answers"}`}
        >
          <Feather name="message-square" size={14} color={colors.mutedForeground} />
          <Text style={[styles.qaAnswerText, { color: colors.mutedForeground }]}>
            {question.answerCount} {question.answerCount === 1 ? "answer" : "answers"}
          </Text>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>
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
  tabInner: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 10 },
  tabLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  tabUnderline: { height: 2, width: "100%", borderTopLeftRadius: 2, borderTopRightRadius: 2 },

  alertSection: { borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 12, paddingTop: 12 },
  alertHeader: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, marginBottom: 10 },
  alertDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#dc2626" },
  alertHeaderLabel: { fontFamily: "Inter_700Bold", fontSize: 13 },
  alertScroll: { paddingHorizontal: 16, gap: 8 },
  alertCard: { width: 232, borderRadius: 14, borderWidth: 1, padding: 12, gap: 6 },
  alertIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  alertText: { fontFamily: "Inter_500Medium", fontSize: 12, lineHeight: 17 },
  alertMeta: { fontFamily: "Inter_400Regular", fontSize: 10 },

  filterRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  filterChipText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },

  composeCta: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, borderWidth: 1 },
  composeText: { fontFamily: "Inter_400Regular", fontSize: 13, flex: 1 },

  notice: { flexDirection: "row", alignItems: "flex-start", gap: 9, padding: 12, borderRadius: 12, borderWidth: 1 },
  noticeText: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17, flex: 1 },

  pulseList: { paddingHorizontal: 16, gap: 12, paddingBottom: 4 },
  pulseCard: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 10 },
  sponsoredStrip: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  sponsoredText: { fontFamily: "Inter_600SemiBold", fontSize: 10 },
  cardAuthorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  cardAvatarText: { fontFamily: "Inter_700Bold", fontSize: 16 },
  cardAuthorMeta: { flex: 1 },
  cardAuthorNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardAuthorName: { fontFamily: "Inter_600SemiBold", fontSize: 14, flexShrink: 1 },
  tierBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7 },
  tierBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 10 },
  cardMetaLine: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 2 },
  cardMore: { padding: 4 },
  cardCaption: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21 },
  cardMediaWrap: { borderRadius: 14, overflow: "hidden", position: "relative" },
  cardMedia: { width: "100%", height: 200 },
  cardPlayBtn: { position: "absolute", top: "50%", left: "50%", marginTop: -22, marginLeft: -22, width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
  provenance: { flexDirection: "row", alignItems: "center", gap: 6, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 9 },
  provenanceText: { fontFamily: "Inter_400Regular", fontSize: 11, flex: 1 },
  cardActions: { flexDirection: "row", alignItems: "center", gap: 18, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10 },
  cardAction: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 2 },
  cardActionCount: { fontFamily: "Inter_500Medium", fontSize: 12 },

  newsList: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  newsCard: { borderRadius: 16, borderWidth: 1, padding: 13, gap: 10 },
  newsTop: { flexDirection: "row", alignItems: "center", gap: 9 },
  newsIcon: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  newsSourceMeta: { flex: 1 },
  newsSource: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  newsProvenance: { fontFamily: "Inter_400Regular", fontSize: 10.5, marginTop: 1 },
  newsBody: { flexDirection: "row", gap: 11 },
  newsImage: { width: 88, height: 88, borderRadius: 12 },
  newsContent: { flex: 1, gap: 4 },
  newsHeadline: { fontFamily: "Inter_600SemiBold", fontSize: 14, lineHeight: 20 },
  newsSummary: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 18 },
  newsFooter: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  newsRead: { fontFamily: "Inter_600SemiBold", fontSize: 12 },

  qaCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  qaTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  qaAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  qaAvatarText: { fontFamily: "Inter_700Bold", fontSize: 12 },
  qaAuthorRow: { flex: 1 },
  qaBody: { gap: 10 },
  qaAuthor: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  qaTime: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 1 },
  qaQuestion: { fontFamily: "Inter_600SemiBold", fontSize: 15, lineHeight: 22 },
  qaTags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  qaTag: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  qaTagText: { fontFamily: "Inter_500Medium", fontSize: 11 },
  qaFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10 },
  qaUpvote: { flexDirection: "row", alignItems: "center", gap: 5 },
  qaUpvoteText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  qaAnswerCount: { flexDirection: "row", alignItems: "center", gap: 5 },
  qaAnswerText: { fontFamily: "Inter_400Regular", fontSize: 12 },
});
