import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Platform, TouchableOpacity, ScrollView, RefreshControl, Share } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useGetFavorites, useGetCollections } from "@workspace/api-client-react";

import { PlaceCard } from "@/components/PlaceCard";
import { ErrorFallback } from "@/components/ErrorFallback";
import { SkeletonCard } from "@/components/SkeletonCard";
import {
  buildPlanShareText,
  getSavedPlans,
  removeSavedPlan,
  type SavedPlan,
} from "@/lib/savedPlans";

export default function SavedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"favorites" | "collections" | "plans">("favorites");
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);

  const {
    data: favorites,
    isLoading: favoritesLoading,
    error: favoritesError,
    refetch: refetchFavorites
  } = useGetFavorites();

  const {
    data: collections,
    isLoading: collectionsLoading,
    error: collectionsError,
    refetch: refetchCollections
  } = useGetCollections();

  const topPadding = Math.max(insets.top, 20);
  const bottomPadding = Platform.OS === "web" ? 84 : 84 + insets.bottom;

  const loadPlans = useCallback(async () => {
    setPlansLoading(true);
    try {
      setSavedPlans(await getSavedPlans());
    } finally {
      setPlansLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  useFocusEffect(
    useCallback(() => {
      loadPlans();
    }, [loadPlans]),
  );

  const onRefresh = () => {
    refetchFavorites();
    refetchCollections();
    loadPlans();
  };

  const isRefreshing = favoritesLoading || collectionsLoading || plansLoading;

  if (favoritesError || collectionsError) {
    return <ErrorFallback error={(favoritesError || collectionsError) as Error} resetError={onRefresh} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding, backgroundColor: colors.card }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Saved</Text>
        
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[
              styles.tab, 
              activeTab === "favorites" && [styles.activeTab, { borderBottomColor: colors.amber }]
            ]}
            onPress={() => setActiveTab("favorites")}
          >
            <Text style={[
              styles.tabText, 
              { color: activeTab === "favorites" ? colors.amber : colors.mutedForeground },
              activeTab === "favorites" && { fontFamily: "Inter_600SemiBold" }
            ]}>Favorites</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.tab, 
              activeTab === "collections" && [styles.activeTab, { borderBottomColor: colors.amber }]
            ]}
            onPress={() => setActiveTab("collections")}
          >
            <Text style={[
              styles.tabText, 
              { color: activeTab === "collections" ? colors.amber : colors.mutedForeground },
              activeTab === "collections" && { fontFamily: "Inter_600SemiBold" }
            ]}>Collections</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "plans" && [styles.activeTab, { borderBottomColor: colors.amber }]
            ]}
            onPress={() => setActiveTab("plans")}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === "plans" ? colors.amber : colors.mutedForeground },
              activeTab === "plans" && { fontFamily: "Inter_600SemiBold" }
            ]}>Plans</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={{ paddingBottom: bottomPadding, paddingTop: 16 }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        {activeTab === "favorites" && (
          <View>
            {favoritesLoading && !favorites ? (
              <>
                <SkeletonCard style={styles.skeleton} />
                <SkeletonCard style={styles.skeleton} />
              </>
            ) : favorites?.length === 0 ? (
              <View style={[styles.emptyContainer, { paddingTop: 60 }]}>
                <View style={[styles.emptyIconContainer, { backgroundColor: colors.muted }]}>
                  <Feather name="heart" size={32} color={colors.mutedForeground} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No favorites yet</Text>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  Tap the heart icon on places to save them here.
                </Text>
              </View>
            ) : (
              favorites?.map(fav => (
                <PlaceCard key={fav.id} place={fav.place} />
              ))
            )}
          </View>
        )}

        {activeTab === "collections" && (
          <View>
            {collectionsLoading && !collections ? (
              <>
                <SkeletonCard height={100} style={styles.skeleton} />
                <SkeletonCard height={100} style={styles.skeleton} />
              </>
            ) : collections?.length === 0 ? (
              <View style={[styles.emptyContainer, { paddingTop: 60 }]}>
                <View style={[styles.emptyIconContainer, { backgroundColor: colors.muted }]}>
                  <Feather name="folder" size={32} color={colors.mutedForeground} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No collections</Text>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  Create collections to organize your saved places.
                </Text>
              </View>
            ) : (
              collections?.map(collection => (
                <View key={collection.id} style={[styles.collectionCard, { backgroundColor: colors.card }]}>
                  <View style={styles.collectionInfo}>
                    <Text style={[styles.collectionName, { color: colors.foreground }]}>{collection.name}</Text>
                    {collection.description && (
                      <Text style={[styles.collectionDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                        {collection.description}
                      </Text>
                    )}
                    <Text style={[styles.collectionCount, { color: colors.mutedForeground }]}>
                      {collection.places?.length || 0} places
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === "plans" && (
          <View>
            {plansLoading && savedPlans.length === 0 ? (
              <>
                <SkeletonCard height={116} style={styles.skeleton} />
                <SkeletonCard height={116} style={styles.skeleton} />
              </>
            ) : savedPlans.length === 0 ? (
              <View style={[styles.emptyContainer, { paddingTop: 60 }]}>
                <View style={[styles.emptyIconContainer, { backgroundColor: colors.muted }]}>
                  <Feather name="bookmark" size={32} color={colors.mutedForeground} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No saved plans yet</Text>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  Save an itinerary or neighborhood guide to keep it here.
                </Text>
              </View>
            ) : (
              savedPlans.map((plan) => (
                <View key={plan.id} style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.planTopRow}>
                    <View style={[styles.planIcon, { backgroundColor: plan.kind === "itinerary" ? "#6366f118" : "#0ea5e918" }]}>
                      <Feather
                        name={plan.kind === "itinerary" ? "map" : "compass"}
                        size={18}
                        color={plan.kind === "itinerary" ? "#6366f1" : "#0ea5e9"}
                      />
                    </View>
                    <View style={styles.planInfo}>
                      <Text style={[styles.planTitle, { color: colors.foreground }]} numberOfLines={1}>{plan.title}</Text>
                      <Text style={[styles.planSubtitle, { color: colors.mutedForeground }]} numberOfLines={2}>{plan.subtitle}</Text>
                    </View>
                  </View>

                  {plan.summary ? (
                    <Text style={[styles.planSummary, { color: colors.mutedForeground }]} numberOfLines={2}>{plan.summary}</Text>
                  ) : null}

                  <View style={styles.planActionRow}>
                    <TouchableOpacity
                      style={[styles.planPrimaryAction, { backgroundColor: colors.amber }]}
                      onPress={() => router.push(plan.route as any)}
                    >
                      <Text style={styles.planPrimaryActionText}>Open</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.planSmallAction, { borderColor: colors.border }]}
                      onPress={() => Share.share({ title: plan.title, message: buildPlanShareText(plan) })}
                    >
                      <Feather name="share-2" size={15} color={colors.foreground} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.planSmallAction, { borderColor: colors.border }]}
                      onPress={async () => setSavedPlans(await removeSavedPlan(plan.id))}
                    >
                      <Feather name="trash-2" size={15} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    zIndex: 10,
    ...Platform.select({
      native: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      },
      web: { boxShadow: "0 2px 4px rgba(0,0,0,0.05)" },
    }),
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: "row",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontFamily: "Inter_500Medium",
    fontSize: 16,
  },
  skeleton: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    textAlign: "center",
  },
  collectionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    ...Platform.select({
      native: {
        shadowColor: "#0f172a",
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      },
      web: { boxShadow: "0 2px 8px rgba(15,23,42,0.05)" },
    }),
  },
  collectionInfo: {
    flex: 1,
  },
  collectionName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    marginBottom: 4,
  },
  collectionDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    marginBottom: 8,
  },
  collectionCount: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  planCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    ...Platform.select({
      native: {
        shadowColor: "#0f172a",
        shadowOpacity: 0.04,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      },
      web: { boxShadow: "0 2px 8px rgba(15,23,42,0.04)" },
    }),
  },
  planTopRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  planIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  planInfo: {
    flex: 1,
  },
  planTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    marginBottom: 4,
  },
  planSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
  planSummary: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12,
  },
  planActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
  },
  planPrimaryAction: {
    flex: 1,
    minHeight: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  planPrimaryActionText: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  planSmallAction: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
