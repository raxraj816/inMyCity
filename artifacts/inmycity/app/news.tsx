import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useCity } from "@/context/CityContext";
import { EmptyState, ErrorState } from "@/components/ListStates";
import { SkeletonCard } from "@/components/SkeletonCard";
import { NewsShorts } from "@/components/NewsShorts";
import { ReportContentSheet, type ReportTarget } from "@/components/ReportContentSheet";
import { getGetNewsItemsQueryKey, useGetNewsItems } from "@workspace/api-client-react";

/**
 * The short-news reader, on its own screen.
 *
 * It used to be a tab, which meant it competed with Pulse for the same space and could not use
 * the full height a one-story-per-screen layout needs. Pulse carries the headlines now and this
 * is what opens behind them — `?start=<id>` so tapping the third headline begins at the third
 * story rather than back at the top.
 */
export default function NewsScreen() {
  const { start } = useLocalSearchParams<{ start?: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedCity } = useCity();

  const [reportTarget, setReportTarget] = React.useState<ReportTarget | null>(null);

  const params = { city: selectedCity?.name };
  const { data: items = [], isLoading, isError, error, refetch } = useGetNewsItems(params, {
    query: { enabled: Boolean(selectedCity?.name), queryKey: getGetNewsItemsQueryKey(params) },
  });

  const topPadding = Platform.OS === "web" ? 14 : insets.top + 6;
  const startIndex = Math.max(0, items.findIndex((item) => String(item.id) === start));

  const header = (
    <View style={[styles.header, { paddingTop: topPadding, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Go back">
        <Feather name="arrow-left" size={21} color={colors.foreground} />
      </TouchableOpacity>
      <View style={styles.headerText}>
        <Text style={[styles.title, { color: colors.foreground }]}>Local news</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
          {selectedCity?.name ?? "Your city"} · swipe for the next story
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {header}

      {isError ? (
        <ErrorState error={error} onRetry={() => refetch()} subject="local news" />
      ) : isLoading ? (
        <View style={styles.loading}>
          <SkeletonCard height={320} />
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          icon="bell"
          title="No news published yet"
          message={`We only show ${selectedCity?.name ?? "local"} news once an editor has checked the source. Nothing has cleared review today.`}
        />
      ) : (
        <NewsShorts
          items={items}
          initialIndex={startIndex}
          bottomInset={Platform.OS === "web" ? 0 : insets.bottom}
          onReport={(item) => setReportTarget({ targetType: "news_item", targetId: item.id, label: item.headline })}
        />
      )}

      <ReportContentSheet target={reportTarget} onClose={() => setReportTarget(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: { padding: 4 },
  headerText: { flex: 1 },
  title: { fontFamily: "Inter_700Bold", fontSize: 17 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 1 },
  loading: { padding: 16 },
});
