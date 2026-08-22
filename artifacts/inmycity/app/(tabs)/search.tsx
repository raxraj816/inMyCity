import { Feather } from "@expo/vector-icons";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  getSearchQueryKey,
  useSearch,
  type SearchCounts,
  type SearchResult,
} from "@workspace/api-client-react";
import { useCity } from "@/context/CityContext";
import { useLocation } from "@/context/LocationContext";
import { EmptyState, ErrorState, useListRefreshControl } from "@/components/ListStates";
import { SearchResultCard, SEARCH_RESULT_HEIGHT } from "@/components/SearchResultCard";
import { useRecentSearches } from "@/lib/recentSearches";

/**
 * Search across everything in the city.
 *
 * The server does the matching. This screen used to download every place, event, deal, hotel,
 * activity and movie for the city and filter them in JavaScript with `String.includes`, which
 * worked at 27 places, collapses at 2,000, and could not find "vadapav" if the listing said
 * "vada pav". It now sends the query to `/api/search`, which expands it through the city's
 * curated vocabulary, matches it in Postgres, and ranks by relevance, distance, rating and
 * whether the place is open.
 */

const QUICK_SEARCHES = ["Vada pav", "Chaat", "Rooftop bar", "Near CSMT", "Veg only", "Live music"];

const CATEGORY_SHORTCUTS = ["food", "attraction", "nightlife", "hotels", "activities", "movies"];

type FilterKind = "all" | SearchResult["kind"];

