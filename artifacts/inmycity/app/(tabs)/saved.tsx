import { useState } from "react";
import { View, Text, StyleSheet, Platform, TouchableOpacity, ScrollView, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useGetFavorites, useGetCollections } from "@workspace/api-client-react";

import { PlaceCard } from "@/components/PlaceCard";
import { ErrorFallback } from "@/components/ErrorFallback";
import { SkeletonCard } from "@/components/SkeletonCard";

export default function SavedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<"favorites" | "collections">("favorites");

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

  const onRefresh = () => {
    refetchFavorites();
    refetchCollections();
  };

  const isRefreshing = favoritesLoading || collectionsLoading;

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
  }
});
