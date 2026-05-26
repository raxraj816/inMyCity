import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useGetItineraryById, getGetItineraryByIdQueryKey } from "@workspace/api-client-react";
import { ErrorFallback } from "@/components/ErrorFallback";
import { PlaceCard } from "@/components/PlaceCard";
import {
  buildPlanShareText,
  isPlanSaved,
  toggleSavedPlan,
  type SavedPlan,
} from "@/lib/savedPlans";

export default function ItineraryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [saved, setSaved] = useState(false);

  const itineraryId = parseInt(id, 10);

  const { data: itinerary, isLoading, error, refetch } = useGetItineraryById(itineraryId, {
    query: { enabled: !!itineraryId, queryKey: getGetItineraryByIdQueryKey(itineraryId) }
  });

  useEffect(() => {
    if (!itineraryId) return;
    isPlanSaved(`itinerary-${itineraryId}`).then(setSaved).catch(() => setSaved(false));
  }, [itineraryId]);

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
  const savedPlan: Omit<SavedPlan, "createdAt"> = {
    id: `itinerary-${itinerary.id}`,
    kind: "itinerary",
    title: itinerary.title,
    subtitle: `${itinerary.durationDays} day${itinerary.durationDays > 1 ? "s" : ""} · ${itinerary.stops?.length || 0} stops`,
    city: itinerary.city,
    route: `/itinerary/${itinerary.id}`,
    summary: itinerary.description ?? itinerary.tips?.slice(0, 2).join(" ") ?? "A saved inMyCity itinerary.",
  };

  const onToggleSave = async () => {
    const result = await toggleSavedPlan(savedPlan);
    setSaved(result.saved);
  };

  const onShare = () => {
    const stopNames = itinerary.stops
      ?.slice()
      .sort((a, b) => a.day - b.day || a.order - b.order)
      .slice(0, 5)
      .map((stop) => stop.place?.name)
      .filter(Boolean)
      .join(" -> ");

    Share.share({
      title: itinerary.title,
      message: buildPlanShareText({
        ...savedPlan,
        summary: stopNames ? `${savedPlan.summary}\n\nStops: ${stopNames}` : savedPlan.summary,
      }),
    });
  };

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
            <View style={styles.topRightActions}>
              <TouchableOpacity
                style={[styles.circleButton, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
                onPress={onToggleSave}
              >
                <Feather name="bookmark" size={20} color={saved ? colors.amber : "#fff"} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.circleButton, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
                onPress={onShare}
              >
                <Feather name="share-2" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={[styles.content, { paddingBottom: insets.bottom + 40, backgroundColor: colors.background }]}>
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

          <View style={[styles.planActions, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity style={[styles.primaryPlanAction, { backgroundColor: colors.amber }]} onPress={onToggleSave}>
              <Feather name={saved ? "check" : "bookmark"} size={15} color="#fff" />
              <Text style={styles.primaryPlanActionText}>{saved ? "Saved plan" : "Save plan"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryPlanAction, { borderColor: colors.border }]} onPress={onShare}>
              <Feather name="share-2" size={15} color={colors.foreground} />
              <Text style={[styles.secondaryPlanActionText, { color: colors.foreground }]}>Share</Text>
            </TouchableOpacity>
          </View>

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
    right: 0,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topRightActions: {
    flexDirection: "row",
    gap: 10,
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
  planActions: {
    flexDirection: "row",
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  primaryPlanAction: {
    flex: 1.2,
    minHeight: 44,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryPlanActionText: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  secondaryPlanAction: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryPlanActionText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
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
