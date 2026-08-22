import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useGetTransitLineById, getGetTransitLineByIdQueryKey } from "@workspace/api-client-react";
import { ErrorFallback } from "@/components/ErrorFallback";
import { formatPriceForCity } from "@workspace/city-config";

const TYPE_ICONS: Record<string, React.ComponentProps<typeof Feather>["name"]> = {
  metro: "zap",
  suburban_rail: "minus-circle",
  bus: "truck",
  tram: "activity",
  ferry: "anchor",
};

export default function TransitLineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const lineId = parseInt(id, 10);
  const { data: line, isLoading, error, refetch } = useGetTransitLineById(lineId, {
    query: { enabled: !!lineId, queryKey: getGetTransitLineByIdQueryKey(lineId) }
  });

  if (error) return <ErrorFallback error={error as Error} resetError={refetch} />;
  if (isLoading || !line) return <View style={[styles.container, { backgroundColor: colors.background }]} />;

  const icon = TYPE_ICONS[line.type] ?? "share-2";
  const typeLabel = line.type.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase());

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        {/* Hero header with line color */}
        <View style={[styles.hero, { backgroundColor: line.color, paddingTop: Math.max(insets.top, 20) }]}>
          <View style={styles.heroTopRow}>
            <TouchableOpacity style={[styles.circleBtn, { backgroundColor: "rgba(0,0,0,0.25)" }]} onPress={() => router.back()}>
              <Feather name="arrow-left" size={22} color="#fff" />
            </TouchableOpacity>
            {line.shortName && (
              <View style={[styles.shortNameHero, { backgroundColor: "rgba(0,0,0,0.25)" }]}>
                <Text style={styles.shortNameHeroText}>{line.shortName}</Text>
              </View>
            )}
          </View>

          <View style={[styles.typePillHero, { backgroundColor: "rgba(0,0,0,0.25)" }]}>
            <Feather name={icon} size={13} color="#fff" />
            <Text style={styles.typePillHeroText}>{typeLabel}</Text>
          </View>

          <Text style={styles.heroTitle}>{line.name}</Text>

          <View style={styles.heroRoute}>
            <Text style={styles.heroStation}>{line.from}</Text>
            <View style={styles.heroArrowContainer}>
              <View style={styles.heroLine} />
              <Feather name="arrow-right" size={16} color="rgba(255,255,255,0.8)" />
            </View>
            <Text style={styles.heroStation}>{line.to}</Text>
          </View>
        </View>

        <View style={[styles.content, { backgroundColor: colors.background, paddingBottom: insets.bottom + 100 }]}>
          {/* Stats row */}
          <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.statItem}>
              <Feather name="map-pin" size={18} color={line.color} />
              <Text style={[styles.statValue, { color: colors.foreground }]}>{line.stops.length}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Stops</Text>
            </View>
            {line.fare != null && (
              <>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                  <Feather name="credit-card" size={18} color={line.color} />
                  <Text style={[styles.statValue, { color: colors.foreground }]}>{formatPriceForCity(line.fare, line.city)}+</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Fare</Text>
                </View>
              </>
            )}
            {line.frequency && (
              <>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                  <Feather name="refresh-cw" size={18} color={line.color} />
                  <Text style={[styles.statValue, { color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 11, textAlign: "center" }]} numberOfLines={1}>{line.frequency}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Frequency</Text>
                </View>
              </>
            )}
          </View>

          {/* Operating hours */}
          {(line.firstTrain || line.lastTrain) && (
            <View style={[styles.hoursCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.hoursIconBox, { backgroundColor: line.color + "15" }]}>
                <Feather name="clock" size={20} color={line.color} />
              </View>
              <View style={styles.hoursTimes}>
                {line.firstTrain && (
                  <View style={styles.timeRow}>
                    <Text style={[styles.timeLabel, { color: colors.mutedForeground }]}>First service</Text>
                    <Text style={[styles.timeValue, { color: colors.foreground }]}>{line.firstTrain}</Text>
                  </View>
                )}
                {line.lastTrain && (
                  <View style={styles.timeRow}>
                    <Text style={[styles.timeLabel, { color: colors.mutedForeground }]}>Last service</Text>
                    <Text style={[styles.timeValue, { color: colors.foreground }]}>{line.lastTrain}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Operator */}
          {line.operatedBy && (
            <View style={[styles.operatorRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.opIcon, { backgroundColor: line.color + "15" }]}>
                <Feather name="shield" size={16} color={line.color} />
              </View>
              <View>
                <Text style={[styles.opLabel, { color: colors.mutedForeground }]}>Operated by</Text>
                <Text style={[styles.opName, { color: colors.foreground }]}>{line.operatedBy}</Text>
              </View>
            </View>
          )}

          {/* Stops list */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>All Stops</Text>
            <View style={[styles.stopsContainer, { borderColor: colors.border }]}>
              {line.stops.map((stop, index) => {
                const isFirst = index === 0;
                const isLast = index === line.stops.length - 1;
                return (
                  <View key={`${stop}-${index}`} style={styles.stopRow}>
                    {/* Track line */}
                    <View style={styles.trackContainer}>
                      <View style={[
                        styles.trackTop,
                        { backgroundColor: isFirst ? "transparent" : line.color + "50" }
                      ]} />
                      <View style={[
                        styles.stopMarker,
                        isFirst || isLast
                          ? { backgroundColor: line.color, width: 14, height: 14, borderRadius: isLast ? 3 : 7 }
                          : { backgroundColor: colors.background, borderColor: line.color, borderWidth: 2, width: 10, height: 10, borderRadius: 5 }
                      ]} />
                      <View style={[
                        styles.trackBottom,
                        { backgroundColor: isLast ? "transparent" : line.color + "50" }
                      ]} />
                    </View>
                    <Text style={[
                      styles.stopName,
                      { color: (isFirst || isLast) ? colors.foreground : colors.mutedForeground },
                      (isFirst || isLast) && { fontFamily: "Inter_700Bold" }
                    ]}>
                      {stop}
                      {isFirst && <Text style={[styles.stopTag, { color: line.color }]}> · Origin</Text>}
                      {isLast && <Text style={[styles.stopTag, { color: line.color }]}> · Terminal</Text>}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Tags */}
          {line.tags && line.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {line.tags.map(tag => (
                <View key={tag} style={[styles.tag, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.tagText, { color: colors.foreground }]}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom || 24, backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <View>
          <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>Fare from</Text>
          <Text style={[styles.priceValue, { color: colors.foreground }]}>
            {line.fare != null ? formatPriceForCity(line.fare, line.city) : "Varies"}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.planBtn, { backgroundColor: line.color }]}
          onPress={() => router.push("/transit/plan" as any)}
        >
          <Feather name="navigation" size={16} color="#fff" />
          <Text style={styles.planBtnText}>Plan Journey</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { padding: 20, paddingBottom: 28 },
  heroTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  circleBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  shortNameHero: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  shortNameHeroText: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#fff" },
  typePillHero: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, alignSelf: "flex-start", marginBottom: 10 },
  typePillHeroText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#fff" },
  heroTitle: { fontFamily: "Inter_700Bold", fontSize: 24, color: "#fff", marginBottom: 16, lineHeight: 30 },
  heroRoute: { flexDirection: "row", alignItems: "center", gap: 10 },
  heroStation: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "rgba(255,255,255,0.9)", flex: 1 },
  heroArrowContainer: { flexDirection: "row", alignItems: "center", gap: 4 },
  heroLine: { width: 32, height: 2, backgroundColor: "rgba(255,255,255,0.5)", borderRadius: 1 },
  content: { padding: 20, marginTop: -20, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  statsCard: {
    flexDirection: "row", borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth, justifyContent: "space-around", alignItems: "center",
  },
  statItem: { alignItems: "center", gap: 4 },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 14, textAlign: "center" },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 11 },
  statDivider: { width: 1, height: 36 },
  hoursCard: {
    flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 16,
    padding: 14, marginBottom: 12, borderWidth: StyleSheet.hairlineWidth,
  },
  hoursIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  hoursTimes: { flex: 1, gap: 6 },
  timeRow: { flexDirection: "row", justifyContent: "space-between" },
  timeLabel: { fontFamily: "Inter_400Regular", fontSize: 13 },
  timeValue: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  operatorRow: {
    flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16,
    padding: 14, marginBottom: 20, borderWidth: StyleSheet.hairlineWidth,
  },
  opIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  opLabel: { fontFamily: "Inter_400Regular", fontSize: 11, marginBottom: 2 },
  opName: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  section: { marginBottom: 20 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 18, marginBottom: 12 },
  stopsContainer: { borderRadius: 16, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth },
  stopRow: { flexDirection: "row", alignItems: "stretch", paddingHorizontal: 16, paddingVertical: 0 },
  trackContainer: { width: 24, alignItems: "center" },
  trackTop: { width: 2, flex: 1, minHeight: 12 },
  trackBottom: { width: 2, flex: 1, minHeight: 12 },
  stopMarker: { marginVertical: 2 },
  stopName: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, paddingVertical: 10, paddingLeft: 12, lineHeight: 18 },
  stopTag: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  tagText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 24, paddingTop: 16, borderTopWidth: 1,
  },
  priceLabel: { fontFamily: "Inter_400Regular", fontSize: 12, marginBottom: 2 },
  priceValue: { fontFamily: "Inter_700Bold", fontSize: 20 },
  planBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  planBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 },
});
