import { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Platform,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";

import { useColors } from "@/hooks/useColors";
import {
  useGetEvents,
  useGetDeals,
  useGetPlaces,
} from "@workspace/api-client-react";
import { useCity } from "@/context/CityContext";

import { EventCard } from "@/components/EventCard";
import { DealCard } from "@/components/DealCard";
import { PlaceCard } from "@/components/PlaceCard";
import { SkeletonCard } from "@/components/SkeletonCard";

type Section = "all" | "places" | "dining" | "events" | "deals";

const FILTERS: { id: Section; label: string; icon: React.ComponentProps<typeof Feather>["name"] }[] = [
  { id: "all",     label: "All",      icon: "layers"   },
  { id: "places",  label: "Places",   icon: "map-pin"  },
  { id: "dining",  label: "Dining",   icon: "coffee"   },
  { id: "events",  label: "Events",   icon: "calendar" },
  { id: "deals",   label: "Deals",    icon: "tag"      },
];

export default function FeedsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedCity } = useCity();
  const params = useLocalSearchParams<{ section?: string }>();
  const [activeSection, setActiveSection] = useState<Section>("all");

  useEffect(() => {
    const s = params.section as Section | undefined;
    if (s && FILTERS.find((f) => f.id === s)) {
      setActiveSection(s);
    }
  }, [params.section]);

  const cityName = selectedCity?.name;
  const topPadding = Platform.OS === "web" ? 20 : insets.top + 4;
  const bottomPadding = Platform.OS === "web" ? 84 : 84 + insets.bottom;

  const { data: events, isLoading: eventsLoading, refetch: refetchEvents } =
    useGetEvents({ city: cityName });
  const { data: deals, isLoading: dealsLoading, refetch: refetchDeals } =
    useGetDeals({ city: cityName });
  const { data: allPlaces, isLoading: placesLoading, refetch: refetchPlaces } =
    useGetPlaces({ city: cityName });

  const onRefresh = () => { refetchEvents(); refetchDeals(); refetchPlaces(); };
  const isLoading = eventsLoading || dealsLoading || placesLoading;

  const diningPlaces = (allPlaces || []).filter(
    (p) => p.category === "food" || p.category === "restaurant"
  );
  const otherPlaces = (allPlaces || []).filter(
    (p) => p.category !== "food" && p.category !== "restaurant"
  );

  type FeedItem =
    | { kind: "event"; data: NonNullable<typeof events>[number] }
    | { kind: "deal";  data: NonNullable<typeof deals>[number]  }
    | { kind: "place"; data: NonNullable<typeof allPlaces>[number] };

  const buildFeed = (): FeedItem[] => {
    switch (activeSection) {
      case "events":
        return (events || []).map((e) => ({ kind: "event" as const, data: e }));
      case "deals":
        return (deals || []).map((d) => ({ kind: "deal" as const, data: d }));
      case "dining":
        return diningPlaces.map((p) => ({ kind: "place" as const, data: p }));
      case "places":
        return otherPlaces.map((p) => ({ kind: "place" as const, data: p }));
      default: {
        const items: FeedItem[] = [];
        const evList = events || [];
        const dlList = deals || [];
        const plList = allPlaces || [];
        const max = Math.max(evList.length, dlList.length, plList.length);
        for (let i = 0; i < max; i++) {
          if (i < plList.length) items.push({ kind: "place", data: plList[i] });
          if (i < evList.length) items.push({ kind: "event", data: evList[i] });
          if (i < dlList.length) items.push({ kind: "deal",  data: dlList[i] });
        }
        return items;
      }
    }
  };

  const feed = buildFeed();

  const renderItem = ({ item }: { item: FeedItem }) => {
    if (item.kind === "event") return <EventCard event={item.data} />;
    if (item.kind === "deal")  return <DealCard deal={item.data} />;
    return <PlaceCard place={item.data} />;
  };

  const renderHeader = () => (
    <View style={{ paddingTop: topPadding }}>
      {/* Title row */}
      <View style={styles.titleRow}>
        <View>
          <Text style={[styles.screenTitle, { color: colors.foreground }]}>Feeds</Text>
          {selectedCity && (
            <View style={styles.cityRow}>
              <Feather name="map-pin" size={11} color={colors.amber} />
              <Text style={[styles.cityName, { color: colors.mutedForeground }]}>
                {selectedCity.name}
              </Text>
            </View>
          )}
        </View>
        <View style={[styles.liveChip, { backgroundColor: "#ef4444" + "1a" }]}>
          <View style={styles.liveDot} />
          <Text style={[styles.liveText, { color: "#ef4444" }]}>Live</Text>
        </View>
      </View>

      {/* Filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        {FILTERS.map((f) => {
          const active = activeSection === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              style={[
                styles.filterPill,
                {
                  backgroundColor: active ? colors.amber : colors.card,
                  borderColor: active ? colors.amber : colors.border,
                },
              ]}
              onPress={() => setActiveSection(f.id)}
              activeOpacity={0.75}
            >
              <Feather name={f.icon} size={13} color={active ? "#fff" : colors.mutedForeground} />
              <Text style={[styles.filterLabel, { color: active ? "#fff" : colors.mutedForeground }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyWrap}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
          <Feather name="inbox" size={32} color={colors.mutedForeground} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nothing here yet</Text>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          Check back soon for updates in {selectedCity?.name ?? "your city"}.
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isLoading && feed.length === 0 ? (
        <View style={{ flex: 1 }}>
          {renderHeader()}
          {[180, 140, 180].map((h, i) => (
            <SkeletonCard key={i} height={h} style={styles.skeleton} />
          ))}
        </View>
      ) : (
        <FlatList
          data={feed}
          keyExtractor={(item, i) => `${item.kind}-${item.data.id}-${i}`}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={{ paddingBottom: bottomPadding }}
          showsVerticalScrollIndicator={false}
          onRefresh={onRefresh}
          refreshing={isLoading}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  skeleton: { marginHorizontal: 20, marginBottom: 16 },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  screenTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    marginBottom: 2,
  },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cityName: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  liveChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ef4444",
  },
  liveText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  filterScroll: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    paddingTop: 8,
    gap: 8,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  emptyWrap: { alignItems: "center", paddingTop: 60, paddingHorizontal: 40 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 20, marginBottom: 8 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 15, textAlign: "center", lineHeight: 22 },
});
