import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, FlatList, TextInput
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useGetTransitLines } from "@workspace/api-client-react";
import { useCity } from "@/context/CityContext";
import { EmptyState, ErrorState, LIST_PERFORMANCE_PROPS, useListRefreshControl } from "@/components/ListStates";
import { ScreenHeader } from "@/components/ScreenHeader";

const TYPE_FILTERS = [
  { id: "all", label: "All" },
  { id: "metro", label: "Metro" },
  { id: "suburban_rail", label: "Train" },
  { id: "bus", label: "Bus" },
];

const TYPE_ICONS: Record<string, React.ComponentProps<typeof Feather>["name"]> = {
  metro: "zap",
  suburban_rail: "minus-circle",
  bus: "truck",
  tram: "activity",
  ferry: "anchor",
};

const TYPE_LABELS: Record<string, string> = {
  metro: "Metro",
  suburban_rail: "Suburban Rail",
  bus: "Bus",
  tram: "Tram",
  ferry: "Ferry",
};

export default function TransitScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedCity } = useCity();
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchText, setSearchText] = useState("");

  const { data: lines = [], isLoading, isRefetching, error, refetch } = useGetTransitLines({
    city: selectedCity?.name,
    type: activeFilter !== "all" ? activeFilter : undefined,
  });

  const refreshControl = useListRefreshControl(isRefetching, refetch);

  const isLocal = selectedCity?.name === "Mumbai" || selectedCity?.name === "Bangalore";
  const currencySymbol = isLocal ? "₹" : "$";

  const filtered = searchText.trim()
    ? lines.filter(l =>
        l.name.toLowerCase().includes(searchText.toLowerCase()) ||
        l.from.toLowerCase().includes(searchText.toLowerCase()) ||
        l.to.toLowerCase().includes(searchText.toLowerCase()) ||
        l.stops.some(s => s.toLowerCase().includes(searchText.toLowerCase()))
      )
    : lines;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Transit"
        topPadding={Math.max(insets.top, 20)}
        rightElement={
          <TouchableOpacity
            style={[styles.planBtn, { backgroundColor: "#0e74901a" }]}
            onPress={() => router.push("/transit/plan" as any)}
          >
            <Feather name="map" size={18} color="#0e7490" />
          </TouchableOpacity>
        }
      />

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search lines, stations..."
          placeholderTextColor={colors.mutedForeground}
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText("")}>
            <Feather name="x" size={14} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={styles.filtersContent}>
        {TYPE_FILTERS.map(f => (
          <TouchableOpacity
            key={f.id}
            style={[styles.pill, { backgroundColor: activeFilter === f.id ? "#0e7490" : colors.card, borderColor: activeFilter === f.id ? "#0e7490" : colors.border }]}
            onPress={() => setActiveFilter(f.id)}
          >
            <Text style={[styles.pillText, { color: activeFilter === f.id ? "#fff" : colors.foreground }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Route Planner CTA */}
      <TouchableOpacity
        style={[styles.plannerCta, { backgroundColor: "#0e7490" }]}
        onPress={() => router.push("/transit/plan" as any)}
        activeOpacity={0.85}
      >
        <View style={styles.plannerCtaLeft}>
          <View style={[styles.plannerIconBox, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
            <Feather name="navigation" size={18} color="#fff" />
          </View>
          <View>
            <Text style={styles.plannerCtaTitle}>Plan your journey</Text>
            <Text style={styles.plannerCtaSub}>Find the best route from A to B</Text>
          </View>
        </View>
        <Feather name="arrow-right" size={18} color="#fff" />
      </TouchableOpacity>

      {/* Lines List */}
      {error ? (
        <ErrorState error={error} onRetry={refetch} subject="transit lines" />
      ) : isLoading ? (
        <View style={styles.loadingContainer}>
          {[1, 2, 3, 4].map(i => (
            <View key={i} style={[styles.skeletonCard, { backgroundColor: colors.card }]} />
          ))}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
          {...LIST_PERFORMANCE_PROPS}
          ListEmptyComponent={
            <EmptyState
              icon="share-2"
              title={searchText ? "No lines match your search" : "No transit lines found"}
              message={
                searchText
                  ? "Try a station name, or clear the search to see every line."
                  : `No lines listed for ${selectedCity?.name ?? "this city"} yet.`
              }
            />
          }
          renderItem={({ item }) => {
            const icon = TYPE_ICONS[item.type] ?? "share-2";
            const typeLabel = TYPE_LABELS[item.type] ?? item.type;
            return (
              <TouchableOpacity
                style={[styles.lineCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push(`/transit/line/${item.id}` as any)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`${item.name}, ${typeLabel}, from ${item.from} to ${item.to}`}
                accessibilityHint="Opens this line"
              >
                {/* Color stripe + type badge */}
                <View style={[styles.lineStripe, { backgroundColor: item.color }]} />
                <View style={styles.lineBody}>
                  <View style={styles.lineTop}>
                    <View style={[styles.typeBadge, { backgroundColor: item.color + "20" }]}>
                      <Feather name={icon} size={11} color={item.color} />
                      <Text style={[styles.typeText, { color: item.color }]}>{typeLabel}</Text>
                    </View>
                    {item.shortName && (
                      <View style={[styles.shortNameBadge, { backgroundColor: item.color, }]}>
                        <Text style={styles.shortNameText}>{item.shortName}</Text>
                      </View>
                    )}
                  </View>

                  <Text style={[styles.lineName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>

                  {/* Route: from → to */}
                  <View style={styles.routeRow}>
                    <View style={[styles.stationDot, { backgroundColor: item.color }]} />
                    <Text style={[styles.stationText, { color: colors.foreground }]} numberOfLines={1}>{item.from}</Text>
                  </View>
                  <View style={styles.routeConnector}>
                    <View style={[styles.routeLine, { backgroundColor: item.color + "60" }]} />
                    <Text style={[styles.stopsCount, { color: colors.mutedForeground }]}>
                      {item.stops.length} stops
                    </Text>
                  </View>
                  <View style={styles.routeRow}>
                    <View style={[styles.stationSquare, { borderColor: item.color }]} />
                    <Text style={[styles.stationText, { color: colors.foreground }]} numberOfLines={1}>{item.to}</Text>
                  </View>

                  {/* Footer: fare, frequency, hours */}
                  <View style={[styles.lineFooter, { borderTopColor: colors.border }]}>
                    {item.fare != null && (
                      <View style={styles.metaChip}>
                        <Feather name="credit-card" size={11} color={colors.mutedForeground} />
                        <Text style={[styles.metaChipText, { color: colors.mutedForeground }]}>
                          {currencySymbol}{item.fare}+
                        </Text>
                      </View>
                    )}
                    {item.frequency && (
                      <View style={styles.metaChip}>
                        <Feather name="refresh-cw" size={11} color={colors.mutedForeground} />
                        <Text style={[styles.metaChipText, { color: colors.mutedForeground }]}>{item.frequency}</Text>
                      </View>
                    )}
                    {item.firstTrain && (
                      <View style={styles.metaChip}>
                        <Feather name="clock" size={11} color={colors.mutedForeground} />
                        <Text style={[styles.metaChipText, { color: colors.mutedForeground }]}>
                          {item.firstTrain} – {item.lastTrain}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },
  planBtn: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 14 },
  filtersScroll: { flexGrow: 0, flexShrink: 0 },
  filtersContent: { flexDirection: "row", flexWrap: "nowrap", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  pillText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  plannerCta: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16,
  },
  plannerCtaLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  plannerIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  plannerCtaTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },
  plannerCtaSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 1 },
  loadingContainer: { padding: 16, gap: 12 },
  skeletonCard: { height: 160, borderRadius: 16 },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  emptyText: { fontFamily: "Inter_500Medium", fontSize: 15, textAlign: "center" },
  listContent: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  lineCard: {
    borderRadius: 18, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    ...Platform.select({
      web: { boxShadow: "0 2px 10px rgba(0,0,0,0.07)" },
      default: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3 },
    }),
  },
  lineStripe: { width: 5 },
  lineBody: { flex: 1, padding: 14, gap: 6 },
  lineTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  typeBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  typeText: { fontFamily: "Inter_600SemiBold", fontSize: 10 },
  shortNameBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  shortNameText: { fontFamily: "Inter_700Bold", fontSize: 10, color: "#fff" },
  lineName: { fontFamily: "Inter_700Bold", fontSize: 15, marginBottom: 4 },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  stationDot: { width: 10, height: 10, borderRadius: 5 },
  stationSquare: { width: 10, height: 10, borderRadius: 2, borderWidth: 2 },
  stationText: { fontFamily: "Inter_500Medium", fontSize: 13, flex: 1 },
  routeConnector: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 2 },
  routeLine: { width: 2, height: 14, marginLeft: 4, borderRadius: 1 },
  stopsCount: { fontFamily: "Inter_400Regular", fontSize: 11 },
  lineFooter: {
    flexDirection: "row", flexWrap: "wrap", gap: 10, paddingTop: 10,
    marginTop: 4, borderTopWidth: StyleSheet.hairlineWidth,
  },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaChipText: { fontFamily: "Inter_400Regular", fontSize: 11 },
});
