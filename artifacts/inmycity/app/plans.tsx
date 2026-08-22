import React, { useState } from "react";
import { FlatList, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useCity } from "@/context/CityContext";
import { useGetRecommendations } from "@workspace/api-client-react";
import type { Recommendation } from "@workspace/api-client-react";

import { ScreenHeader } from "@/components/ScreenHeader";
import { SkeletonCard } from "@/components/SkeletonCard";
import { EmptyState, ErrorState, LIST_PERFORMANCE_PROPS, useListRefreshControl } from "@/components/ListStates";

const ACCENT = "#0369a1";

/**
 * One screen for every "decide something for me" entry point. The engine behind
 * `/recommendations` already understands mood, neighbourhood, budget, rain and transit,
 * so each home-screen decision card is this screen with different query params rather
 * than a different list.
 */
export default function PlansScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedCity } = useCity();

  const params = useLocalSearchParams<{
    mood?: string;
    neighborhood?: string;
    budget?: string;
    weatherMode?: string;
    transitAccess?: string;
    title?: string;
  }>();

  const [zone, setZone] = useState<string | null>(params.neighborhood ?? null);

  const budget = params.budget ? Number(params.budget) : undefined;

  const { data, isLoading, isRefetching, error, refetch } = useGetRecommendations({
    city: selectedCity?.name,
    mood: params.mood,
    neighborhood: zone ?? undefined,
    budget: Number.isFinite(budget) ? budget : undefined,
    weatherMode: params.weatherMode as "rain-safe" | undefined,
    transitAccess: params.transitAccess,
  });

  const topPadding = Math.max(insets.top, 20);
  const bottomPadding = Platform.OS === "web" ? 84 : 84 + insets.bottom;
  const refreshControl = useListRefreshControl(isRefetching, refetch, ACCENT);

  const zones = data?.neighborhoods ?? [];

  const ListHeader = (
    <View style={styles.header}>
      <Text style={[styles.heading, { color: colors.foreground }]}>{params.title ?? data?.title ?? "Plans"}</Text>
      {zones.length > 0 && (
        <FlatList
          horizontal
          data={[null, ...zones.map((z) => z.id)]}
          keyExtractor={(item) => item ?? "all"}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          renderItem={({ item }) => {
            const selected = zone === item;
            const label = item ? (zones.find((z) => z.id === item)?.name ?? item) : "Anywhere";
            return (
              <TouchableOpacity
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected ? colors.navy : colors.card,
                    borderColor: selected ? colors.navy : colors.border,
                  },
                ]}
                onPress={() => setZone(item)}
                activeOpacity={0.7}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={label}
              >
                <Text style={[styles.chipText, { color: selected ? "#fff" : colors.foreground }]}>{label}</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );

  const renderItem = ({ item }: { item: Recommendation }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push(item.route as any)}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. ${item.reason}`}
      accessibilityHint={item.actionLabel}
    >
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback, { backgroundColor: ACCENT + "1a" }]}>
          <Feather name="compass" size={20} color={ACCENT} />
        </View>
      )}

      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={[styles.cardMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
          {item.scoreText}
          {item.neighborhood ? ` · ${item.neighborhood}` : ""}
        </Text>
        <Text style={[styles.cardReason, { color: colors.mutedForeground }]} numberOfLines={2}>
          {item.reason}
        </Text>
        <Text style={[styles.cardAction, { color: ACCENT }]}>{item.actionLabel}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title={params.title ?? "Plans"} topPadding={topPadding} />

      {error ? (
        <ErrorState error={error} onRetry={refetch} accent={ACCENT} subject="plans" />
      ) : isLoading && !data ? (
        <>
          {ListHeader}
          <View style={styles.loadingArea}>
            <SkeletonCard height={104} style={styles.skeleton} />
            <SkeletonCard height={104} style={styles.skeleton} />
            <SkeletonCard height={104} style={styles.skeleton} />
          </View>
        </>
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={{ paddingBottom: bottomPadding }}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
          {...LIST_PERFORMANCE_PROPS}
          ListEmptyComponent={
            !isLoading ? (
              <EmptyState
                icon="compass"
                title="No plans matched"
                accent={ACCENT}
                message={
                  zone
                    ? "Try another neighbourhood, or widen the search to anywhere."
                    : `Nothing to suggest in ${selectedCity?.name ?? "this city"} right now.`
                }
                action={zone ? { label: "Search anywhere", onPress: () => setZone(null) } : undefined}
              />
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 14, gap: 12 },
  heading: { fontFamily: "Inter_600SemiBold", fontSize: 18, paddingHorizontal: 20 },
  chipRow: { paddingHorizontal: 20, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  chipText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  loadingArea: { flex: 1, paddingTop: 12 },
  skeleton: { marginHorizontal: 20, marginBottom: 14 },
  card: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 20,
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  thumb: { width: 72, height: 72, borderRadius: 10 },
  thumbFallback: { alignItems: "center", justifyContent: "center" },
  cardBody: { flex: 1, gap: 3 },
  cardTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  cardMeta: { fontFamily: "Inter_400Regular", fontSize: 11 },
  cardReason: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 16 },
  cardAction: { fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 2 },
});
