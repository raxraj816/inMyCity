import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { 
  useGetPlaceById, 
  useAddFavorite, 
  useRemoveFavorite, 
  useGetFavorites,
  getGetFavoritesQueryKey,
  getGetPlaceByIdQueryKey,
} from "@workspace/api-client-react";
import { RatingStars } from "@/components/RatingStars";
import { ErrorFallback } from "@/components/ErrorFallback";
import { VenueActions } from "@/components/VenueActions";
import { CopyableAddress } from "@/components/CopyableAddress";
import { MapPreview } from "@/components/MapPreview";
import { shareEntity } from "@/lib/placeActions";
import { buildShareUrl } from "@/lib/links";

export default function PlaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const placeId = parseInt(id, 10);

  const { data: place, isLoading, error, refetch } = useGetPlaceById(placeId, {
    query: { enabled: !!placeId, queryKey: getGetPlaceByIdQueryKey(placeId) }
  });

  const { data: favorites } = useGetFavorites();
  
  const isFavorite = favorites?.some(fav => fav.placeId === placeId);

  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();

  const toggleFavorite = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isFavorite) {
      removeFavorite.mutate({ placeId }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetFavoritesQueryKey() })
      });
    } else {
      addFavorite.mutate({ data: { placeId } }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetFavoritesQueryKey() })
      });
    }
  };

  const handleShare = () => {
    if (!place) return;
    void shareEntity({
      title: place.name,
      url: buildShareUrl("place", place.id),
      note: `${place.name} — ${place.address}`,
    });
  };

  if (error) return <ErrorFallback error={error as Error} resetError={refetch} />;
  
  if (isLoading || !place) {
    return <View style={[styles.container, { backgroundColor: colors.background }]} />;
  }

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "food": return colors.amber;
      case "attraction": return colors.info;
      case "nightlife": return "#a855f7"; // purple
      case "essentials": return colors.success;
      default: return colors.mutedForeground;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          {place.imageUrl ? (
            <Image
              source={{ uri: place.imageUrl }}
              style={styles.image}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.image, { backgroundColor: colors.muted }]} />
          )}
          
          <View style={[styles.topActions, { paddingTop: Math.max(insets.top, 20) }]}>
            <TouchableOpacity 
              style={[styles.circleButton, { backgroundColor: 'rgba(0,0,0,0.5)' }]} 
              onPress={() => router.back()}
            >
              <Feather name="arrow-left" size={24} color="#fff" />
            </TouchableOpacity>
            
            <View style={styles.rightActions}>
              <TouchableOpacity 
                style={[styles.circleButton, { backgroundColor: 'rgba(0,0,0,0.5)' }]} 
                onPress={handleShare}
              >
                <Feather name="share" size={20} color="#fff" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.circleButton, { backgroundColor: 'rgba(0,0,0,0.5)' }]} 
                onPress={toggleFavorite}
              >
                <Feather 
                  name="heart" 
                  size={20} 
                  color={isFavorite ? colors.destructive : "#fff"} 
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={[styles.content, { backgroundColor: colors.background, paddingBottom: insets.bottom + 40 }]}>
          <View style={styles.header}>
            <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(place.category) }]}>
              <Text style={styles.categoryText}>{place.category}</Text>
            </View>
            
            {place.isOpen !== null && (
              <View style={[styles.statusBadge, { backgroundColor: place.isOpen ? colors.successLight : colors.destructive }]}>
                <Text style={[styles.statusText, { color: place.isOpen ? colors.success : "#fff" }]}>
                  {place.isOpen ? "Open Now" : "Closed"}
                </Text>
              </View>
            )}
          </View>

          <Text style={[styles.title, { color: colors.foreground }]}>{place.name}</Text>
          
          <View style={styles.metaRow}>
            {place.rating != null && (
              <View style={styles.ratingContainer}>
                <RatingStars rating={place.rating} />
                <Text style={[styles.ratingText, { color: colors.foreground }]}>{place.rating.toFixed(1)}</Text>
                {place.reviewCount != null && (
                  <Text style={[styles.reviewCount, { color: colors.mutedForeground }]}>({place.reviewCount})</Text>
                )}
              </View>
            )}
            
            {place.rating != null && place.distanceKm != null && (
              <Text style={{ color: colors.mutedForeground }}>•</Text>
            )}
            
            {place.distanceKm != null && (
              <View style={styles.distanceContainer}>
                <Feather name="map-pin" size={14} color={colors.mutedForeground} />
                <Text style={[styles.distanceText, { color: colors.mutedForeground }]}>{place.distanceKm.toFixed(1)} km away</Text>
              </View>
            )}
          </View>

          <CopyableAddress
            address={place.address}
            textStyle={[styles.address, { color: colors.foreground, marginBottom: 0 }]}
          />

          <MapPreview name={place.name} lat={place.lat} lng={place.lng} />

          <VenueActions
            name={place.name}
            lat={place.lat}
            lng={place.lng}
            phone={place.phone}
            website={place.website}
          />

          {place.description && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About</Text>
              <Text style={[styles.description, { color: colors.mutedForeground }]}>{place.description}</Text>
            </View>
          )}

          <View style={styles.infoGrid}>
            {place.openingHours && (
              <View style={[styles.infoItem, { backgroundColor: colors.card }]}>
                <Feather name="clock" size={20} color={colors.primary} />
                <View style={styles.infoTextContainer}>
                  <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Hours</Text>
                  <Text style={[styles.infoValue, { color: colors.foreground }]}>{place.openingHours}</Text>
                </View>
              </View>
            )}
            
            {place.phone && (
              <View style={[styles.infoItem, { backgroundColor: colors.card }]}>
                <Feather name="phone" size={20} color={colors.primary} />
                <View style={styles.infoTextContainer}>
                  <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Phone</Text>
                  <Text style={[styles.infoValue, { color: colors.foreground }]}>{place.phone}</Text>
                </View>
              </View>
            )}
            
            {place.website && (
              <View style={[styles.infoItem, { backgroundColor: colors.card }]}>
                <Feather name="globe" size={20} color={colors.primary} />
                <View style={styles.infoTextContainer}>
                  <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Website</Text>
                  <Text style={[styles.infoValue, { color: colors.foreground }]} numberOfLines={1}>{place.website}</Text>
                </View>
              </View>
            )}
          </View>

          {place.tags && place.tags.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Highlights</Text>
              <View style={styles.tagsContainer}>
                {place.tags.map(tag => (
                  <View key={tag} style={[styles.tag, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.tagText, { color: colors.foreground }]}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  imageContainer: {
    height: 350,
    width: "100%",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  topActions: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  rightActions: {
    flexDirection: "row",
    gap: 12,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 24,
    marginTop: -30,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  categoryText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    textTransform: "capitalize",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    marginBottom: 12,
    lineHeight: 34,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ratingText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  reviewCount: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  distanceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  distanceText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  address: {
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    marginBottom: 12,
  },
  description: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    lineHeight: 24,
  },
  infoGrid: {
    gap: 12,
    marginBottom: 24,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    gap: 16,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    marginBottom: 2,
  },
  infoValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tagText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
});
