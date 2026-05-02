import { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  Platform,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useGetPlaces, useGetEvents, useGetDeals } from "@workspace/api-client-react";
import { useCity } from "@/context/CityContext";

import { PlaceCard } from "@/components/PlaceCard";
import { EventCard } from "@/components/EventCard";
import { DealCard } from "@/components/DealCard";

const QUICK_SEARCHES = ["Restaurants", "Attractions", "Hotels", "Nightlife", "Parks", "Concerts", "Shopping"];

type ResultItem =
  | { kind: "place"; data: any }
  | { kind: "event"; data: any }
  | { kind: "deal";  data: any };

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedCity } = useCity();
  const [query, setQuery] = useState("");

  const cityName = selectedCity?.name;
  const topPadding = Platform.OS === "web" ? 20 : insets.top + 8;
  const bottomPadding = Platform.OS === "web" ? 84 : 84 + insets.bottom;

  const { data: places } = useGetPlaces({ city: cityName });
  const { data: events } = useGetEvents({ city: cityName });
  const { data: deals }  = useGetDeals({ city: cityName });

  const results: ResultItem[] = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    const matchedPlaces: ResultItem[] = (places || [])
      .filter((p) =>
        p.name?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.address?.toLowerCase().includes(q)
      )
      .map((p) => ({ kind: "place" as const, data: p }));

    const matchedEvents: ResultItem[] = (events || [])
      .filter((e) =>
        e.title?.toLowerCase().includes(q) ||
        e.category?.toLowerCase().includes(q) ||
        e.venue?.toLowerCase().includes(q)
      )
      .map((e) => ({ kind: "event" as const, data: e }));

    const matchedDeals: ResultItem[] = (deals || [])
      .filter((d) =>
        d.title?.toLowerCase().includes(q) ||
        d.category?.toLowerCase().includes(q)
      )
      .map((d) => ({ kind: "deal" as const, data: d }));

    return [...matchedPlaces, ...matchedEvents, ...matchedDeals];
  }, [query, places, events, deals]);

  const renderItem = ({ item }: { item: ResultItem }) => {
    if (item.kind === "event") return <EventCard event={item.data} />;
    if (item.kind === "deal")  return <DealCard deal={item.data} />;
    return <PlaceCard place={item.data} />;
  };

  const renderResultLabel = () => {
    if (!query.trim()) return null;
    return (
      <Text style={[styles.resultCount, { color: colors.mutedForeground }]}>
        {results.length} result{results.length !== 1 ? "s" : ""} for "{query}"
      </Text>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search bar — always pinned at top */}
      <View style={[styles.topSection, { paddingTop: topPadding, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            style={[styles.input, { color: colors.foreground }]}
            placeholder={`Search in ${selectedCity?.name ?? "city"}…`}
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x-circle" size={17} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Empty state — quick searches */}
      {!query.trim() ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: bottomPadding }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.quickLabel, { color: colors.mutedForeground }]}>QUICK SEARCHES</Text>
          <View style={styles.chipsWrap}>
            {QUICK_SEARCHES.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setQuery(s)}
                activeOpacity={0.75}
              >
                <Feather name="search" size={13} color={colors.amber} />
                <Text style={[styles.chipText, { color: colors.foreground }]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.quickLabel, { color: colors.mutedForeground, marginTop: 8 }]}>CATEGORIES</Text>
          <View style={styles.catChipsWrap}>
            {["food", "attraction", "essentials", "nightlife"].map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.catChip, { backgroundColor: colors.amber + "1a" }]}
                onPress={() => setQuery(cat)}
                activeOpacity={0.75}
              >
                <Text style={[styles.catChipText, { color: colors.amber }]}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item, i) => `${item.kind}-${item.data.id}-${i}`}
          renderItem={renderItem}
          ListHeaderComponent={renderResultLabel}
          contentContainerStyle={{ paddingBottom: bottomPadding }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.noResults}>
              <View style={[styles.noResultsIcon, { backgroundColor: colors.muted }]}>
                <Feather name="search" size={28} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.noResultsTitle, { color: colors.foreground }]}>No results found</Text>
              <Text style={[styles.noResultsText, { color: colors.mutedForeground }]}>
                Try a different keyword or switch city.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    padding: 0,
  },
  resultCount: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  quickLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  catChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 4,
  },
  catChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  catChipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  noResults: { alignItems: "center", paddingTop: 60, paddingHorizontal: 40 },
  noResultsIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  noResultsTitle: { fontFamily: "Inter_700Bold", fontSize: 20, marginBottom: 8 },
  noResultsText: { fontFamily: "Inter_400Regular", fontSize: 15, textAlign: "center", lineHeight: 22 },
});
