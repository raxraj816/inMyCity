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
import {
  useGetPlaces,
  useGetEvents,
  useGetDeals,
  useGetHotels,
  useGetActivities,
  useGetMovies,
} from "@workspace/api-client-react";
import { useCity } from "@/context/CityContext";

import { PlaceCard } from "@/components/PlaceCard";
import { EventCard } from "@/components/EventCard";
import { DealCard } from "@/components/DealCard";

const QUICK_SEARCHES = ["Restaurants", "Parks", "Hotels", "Concerts", "Shopping", "Gyms", "Movies"];

type ResultKind = "place" | "event" | "deal" | "hotel" | "activity" | "movie";
type ResultItem =
  | { kind: "place";    data: any }
  | { kind: "event";    data: any }
  | { kind: "deal";     data: any }
  | { kind: "hotel";    data: any }
  | { kind: "activity"; data: any }
  | { kind: "movie";    data: any };

type FilterKind = "all" | ResultKind;

const FILTER_TABS: { id: FilterKind; label: string }[] = [
  { id: "all",      label: "All"        },
  { id: "place",    label: "Places"     },
  { id: "event",    label: "Events"     },
  { id: "hotel",    label: "Hotels"     },
  { id: "activity", label: "Activities" },
  { id: "movie",    label: "Movies"     },
  { id: "deal",     label: "Deals"      },
];

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedCity } = useCity();
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<FilterKind>("all");

  const cityName = selectedCity?.name;
  const topPadding = Platform.OS === "web" ? 20 : insets.top + 8;
  const bottomPadding = Platform.OS === "web" ? 84 : 84 + insets.bottom;

  const { data: places }     = useGetPlaces({ city: cityName });
  const { data: events }     = useGetEvents({ city: cityName });
  const { data: deals }      = useGetDeals({ city: cityName });
  const { data: hotels }     = useGetHotels({ city: cityName });
  const { data: activities } = useGetActivities({ city: cityName });
  const { data: movies }     = useGetMovies({ city: cityName });

  const results: ResultItem[] = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const matchedPlaces: ResultItem[] = (places || [])
      .filter((p) =>
        p.name?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.address?.toLowerCase().includes(q) ||
        p.tags?.some((t: string) => t.toLowerCase().includes(q))
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
        d.category?.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q)
      )
      .map((d) => ({ kind: "deal" as const, data: d }));

    const matchedHotels: ResultItem[] = (hotels || [])
      .filter((h) =>
        h.name?.toLowerCase().includes(q) ||
        h.address?.toLowerCase().includes(q) ||
        h.tags?.some((t: string) => t.toLowerCase().includes(q))
      )
      .map((h) => ({ kind: "hotel" as const, data: h }));

    const matchedActivities: ResultItem[] = (activities || [])
      .filter((a) =>
        a.name?.toLowerCase().includes(q) ||
        a.category?.toLowerCase().includes(q) ||
        a.tags?.some((t: string) => t.toLowerCase().includes(q))
      )
      .map((a) => ({ kind: "activity" as const, data: a }));

    const matchedMovies: ResultItem[] = (movies || [])
      .filter((m) =>
        m.title?.toLowerCase().includes(q) ||
        m.genre?.toLowerCase().includes(q) ||
        m.director?.toLowerCase().includes(q)
      )
      .map((m) => ({ kind: "movie" as const, data: m }));

    return [
      ...matchedPlaces,
      ...matchedEvents,
      ...matchedHotels,
      ...matchedActivities,
      ...matchedMovies,
      ...matchedDeals,
    ];
  }, [query, places, events, deals, hotels, activities, movies]);

  const filtered = useMemo(() =>
    kindFilter === "all" ? results : results.filter((r) => r.kind === kindFilter),
    [results, kindFilter]
  );

  const renderItem = ({ item }: { item: ResultItem }) => {
    if (item.kind === "event")    return <EventCard event={item.data} />;
    if (item.kind === "deal")     return <DealCard deal={item.data} />;
    if (item.kind === "hotel")    return <PlaceCard place={{ ...item.data, category: "hotel" }} />;
    if (item.kind === "activity") return <PlaceCard place={{ ...item.data, category: "activity" }} />;
    if (item.kind === "movie") {
      return (
        <View style={[styles.movieCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.movieTitle, { color: colors.foreground }]} numberOfLines={1}>
            {item.data.title}
          </Text>
          <Text style={[styles.movieMeta, { color: colors.mutedForeground }]}>
            {[item.data.genre, item.data.language].filter(Boolean).join(" · ")}
          </Text>
          {item.data.rating != null && (
            <Text style={[styles.movieRating, { color: colors.mutedForeground }]}>
              ⭐ {Number(item.data.rating).toFixed(1)}
            </Text>
          )}
        </View>
      );
    }
    return <PlaceCard place={item.data} />;
  };

  const kindCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of results) {
      counts[r.kind] = (counts[r.kind] ?? 0) + 1;
    }
    return counts;
  }, [results]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search bar */}
      <View style={[styles.topSection, { paddingTop: topPadding, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            style={[styles.input, { color: colors.foreground }]}
            placeholder={`Search in ${selectedCity?.name ?? "city"}…`}
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={(t) => { setQuery(t); setKindFilter("all"); }}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(""); setKindFilter("all"); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x-circle" size={17} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {/* Kind filter pills — shown only when there are results */}
        {query.trim() && results.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {FILTER_TABS.filter((f) => f.id === "all" || (kindCounts[f.id] ?? 0) > 0).map((f) => (
              <TouchableOpacity
                key={f.id}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: kindFilter === f.id ? colors.amber : colors.card,
                    borderColor: kindFilter === f.id ? colors.amber : colors.border,
                  },
                ]}
                onPress={() => setKindFilter(f.id)}
                activeOpacity={0.75}
              >
                <Text style={[styles.filterText, { color: kindFilter === f.id ? "#fff" : colors.foreground }]}>
                  {f.label}
                  {f.id !== "all" && kindCounts[f.id] ? ` (${kindCounts[f.id]})` : ""}
                  {f.id === "all" && results.length ? ` (${results.length})` : ""}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
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
            {["food", "attraction", "nightlife", "hotels", "activities", "movies"].map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.catChip, { backgroundColor: colors.amber + "1a" }]}
                onPress={() => setQuery(cat)}
                activeOpacity={0.75}
              >
                <Text style={[styles.catChipText, { color: colors.amber }]}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, i) => `${item.kind}-${item.data.id}-${i}`}
          renderItem={renderItem}
          ListHeaderComponent={
            <Text style={[styles.resultCount, { color: colors.mutedForeground }]}>
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
              {kindFilter !== "all" ? ` in ${FILTER_TABS.find(f => f.id === kindFilter)?.label}` : ""}{" "}
              for "{query}"
            </Text>
          }
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
    paddingBottom: 0,
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
    marginBottom: 10,
  },
  input: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    padding: 0,
  },
  filterRow: {
    gap: 8,
    paddingBottom: 10,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
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
  movieCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  movieTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
  movieMeta: { fontFamily: "Inter_400Regular", fontSize: 13 },
  movieRating: { fontFamily: "Inter_400Regular", fontSize: 12 },
});
