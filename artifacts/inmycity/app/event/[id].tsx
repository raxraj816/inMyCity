import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useGetEventById, getGetEventByIdQueryKey } from "@workspace/api-client-react";
import { ErrorFallback } from "@/components/ErrorFallback";
import { VenueActions } from "@/components/VenueActions";
import { MapPreview } from "@/components/MapPreview";

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const eventId = parseInt(id, 10);

  const { data: event, isLoading, error, refetch } = useGetEventById(eventId, {
    query: { enabled: !!eventId, queryKey: getGetEventByIdQueryKey(eventId) }
  });

  if (error) return <ErrorFallback error={error as Error} resetError={refetch} />;
  
  if (isLoading || !event) {
    return <View style={[styles.container, { backgroundColor: colors.background }]} />;
  }

  const date = new Date(event.startDate);
  const formattedDate = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const formattedTime = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const handleBooking = () => {
    if (event.bookingUrl) {
      Linking.openURL(event.bookingUrl);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          {event.imageUrl ? (
            <Image
              source={{ uri: event.imageUrl }}
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
              <Feather name="arrow-left" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.content, { backgroundColor: colors.background, paddingBottom: insets.bottom + 100 }]}>
          <View style={styles.header}>
            <View style={[styles.categoryBadge, { backgroundColor: colors.navyLight }]}>
              <Text style={styles.categoryText}>{event.category}</Text>
            </View>
          </View>

          <Text style={[styles.title, { color: colors.foreground }]}>{event.title}</Text>
          
          <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.infoRow}>
              <View style={[styles.iconBox, { backgroundColor: colors.amberLight }]}>
                <Feather name="calendar" size={20} color={colors.amber} />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={[styles.infoLabel, { color: colors.foreground }]}>{formattedDate}</Text>
                <Text style={[styles.infoValue, { color: colors.mutedForeground }]}>{formattedTime}</Text>
              </View>
            </View>
            
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            
            <View style={styles.infoRow}>
              <View style={[styles.iconBox, { backgroundColor: colors.infoLight }]}>
                <Feather name="map-pin" size={20} color={colors.info} />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={[styles.infoLabel, { color: colors.foreground }]}>{event.venue}</Text>
                <Text style={[styles.infoValue, { color: colors.mutedForeground }]}>{event.address}</Text>
              </View>
            </View>
          </View>

          <VenueActions name={event.venue} lat={event.lat} lng={event.lng} />

          <MapPreview name={event.venue} lat={event.lat} lng={event.lng} />

          {event.description && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About Event</Text>
              <Text style={[styles.description, { color: colors.mutedForeground }]}>{event.description}</Text>
            </View>
          )}

          {event.tags && event.tags.length > 0 && (
            <View style={styles.section}>
              <View style={styles.tagsContainer}>
                {event.tags.map(tag => (
                  <View key={tag} style={[styles.tag, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.tagText, { color: colors.foreground }]}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom || 24, backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <View style={styles.priceContainer}>
          <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>Price</Text>
          <Text style={[styles.priceValue, { color: event.isFree ? colors.success : colors.foreground }]}>
            {event.isFree ? "Free" : (event.price ? `$${event.price}` : "TBD")}
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.bookButton, { backgroundColor: colors.amber }]}
          onPress={handleBooking}
          disabled={!event.bookingUrl}
        >
          <Text style={styles.bookButtonText}>Book Tickets</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  imageContainer: {
    height: 300,
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
    paddingHorizontal: 20,
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
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  header: {
    flexDirection: "row",
    marginBottom: 16,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  categoryText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    marginBottom: 24,
    lineHeight: 34,
  },
  infoCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    marginBottom: 4,
  },
  infoValue: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  divider: {
    height: 1,
    width: "100%",
    marginVertical: 16,
    marginLeft: 64,
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
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  tagText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  priceContainer: {
    justifyContent: "center",
  },
  priceLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    marginBottom: 2,
  },
  priceValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
  },
  bookButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  bookButtonText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
});