const FILTER_TABS: { id: FilterKind; label: string }[] = [
  { id: "all", label: "All" },
  { id: "place", label: "Places" },
  { id: "event", label: "Events" },
  { id: "hotel", label: "Hotels" },
  { id: "activity", label: "Activities" },
  { id: "movie", label: "Movies" },
  { id: "deal", label: "Deals" },
];

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedCity } = useCity();
  const { location } = useLocation();
  const { recent, remember, forget, clear } = useRecentSearches();

  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<FilterKind>("all");

  // The request follows the field only once typing pauses; the field itself never lags.
  const debouncedQuery = useDebouncedValue(query.trim(), 250);
  const hasQuery = debouncedQuery.length > 0;

  const cityName = selectedCity?.name;
  const topPadding = Platform.OS === "web" ? 20 : insets.top + 8;
  const bottomPadding = Platform.OS === "web" ? 84 : 84 + insets.bottom;

  const searchParams = useMemo(
    () => ({
      q: debouncedQuery,
      city: cityName,
      kind: kindFilter === "all" ? undefined : kindFilter,
      ...(location ? { lat: location.lat, lng: location.lng } : {}),
    }),
    [debouncedQuery, cityName, kindFilter, location],
  );

  const {
    data,
    isLoading,
    isFetching,
    isRefetching,
    isPaused,
    error,
    refetch,
  } = useSearch(searchParams, {
    query: {
      queryKey: getSearchQueryKey(searchParams),
      enabled: hasQuery,
      // Keeps the previous results on screen while the next query is in flight, so the list
      // does not blink back to empty between keystrokes.
      placeholderData: (previous) => previous,
    },
  });

  const results = data?.results ?? [];
  const counts: SearchCounts | undefined = data?.counts;
  const suggestions = data?.suggestions ?? [];

  const refreshControl = useListRefreshControl(isRefetching, refetch);

  const submit = useCallback(
    (term: string) => {
      setQuery(term);
      setKindFilter("all");
      remember(term);
    },
    [remember],
  );

  const clearQuery = useCallback(() => {
    setQuery("");
    setKindFilter("all");
  }, []);

  const visibleTabs = useMemo(
    () => FILTER_TABS.filter((tab) => tab.id === "all" || (counts?.[tab.id] ?? 0) > 0),
    [counts],
  );

  const countFor = useCallback(
    (id: FilterKind) => (id === "all" ? (data?.total ?? 0) : (counts?.[id] ?? 0)),
    [counts, data?.total],
  );

  const renderItem = useCallback(
    ({ item }: { item: SearchResult }) => <SearchResultCard result={item} />,
    [],
  );

  const keyExtractor = useCallback((item: SearchResult) => `${item.kind}-${item.id}`, []);

  // Every row is the same height, so the list can place them without measuring.
  const getItemLayout = useCallback(
    (_: ArrayLike<SearchResult> | null | undefined, index: number) => ({
      length: SEARCH_RESULT_HEIGHT,
      offset: SEARCH_RESULT_HEIGHT * index,
      index,
    }),
    [],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.topSection,
          { paddingTop: topPadding, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            style={[styles.input, { color: colors.foreground }]}
            placeholder={`Search in ${selectedCity?.name ?? "city"}…`}
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              setKindFilter("all");
            }}
            onSubmitEditing={() => remember(query)}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel={`Search in ${selectedCity?.name ?? "your city"}`}
            accessibilityHint="Results appear as you type. Try a dish, a place, or a station."
          />
          {isFetching && hasQuery ? (
            <ActivityIndicator size="small" color={colors.mutedForeground} />
          ) : null}
          {query.length > 0 ? (
            <TouchableOpacity
              onPress={clearQuery}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Feather name="x-circle" size={17} color={colors.mutedForeground} />
            </TouchableOpacity>
          ) : null}
        </View>

        {hasQuery && (counts ? Object.values(counts).some((count) => count > 0) : false) ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
            accessibilityRole="tablist"
          >
            {visibleTabs.map((tab) => {
              const active = kindFilter === tab.id;
              const count = countFor(tab.id);
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor: active ? colors.amber : colors.card,
                      borderColor: active ? colors.amber : colors.border,
                    },
                  ]}
                  onPress={() => setKindFilter(tab.id)}
                  activeOpacity={0.75}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${tab.label}, ${count} ${count === 1 ? "result" : "results"}`}
                >
                  <Text style={[styles.filterText, { color: active ? "#fff" : colors.foreground }]}>
                    {tab.label}
                    {count ? ` (${count})` : ""}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : null}
      </View>

      {!hasQuery ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: bottomPadding }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {recent.length > 0 ? (
            <>
              <View style={styles.sectionHeader}>
                <Text style={[styles.quickLabel, { color: colors.mutedForeground }]}>RECENT</Text>
                <TouchableOpacity
                  onPress={clear}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel="Clear recent searches"
                >
                  <Text style={[styles.clearLink, { color: colors.amber }]}>Clear</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.chipsWrap}>
                {recent.map((term) => (
                  <View
                    key={term}
                    style={[styles.recentChip, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <TouchableOpacity
                      style={styles.recentChipMain}
                      onPress={() => submit(term)}
                      activeOpacity={0.75}
                      accessibilityRole="button"
                      accessibilityLabel={`Search again for ${term}`}
                    >
                      <Feather name="clock" size={13} color={colors.mutedForeground} />
                      <Text style={[styles.chipText, { color: colors.foreground }]}>{term}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => forget(term)}
                      hitSlop={{ top: 12, bottom: 12, left: 8, right: 12 }}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${term} from recent searches`}
                    >
                      <Feather name="x" size={14} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          <Text style={[styles.quickLabel, { color: colors.mutedForeground }]}>TRY SEARCHING FOR</Text>
          <View style={styles.chipsWrap}>
            {QUICK_SEARCHES.map((term) => (
              <TouchableOpacity
                key={term}
                style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => submit(term)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={`Search for ${term}`}
              >
                <Feather name="search" size={13} color={colors.amber} />
                <Text style={[styles.chipText, { color: colors.foreground }]}>{term}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.quickLabel, { color: colors.mutedForeground, marginTop: 8 }]}>
            CATEGORIES
          </Text>
          <View style={styles.catChipsWrap}>
            {CATEGORY_SHORTCUTS.map((category) => (
              <TouchableOpacity
                key={category}
                style={[styles.catChip, { backgroundColor: colors.amber + "1a" }]}
                onPress={() => submit(category)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={`Search for ${category}`}
              >
                <Text style={[styles.catChipText, { color: colors.amber }]}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      ) : error || (isPaused && !data) ? (
        // A paused query has neither data nor an error — it is waiting for the network to come
        // back. Falling through to the list would claim there is nothing to find.
        <ErrorState error={error} onRetry={refetch} subject="search results" />
      ) : (
        <FlatList
          data={results}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews={Platform.OS === "android"}
          refreshControl={refreshControl}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingBottom: bottomPadding }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            results.length > 0 ? (
              <Text
                style={[styles.resultCount, { color: colors.mutedForeground }]}
                accessibilityRole="header"
              >
                {data?.total ?? results.length} result{(data?.total ?? results.length) !== 1 ? "s" : ""} for
                “{debouncedQuery}”
              </Text>
            ) : null
          }
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.loading}>
                <ActivityIndicator color={colors.amber} />
              </View>
            ) : (
              <View>
                <EmptyState
                  icon="search"
                  title={`No results for “${debouncedQuery}”`}
                  message={
                    suggestions.length > 0
                      ? "Nothing matched exactly. One of these might be what you meant."
                      : "Try a shorter word, a dish name, or a neighbourhood."
                  }
                />
                {suggestions.length > 0 ? (
                  <View style={styles.suggestionWrap}>
                    {suggestions.map((suggestion) => (
                      <TouchableOpacity
                        key={suggestion}
                        style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => submit(suggestion)}
                        activeOpacity={0.75}
                        accessibilityRole="button"
                        accessibilityLabel={`Search for ${suggestion} instead`}
                      >
                        <Feather name="corner-down-right" size={13} color={colors.amber} />
                        <Text style={[styles.chipText, { color: colors.foreground }]}>{suggestion}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
              </View>
            )
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
  filterRow: { gap: 8, paddingBottom: 10 },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: "center",
  },
  filterText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  resultCount: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: 20,
  },
  clearLink: { fontFamily: "Inter_600SemiBold", fontSize: 13, paddingTop: 20, paddingBottom: 10 },
  quickLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 44,
  },
  recentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingRight: 12,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 44,
  },
  recentChipMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 14,
    paddingRight: 2,
    paddingVertical: 10,
  },
  chipText: { fontFamily: "Inter_500Medium", fontSize: 14 },
  catChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 4,
  },
  catChip: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 20,
    minHeight: 44,
    justifyContent: "center",
  },
  catChipText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  suggestionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 8,
  },
  loading: { paddingTop: 60, alignItems: "center" },
});
