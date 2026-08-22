import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useGetItineraries, type Itinerary } from "@workspace/api-client-react";
import { useCity } from "@/context/CityContext";
import { SkeletonCard } from "@/components/SkeletonCard";
import { EmptyState, ErrorState, LIST_PERFORMANCE_PROPS, useListRefreshControl } from "@/components/ListStates";
import { ScreenHeader } from "@/components/ScreenHeader";

const DURATION_FILTERS = [
  { id: "all", label: "All" },
  { id: "1", label: "1 Day" },
  { id: "2", label: "2 Days" },
  { id: "3", label: "3 Days" },
  { id: "4", label: "4 Days" },
];

const ACCENT = "#4f46e5";

export default function ItinerariesScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedCity } = useCity();
  const [activeFilter, setActiveFilter] = useState("all");

  const { data: itineraries = [], isLoading, isRefetching, error, refetch } = useGetItineraries({
    city: selectedCity?.name,
  });

  const refreshControl = useListRefreshControl(isRefetching, refetch, ACCENT);

  const filtered = activeFilter === "all"
    ? itineraries
    : itineraries.filter(i => String(i.durationDays) === activeFilter);

  const renderCard = ({ item }: { item: Itinerary }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push(`/itinerary/${item.id}` as any)}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${item.durationDays} day guide`}
      accessibilityHint="Opens this guide"
    >
      <View style={styles.imageBox}>
        {item.coverImageUrl
          ? <Image source={{ uri: item.coverImageUrl }} style={styles.image} contentFit="cover" transition={200} />
          : <View style={[styles.image, { backgroundColor: colors.navy }]} />
        }
        <View style={[styles.dayBadge, { backgroundColor: ACCENT }]}>
          <Text style={styles.dayBadgeText}>{item.durationDays} Day{item.durationDays !== 1 ? "s" : ""}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.cityLabel, { color: ACCENT }]} numberOfLines={1}>
          {item.city}
        </Text>
        <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={2}>
          {item.title}
        </Text>
        {item.description ? (
          <Text style={[styles.cardDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        <View style={styles.cardFooter}>
          <View style={styles.metaItem}>
            <Feather name="map-pin" size={12} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {item.stops?.length ?? 0} stops
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Curated Guides" topPadding={Math.max(insets.top, 20)} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {DURATION_FILTERS.map(f => {
          const active = activeFilter === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              style={[styles.pill, { backgroundColor: active ? ACCENT : colors.card, borderColor: active ? ACCENT : colors.border }]}
              onPress={() => setActiveFilter(f.id)}
            >
              <Text style={[styles.pillText, { color: active ? "#fff" : colors.foreground }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {error ? (
        <ErrorState error={error} onRetry={refetch} accent={ACCENT} subject="guides" />
      ) : isLoading ? (
        <View style={styles.loadingContainer}>
          {[1, 2, 3].map(i => <SkeletonCard key={i} height={220} style={styles.skeleton} />)}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          renderItem={renderCard}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
          {...LIST_PERFORMANCE_PROPS}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <EmptyState
              icon="map"
              title="No guides found"
              accent={ACCENT}
              message={
                activeFilter !== "all"
                  ? `No ${activeFilter}-day guides for ${selectedCity?.name ?? "this city"} yet.`
                  : `No curated guides for ${selectedCity?.name ?? "this city"} yet.`
              }
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterScroll: { flexGrow: 0, flexShrink: 0 },
  filterContent: { paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  pillText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  loadingContainer: { padding: 20, gap: 12 },
  skeleton: { marginBottom: 4 },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 40 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 20 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 15, textAlign: "center", lineHeight: 22 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    ...Platform.select({
      web: { boxShadow: "0 2px 10px rgba(0,0,0,0.08)" },
      default: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 },
    }),
  },
  imageBox: { height: 180, position: "relative" },
  image: { width: "100%", height: "100%" },
  dayBadge: { position: "absolute", bottom: 12, left: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  dayBadgeText: { fontFamily: "Inter_700Bold", fontSize: 12, color: "#fff" },
  cardBody: { padding: 16, gap: 4 },
  cityLabel: { fontFamily: "Inter_700Bold", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  cardTitle: { fontFamily: "Inter_700Bold", fontSize: 18, lineHeight: 24 },
  cardDesc: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18, marginTop: 2 },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontFamily: "Inter_400Regular", fontSize: 12 },
});
