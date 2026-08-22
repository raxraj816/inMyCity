import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useGetPlaces, useGetDeals } from "@workspace/api-client-react";
import { useCity } from "@/context/CityContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SkeletonCard } from "@/components/SkeletonCard";
import { EmptyState, ErrorState, LIST_PERFORMANCE_PROPS, useListRefreshControl } from "@/components/ListStates";
import { ShopCard } from "@/components/ShopCard";

const SHOP_COLOR = "#c2410c";

const SUB_CATEGORIES = [
  { id: "all",         label: "All"         },
  { id: "apparel",     label: "Apparel"     },
  { id: "beauty",      label: "Beauty"      },
  { id: "electronics", label: "Electronics" },
  { id: "home",        label: "Home"        },
  { id: "books",       label: "Books"       },
  { id: "grocery",     label: "Grocery"     },
  { id: "sports",      label: "Sports"      },
  { id: "gifts",       label: "Gifts"       },
];

export default function ShopsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedCity } = useCity();

  const [subCategory, setSubCategory] = useState("all");
  const [showDealsOnly, setShowDealsOnly] = useState(false);

  const topPadding    = Math.max(insets.top, 20);
  const bottomPadding = Platform.OS === "web" ? 84 : 84 + insets.bottom;

  const cityName = selectedCity?.name;

  const {
    data: shops = [],
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useGetPlaces({ city: cityName, category: "shopping" });

  const {
    data: deals = [],
  } = useGetDeals({ city: cityName });

  const dealsByPlaceId = useMemo(() => {
    const map: Record<number, typeof deals[number]> = {};
    for (const deal of deals) {
      if (deal.placeId != null) {
        map[deal.placeId] = deal;
      }
    }
    return map;
  }, [deals]);

  const filteredShops = useMemo(() => {
    let result = shops;
    if (subCategory !== "all") {
      result = result.filter(s =>
        s.tags?.some(t => t.toLowerCase().includes(subCategory.toLowerCase()))
      );
    }
    if (showDealsOnly) {
      result = result.filter(s => dealsByPlaceId[s.id] != null);
    }
    return result;
  }, [shops, subCategory, showDealsOnly, dealsByPlaceId]);

  const refreshControl = useListRefreshControl(isRefetching, refetch, SHOP_COLOR);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Shops" topPadding={topPadding} />

      {/* Sub-category pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.filterRow, { borderBottomColor: colors.border }]}
        contentContainerStyle={styles.filterRowContent}
      >
        {SUB_CATEGORIES.map(cat => {
          const active = subCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.pill,
                {
                  backgroundColor: active ? SHOP_COLOR : colors.card,
                  borderColor: active ? SHOP_COLOR : colors.border,
                },
              ]}
              onPress={() => setSubCategory(cat.id)}
              activeOpacity={0.75}
            >
              <Text style={[styles.pillText, { color: active ? "#fff" : colors.foreground }]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Quick toggle — Has Deals */}
      <View style={[styles.toggleRow, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.toggleChip,
            {
              backgroundColor: showDealsOnly ? "#15803d" : colors.muted,
              borderColor: showDealsOnly ? "#15803d" : "transparent",
            },
          ]}
          onPress={() => setShowDealsOnly(v => !v)}
          activeOpacity={0.75}
        >
          <MaterialCommunityIcons
            name="tag-outline"
            size={13}
            color={showDealsOnly ? "#fff" : colors.mutedForeground}
          />
          <Text style={[styles.toggleText, { color: showDealsOnly ? "#fff" : colors.mutedForeground }]}>
            Has Deals
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {error ? (
        <ErrorState error={error} onRetry={refetch} accent={SHOP_COLOR} subject="shops" />
      ) : isLoading ? (
        <View style={styles.skeletonWrap}>
          <SkeletonCard height={340} />
          <SkeletonCard height={340} />
          <SkeletonCard height={340} />
        </View>
      ) : (
        <FlatList
          data={filteredShops}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <ShopCard
              shop={item}
              deal={dealsByPlaceId[item.id] ?? null}
            />
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding }]}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
          {...LIST_PERFORMANCE_PROPS}
          ListEmptyComponent={
            <EmptyState
              icon="shopping-bag"
              accent={SHOP_COLOR}
              title={showDealsOnly ? "No deal shops right now" : "No shops found"}
              message={
                cityName
                  ? `Try a different filter, or check back later in ${cityName}.`
                  : "Select a city to browse shops."
              }
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  filterRow: {
    flexGrow: 0,
    flexShrink: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filterRowContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },

  toggleRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toggleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  toggleText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },

  skeletonWrap: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 14,
  },


  listContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 14,
  },
});
