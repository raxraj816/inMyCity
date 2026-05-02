import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, FlatList
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useGetActivities } from "@workspace/api-client-react";
import { useCity } from "@/context/CityContext";
import { ErrorFallback } from "@/components/ErrorFallback";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "adventure", label: "Adventure" },
  { id: "cultural", label: "Cultural" },
  { id: "wellness", label: "Wellness" },
  { id: "sports", label: "Sports" },
  { id: "workshop", label: "Workshop" },
  { id: "tour", label: "Tours" },
];

const CATEGORY_COLORS: Record<string, string> = {
  adventure: "#ef4444",
  cultural: "#6366f1",
  wellness: "#10b981",
  sports: "#0ea5e9",
  workshop: "#f59e0b",
  tour: "#ec4899",
};

const CATEGORY_ICONS: Record<string, string> = {
  adventure: "zap",
  cultural: "book",
  wellness: "heart",
  sports: "activity",
  workshop: "tool",
  tour: "map",
};

export default function ActivitiesScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedCity } = useCity();
  const [activeFilter, setActiveFilter] = useState("all");

  const { data: activities = [], isLoading, error, refetch } = useGetActivities({
    city: selectedCity?.name,
    category: activeFilter !== "all" ? activeFilter : undefined,
  });

  if (error) return <ErrorFallback error={error as Error} resetError={refetch} />;

  const isLocal = selectedCity?.name === "Mumbai" || selectedCity?.name === "Bangalore";
  const currencySymbol = isLocal ? "₹" : "$";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20), backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Activities</Text>
          {selectedCity && (
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>{selectedCity.displayName}</Text>
          )}
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Filter Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={styles.filtersContent}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.id}
            style={[
              styles.pill,
              { backgroundColor: activeFilter === f.id ? "#ef4444" : colors.card, borderColor: activeFilter === f.id ? "#ef4444" : colors.border }
            ]}
            onPress={() => setActiveFilter(f.id)}
          >
            <Text style={[styles.pillText, { color: activeFilter === f.id ? "#fff" : colors.foreground }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Activities List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          {[1, 2, 3].map(i => (
            <View key={i} style={[styles.skeletonCard, { backgroundColor: colors.card }]} />
          ))}
        </View>
      ) : activities.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="zap" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No activities found</Text>
        </View>
      ) : (
        <FlatList
          data={activities}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const catColor = CATEGORY_COLORS[item.category] ?? "#6366f1";
            const catIcon = CATEGORY_ICONS[item.category] ?? "zap";
            const hours = item.durationMinutes ? Math.floor(item.durationMinutes / 60) : 0;
            const mins = item.durationMinutes ? item.durationMinutes % 60 : 0;
            const durationStr = hours > 0 ? (mins > 0 ? `${hours}h ${mins}m` : `${hours}h`) : `${mins}m`;

            return (
              <TouchableOpacity
                style={[styles.activityCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push(`/activity/${item.id}` as any)}
                activeOpacity={0.85}
              >
                <View style={styles.cardInner}>
                  <Image
                    source={{ uri: item.imageUrl ?? "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=600" }}
                    style={styles.activityImage}
                    contentFit="cover"
                  />
                  <View style={styles.activityBody}>
                    {/* Category badge */}
                    <View style={[styles.catBadge, { backgroundColor: catColor + "1a" }]}>
                      <Feather name={catIcon as any} size={11} color={catColor} />
                      <Text style={[styles.catText, { color: catColor }]}>
                        {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                      </Text>
                    </View>

                    <Text style={[styles.activityName, { color: colors.foreground }]} numberOfLines={2}>{item.name}</Text>

                    {item.description && (
                      <Text style={[styles.activityDesc, { color: colors.mutedForeground }]} numberOfLines={2}>{item.description}</Text>
                    )}

                    <View style={styles.activityMeta}>
                      {item.durationMinutes && (
                        <View style={styles.metaItem}>
                          <Feather name="clock" size={12} color={colors.mutedForeground} />
                          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{durationStr}</Text>
                        </View>
                      )}
                      {item.rating && (
                        <View style={styles.metaItem}>
                          <Feather name="star" size={12} color="#f59e0b" />
                          <Text style={[styles.metaText, { color: colors.foreground }]}>{item.rating.toFixed(1)}</Text>
                        </View>
                      )}
                    </View>

                    <View style={[styles.activityFooter, { borderTopColor: colors.border }]}>
                      <Text style={[styles.priceText, { color: catColor }]}>
                        {item.price ? `${currencySymbol}${Math.round(item.price).toLocaleString()}` : "Free"}
                        {item.price ? " / person" : ""}
                      </Text>
                      <View style={[styles.arrowBtn, { backgroundColor: catColor + "15" }]}>
                        <Feather name="arrow-right" size={14} color={catColor} />
                      </View>
                    </View>
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
  filtersScroll: { flexGrow: 0, flexShrink: 0 },
  filtersContent: { flexDirection: "row", flexWrap: "nowrap", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  pillText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  loadingContainer: { padding: 16, gap: 12 },
  skeletonCard: { height: 160, borderRadius: 16 },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontFamily: "Inter_500Medium", fontSize: 16 },
  listContent: { padding: 16, gap: 14 },
  activityCard: {
    borderRadius: 20, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      web: { boxShadow: "0 2px 10px rgba(0,0,0,0.07)" },
      default: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3 },
    }),
  },
  cardInner: { flexDirection: "row", alignItems: "stretch" },
  activityImage: { width: 120, minHeight: 140 },
  activityBody: { flex: 1, padding: 14, gap: 6 },
  catBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: "flex-start" },
  catText: { fontFamily: "Inter_600SemiBold", fontSize: 10 },
  activityName: { fontFamily: "Inter_700Bold", fontSize: 14, lineHeight: 19 },
  activityDesc: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17 },
  activityMeta: { flexDirection: "row", gap: 12 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontFamily: "Inter_500Medium", fontSize: 11 },
  activityFooter: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: 8, marginTop: 2, borderTopWidth: StyleSheet.hairlineWidth,
  },
  priceText: { fontFamily: "Inter_700Bold", fontSize: 14 },
  arrowBtn: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
});
