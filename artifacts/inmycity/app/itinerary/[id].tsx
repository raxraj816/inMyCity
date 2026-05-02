import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useGetItineraryById, getGetItineraryByIdQueryKey } from "@workspace/api-client-react";
import { ErrorFallback } from "@/components/ErrorFallback";
import { PlaceCard } from "@/components/PlaceCard";

export default function ItineraryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const itineraryId = parseInt(id, 10);

  const { data: itinerary, isLoading, error, refetch } = useGetItineraryById(itineraryId, {
    query: { enabled: !!itineraryId, queryKey: getGetItineraryByIdQueryKey(itineraryId) }
  });

  if (error) return <ErrorFallback error={error as Error} resetError={refetch} />;
  
  if (isLoading || !itinerary) {
    return <View style={[styles.container, { backgroundColor: colors.background }]} />;
  }

  // Group stops by day
  const stopsByDay: Record<number, typeof itinerary.stops> = {};
  itinerary.stops?.forEach(stop => {
    if (!stopsByDay[stop.day]) stopsByDay[stop.day] = [];
    stopsByDay[stop.day].push(stop);
  });

  Object.values(stopsByDay).forEach(stops => {
    stops.sort((a, b) => a.order - b.order);
  });

  const days = Object.keys(stopsByDay).map(Number).sort((a, b) => a - b);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          {itinerary.coverImageUrl ? (
            <Image
              source={{ uri: itinerary.coverImageUrl }}
              style={styles.image}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.image, { backgroundColor: colors.navy }]} />
          )}
          
          <View style={[styles.topActions, { paddingTop: Math.max(insets.top, 20) }]}>
            <TouchableOpacity 
              style={[styles.circleButton, { backgroundColor: 'rgba(0,0,0,0.5)' }]} 
              onPress={() => router.back()}
            >
              <Feather name="arrow-left" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
          <Text style={[styles.cityText, { color: colors.primary }]}>{itinerary.city}</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>{itinerary.title}</Text>
          
          <View style={styles.metaRow}>
            <View style={[styles.metaBadge, { backgroundColor: colors.muted }]}>
              <Feather name="calendar" size={14} color={colors.foreground} />
              <Text style={[styles.metaText, { color: colors.foreground }]}>
                {itinerary.durationDays} Day{itinerary.durationDays > 1 ? 's' : ''}
              </Text>
            </View>
            <View style={[styles.metaBadge, { backgroundColor: colors.muted }]}>
              <Feather name="map-pin" size={14} color={colors.foreground} />
              <Text style={[styles.metaText, { color: colors.foreground }]}>
                {itinerary.stops?.length || 0} Stops
              </Text>
            </View>
          </View>

          {itinerary.description && (
            <Text style={[styles.description, { color: colors.mutedForeground }]}>
              {itinerary.description}
            </Text>
          )}

          {itinerary.tips && itinerary.tips.length > 0 && (
            <View style={[styles.tipsBox, { backgroundColor: colors.amberLight }]}>
              <View style={styles.tipsHeader}>
                <Feather name="info" size={18} color={colors.amber} />
                <Text style={[styles.tipsTitle, { color: colors.amber }]}>Local Tips</Text>
              </View>
              {itinerary.tips.map((tip, index) => (
                <Text key={index} style={[styles.tipText, { color: colors.foreground }]}>
                  • {tip}
                </Text>
              ))}
            </View>
          )}

          <View style={styles.itinerarySection}>
            {days.map(day => (
              <View key={day} style={styles.dayContainer}>
                <Text style={[styles.dayTitle, { color: colors.foreground }]}>Day {day}</Text>
                
                <View style={styles.timeline}>
                  {stopsByDay[day].map((stop, index) => (
                    <View key={stop.id} style={styles.stopContainer}>
                      <View style={styles.timelineLine}>
                        <View style={[styles.timelineDot, { backgroundColor: colors.primary }]} />
                        {index < stopsByDay[day].length - 1 && (
                          <View style={[styles.timelineConnector, { backgroundColor: colors.border }]} />
                        )}
                      </View>
                      
                      <View style={styles.stopContent}>
                        <View style={styles.stopMeta}>
                          {stop.bestTimeToVisit && (
                            <Text style={[styles.bestTime, { color: colors.mutedForeground }]}>
                              {stop.bestTimeToVisit}
                            </Text>
                          )}
                          {stop.durationMinutes && (
                            <Text style={[styles.duration, { color: colors.mutedForeground }]}>
                              {Math.round(stop.durationMinutes / 60)}h {stop.durationMinutes % 60 > 0 ? `${stop.durationMinutes % 60}m` : ''}
                            </Text>
                          )}
                        </View>
                        
                        <View style={styles.placeWrapper}>
                          <PlaceCard place={stop.place} />
                        </View>
                        
                        {(stop.tip || stop.estimatedCost) && (
                          <View style={[styles.stopDetails, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            {stop.estimatedCost && (
                              <Text style={[styles.costText, { color: colors.foreground }]}>
                                Est. Cost: <Text style={{ fontFamily: "Inter_600SemiBold" }}>{stop.estimatedCost}</Text>
                              </Text>
                            )}
                            {stop.tip && (
                              <Text style={[styles.stopTip, { color: colors.mutedForeground }]}>
                                💡 {stop.tip}
                              </Text>
                            )}
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
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
    paddingTop: 32,
    marginTop: -30,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: "#fff",
  },
  cityText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 32,
    marginBottom: 16,
    lineHeight: 38,
  },
  metaRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  metaText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  description: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  tipsBox: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 32,
  },
  tipsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  tipsTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  tipText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 4,
  },
  itinerarySection: {
    marginTop: 16,
  },
  dayContainer: {
    marginBottom: 40,
  },
  dayTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    marginBottom: 20,
  },
  timeline: {
    paddingLeft: 8,
  },
  stopContainer: {
    flexDirection: "row",
    marginBottom: 0,
  },
  timelineLine: {
    alignItems: "center",
    marginRight: 16,
    width: 20,
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginTop: 4,
    zIndex: 2,
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    marginVertical: -8, // connect dots perfectly
    zIndex: 1,
  },
  stopContent: {
    flex: 1,
    paddingBottom: 32,
  },
  stopMeta: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  bestTime: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  duration: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  placeWrapper: {
    marginLeft: -20, // offset the card's horizontal margin to fit timeline
    marginRight: -20,
  },
  stopDetails: {
    marginTop: -8, // pull up under the card slightly
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  costText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    marginBottom: 8,
  },
  stopTip: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    fontStyle: "italic",
  },
});
