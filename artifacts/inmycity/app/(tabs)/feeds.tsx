import React, { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, Platform, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { EmptyState, ErrorState, useListRefreshControl } from "@/components/ListStates";
import { SkeletonCard } from "@/components/SkeletonCard";
import { AiChatFab } from "@/components/AiChatFab";
import { ReportContentSheet, type ReportTarget } from "@/components/ReportContentSheet";
import { FeedCard } from "@/components/feed/FeedCard";
import { useCity } from "@/context/CityContext";
import {
  applyPulseReaction,
  usePulseFeed,
  useGetCommunityPolicy,
  useTogglePulseReaction,
  type FeedItem,
} from "@workspace/api-client-react";

/**
 * Pulse — what is happening in the city, as one column you scroll.
 *
 * This used to be a digest: four labelled sections, each a horizontal rail of small tiles. The
 * rails were the problem. Nothing on the page was ever the main thing, an offer ending tonight
 * got the same 172 points as one ending in a fortnight, and the whole page ran out after
 * twenty-six items. It is a feed now — full-width cards, one after another, paged.
 *
 * There are no filter chips and no tabs, which is a deliberate constraint rather than an
 * omission: a reader who does not like card three has nothing to rescue it with, so the
 * ordering on the server has to be right. Anyone who wants only offers already has the Deals
 * screen; repeating that control here would be a second, worse version of it.
 */
export default function FeedsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { selectedCity } = useCity();

  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);

  const cityName = selectedCity?.name;
  const topPadding = Platform.OS === "web" ? 20 : insets.top + 4;
  const bottomPad = Platform.OS === "web" ? 96 : 96 + insets.bottom;

  const feed = usePulseFeed({ city: cityName ?? "" }, { enabled: Boolean(cityName) });
  const { data: policy } = useGetCommunityPolicy();

  const toggleReaction = useTogglePulseReaction();
  const refreshControl = useListRefreshControl(feed.isRefetching, () => feed.refetch());

  const items = useMemo(() => (feed.data ?? []).flatMap((page) => page.items), [feed.data]);

  /** Where a card goes when it is tapped. A post has no detail screen; it is read in place. */
  const open = useCallback(
    (item: FeedItem) => {
      switch (item.kind) {
        case "news":
          router.push(`/news?start=${item.id}` as never);
          return;
        case "event":
          router.push(`/event/${item.id}` as never);
          return;
        case "deal":
          router.push(`/deal/${item.id}` as never);
          return;
        case "ad":
          // A placement always points at something the app holds, never at an arbitrary URL.
          if (item.targetKind && item.targetId) {
            router.push(`/${item.targetKind}/${item.targetId}` as never);
          }
          return;
        case "post":
          return;
      }
    },
    [router],
  );

  const header = (
    <View
      style={[
        styles.header,
        { paddingTop: topPadding, backgroundColor: colors.background, borderBottomColor: colors.border },
      ]}
    >
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

  if (feed.isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {header}
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: bottomPad }}>
          {[0, 1, 2].map((key) => (
            <SkeletonCard key={key} />
          ))}
        </ScrollView>
      </View>
    );
  }

  if (feed.isError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {header}
        <ErrorState error={feed.error} onRetry={() => feed.refetch()} subject="Pulse" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {header}

      {items.length === 0 ? (
        <EmptyState
          icon="zap"
          title={`Nothing happening in ${cityName} yet`}
          message="News, offers and events appear here as they are published. Pull down to check again."
        />
      ) : (
        <FlashList
          data={items}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <FeedCard
              item={item}
              city={cityName}
              onOpen={() => open(item)}
              onToggleReaction={(kind) => {
                // Paint it now and let the request follow. Invalidating instead would refetch
                // every page the reader has already scrolled through.
                applyPulseReaction(queryClient, item.id, kind);
                toggleReaction.mutate({ id: item.id, data: { kind } });
              }}
              onReport={() =>
                setReportTarget({
                  targetType: item.kind === "news" ? "news_item" : "pulse_post",
                  targetId: item.id,
                  label: item.body ?? item.title,
                })
              }
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={
            policy?.submissionsEnabled ? <Composer colors={colors} onPress={() => router.push("/pulse/compose" as never)} /> : null
          }
          ListFooterComponent={
            <FeedFooter
              colors={colors}
              loading={feed.isFetchingNextPage}
              done={!feed.hasNextPage}
              cityName={cityName}
            />
          }
          contentContainerStyle={{ paddingTop: 14, paddingBottom: bottomPad, paddingHorizontal: 16 }}
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={false}
          onEndReachedThreshold={0.6}
          onEndReached={() => {
            // React Query will happily queue a second page request while the first is in
            // flight, which double-counts the cursor and skips a page.
            if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
          }}
        />
      )}

      <ReportContentSheet target={reportTarget} onClose={() => setReportTarget(null)} />
      <AiChatFab />
    </View>
  );
}

type Colors = ReturnType<typeof useColors>;

/**
 * The composer row, shown only while submissions are actually open.
 *
 * `POST /api/pulse` answers 503 until moderation is staffed, so offering the box before then
 * would be an invitation to write something the app then refuses to take.
 */
function Composer({ colors, onPress }: { colors: Colors; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.composer, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Post something to Pulse"
    >
      <View style={[styles.composerAvatar, { backgroundColor: colors.amber + "1a" }]}>
        <Feather name="edit-2" size={14} color={colors.amber} />
      </View>
      <Text style={[styles.composerText, { color: colors.mutedForeground }]}>Seen something? Tell the city.</Text>
    </TouchableOpacity>
  );
}

/** The end of the scroll. Saying so beats a spinner that never resolves. */
function FeedFooter({
  colors,
  loading,
  done,
  cityName,
}: {
  colors: Colors;
  loading: boolean;
  done: boolean;
  cityName: string;
}) {
  if (loading) {
    return (
      <View style={styles.footer}>
        <ActivityIndicator color={colors.amber} />
      </View>
    );
  }

  if (!done) return <View style={styles.footer} />;

  return (
    <View style={styles.footer}>
      <Feather name="check-circle" size={18} color={colors.mutedForeground} />
      <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
        You're all caught up on {cityName}.
      </Text>
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
  liveChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 4,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#dc2626" },
  liveText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#dc2626" },

  separator: { height: 14 },

  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  composerAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  composerText: { fontFamily: "Inter_400Regular", fontSize: 14 },

  footer: { alignItems: "center", justifyContent: "center", gap: 8, paddingTop: 22, paddingBottom: 8, minHeight: 44 },
  footerText: { fontFamily: "Inter_500Medium", fontSize: 13 },
});
