import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useGetTransitRouteById, getGetTransitRouteByIdQueryKey } from "@workspace/api-client-react";
import { ErrorFallback } from "@/components/ErrorFallback";

const TYPE_ICONS: Record<string, React.ComponentProps<typeof Feather>["name"]> = {
  metro: "zap",
  suburban_rail: "minus-circle",
  bus: "truck",
  tram: "activity",
  ferry: "anchor",
};

export default function TransitRouteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const routeId = parseInt(id, 10);
  const { data: route, isLoading, error, refetch } = useGetTransitRouteById(routeId, {
    query: { enabled: !!routeId, queryKey: getGetTransitRouteByIdQueryKey(routeId) }
  });

  if (error) return <ErrorFallback error={error as Error} resetError={refetch} />;
  if (isLoading || !route) return <View style={[styles.container, { backgroundColor: colors.background }]} />;

  const isLocal = route.city === "Mumbai" || route.city === "Bangalore";
  const currencySymbol = isLocal ? "₹" : "$";
  const icon = TYPE_ICONS[route.lineType] ?? "share-2";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: route.lineColor, paddingTop: Math.max(insets.top, 20) }]}>
          <View style={styles.heroTopRow}>
            <TouchableOpacity style={[styles.circleBtn, { backgroundColor: "rgba(0,0,0,0.25)" }]} onPress={() => router.back()}>
              <Feather name="arrow-left" size={22} color="#fff" />
            </TouchableOpacity>
            {route.transfers > 0 && (
              <View style={[styles.transferBadge, { backgroundColor: "rgba(0,0,0,0.25)" }]}>
                <Feather name="repeat" size={12} color="#fff" />
                <Text style={styles.transferBadgeText}>{route.transfers} transfer{route.transfers > 1 ? "s" : ""}</Text>
              </View>
            )}
          </View>

          <View style={[styles.typePill, { backgroundColor: "rgba(0,0,0,0.25)" }]}>
            <Feather name={icon} size={13} color="#fff" />
            <Text style={styles.typePillText}>{route.lineType.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</Text>
          </View>
          <Text style={styles.heroLineName}>{route.lineName}</Text>

          {/* Journey */}
          <View style={styles.journeyHero}>
            <View style={styles.journeyEndpoint}>
              <View style={[styles.endDot, { backgroundColor: "#fff" }]} />
              <Text style={styles.endStation}>{route.from}</Text>
            </View>
            <View style={styles.journeyMid}>
              {route.durationMinutes && (
                <Text style={styles.durationText}>{route.durationMinutes} min</Text>
              )}
              <View style={styles.arrowLine}>
                <View style={styles.dashedLine} />
                <Feather name="arrow-right" size={16} color="rgba(255,255,255,0.7)" />
              </View>
              <Text style={styles.stopsInLine}>{route.stops.length} stops</Text>
            </View>
            <View style={styles.journeyEndpoint}>
              <View style={[styles.endSquare, { borderColor: "#fff" }]} />
              <Text style={styles.endStation}>{route.to}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.content, { backgroundColor: colors.background, paddingBottom: insets.bottom + 100 }]}>
          {/* Quick stats */}
          <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {route.durationMinutes && (
              <View style={styles.statItem}>
                <Feather name="clock" size={18} color={route.lineColor} />
                <Text style={[styles.statValue, { color: colors.foreground }]}>{route.durationMinutes} min</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Duration</Text>
              </View>
            )}
            {route.fare != null && (
              <>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                  <Feather name="credit-card" size={18} color={route.lineColor} />
                  <Text style={[styles.statValue, { color: colors.foreground }]}>{currencySymbol}{route.fare}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Fare</Text>
                </View>
              </>
            )}
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Feather name="repeat" size={18} color={route.lineColor} />
              <Text style={[styles.statValue, { color: colors.foreground }]}>{route.transfers}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Transfers</Text>
            </View>
          </View>

          {/* Transfer instructions */}
          {route.transferDetails && route.transferDetails.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Transfers</Text>
              {route.transferDetails.map((detail, i) => (
                <View key={i} style={[styles.transferCard, { backgroundColor: colors.card, borderColor: route.lineColor + "40" }]}>
                  <View style={[styles.transferIcon, { backgroundColor: route.lineColor + "15" }]}>
                    <Feather name="repeat" size={16} color={route.lineColor} />
                  </View>
                  <Text style={[styles.transferDetail, { color: colors.foreground }]}>{detail}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Tips */}
          {route.tips && (
            <View style={[styles.tipsCard, { backgroundColor: route.lineColor + "0d", borderColor: route.lineColor + "30" }]}>
              <View style={styles.tipsHeader}>
                <Feather name="info" size={16} color={route.lineColor} />
                <Text style={[styles.tipsTitle, { color: route.lineColor }]}>Commuter Tips</Text>
              </View>
              <Text style={[styles.tipsText, { color: colors.foreground }]}>{route.tips}</Text>
            </View>
          )}

          {/* Stop-by-stop */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Stops on this route</Text>
            <View style={[styles.stopsContainer, { borderColor: colors.border }]}>
              {route.stops.map((stop, index) => {
                const isFirst = index === 0;
                const isLast = index === route.stops.length - 1;
                return (
                  <View key={`${stop}-${index}`} style={styles.stopRow}>
                    <View style={styles.trackContainer}>
                      <View style={[styles.trackTop, { backgroundColor: isFirst ? "transparent" : route.lineColor + "50" }]} />
                      <View style={[
                        styles.stopDot,
                        isFirst || isLast
                          ? { backgroundColor: route.lineColor, width: 14, height: 14, borderRadius: isLast ? 3 : 7 }
                          : { backgroundColor: colors.background, borderColor: route.lineColor, borderWidth: 2, width: 10, height: 10, borderRadius: 5 }
                      ]} />
                      <View style={[styles.trackBottom, { backgroundColor: isLast ? "transparent" : route.lineColor + "50" }]} />
                    </View>
                    <Text style={[
                      styles.stopName,
                      { color: (isFirst || isLast) ? colors.foreground : colors.mutedForeground },
                      (isFirst || isLast) && { fontFamily: "Inter_700Bold" }
                    ]}>
                      {stop}
                      {isFirst && <Text style={[styles.stopTag, { color: route.lineColor }]}> · Board here</Text>}
                      {isLast && <Text style={[styles.stopTag, { color: route.lineColor }]}> · Alight here</Text>}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom || 24, backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <View>
          <Text style={[styles.fareLabel, { color: colors.mutedForeground }]}>Total fare</Text>
          <Text style={[styles.fareValue, { color: colors.foreground }]}>
            {route.fare != null ? `${currencySymbol}${route.fare}` : "Check at station"}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.newSearchBtn, { backgroundColor: route.lineColor }]}
          onPress={() => router.push("/transit/plan" as any)}
        >
          <Feather name="search" size={16} color="#fff" />
          <Text style={styles.newSearchText}>New Search</Text>
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
  transferBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  transferBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#fff" },
  typePill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, alignSelf: "flex-start", marginBottom: 8 },
  typePillText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#fff" },
  heroLineName: { fontFamily: "Inter_700Bold", fontSize: 20, color: "#fff", marginBottom: 20 },
  journeyHero: { flexDirection: "row", alignItems: "center", gap: 8 },
  journeyEndpoint: { alignItems: "center", gap: 6, flex: 1 },
  endDot: { width: 12, height: 12, borderRadius: 6 },
  endSquare: { width: 12, height: 12, borderRadius: 3, borderWidth: 2 },
  endStation: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff", textAlign: "center" },
  journeyMid: { alignItems: "center", gap: 2 },
  durationText: { fontFamily: "Inter_700Bold", fontSize: 13, color: "#fff" },
  arrowLine: { flexDirection: "row", alignItems: "center", gap: 2 },
  dashedLine: { width: 28, height: 2, backgroundColor: "rgba(255,255,255,0.5)", borderRadius: 1 },
  stopsInLine: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.75)" },
  content: { padding: 20, marginTop: -20, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  statsRow: {
    flexDirection: "row", borderRadius: 16, padding: 16, marginBottom: 20,
    borderWidth: StyleSheet.hairlineWidth, justifyContent: "space-around", alignItems: "center",
  },
  statItem: { alignItems: "center", gap: 4 },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 14 },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 11 },
  statDivider: { width: 1, height: 36 },
  section: { marginBottom: 20 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 18, marginBottom: 12 },
  transferCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1,
  },
  transferIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  transferDetail: { fontFamily: "Inter_400Regular", fontSize: 13, flex: 1, lineHeight: 20 },
  tipsCard: { borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1 },
  tipsHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  tipsTitle: { fontFamily: "Inter_700Bold", fontSize: 14 },
  tipsText: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 22 },
  stopsContainer: { borderRadius: 16, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth },
  stopRow: { flexDirection: "row", alignItems: "stretch", paddingHorizontal: 16 },
  trackContainer: { width: 24, alignItems: "center" },
  trackTop: { width: 2, flex: 1, minHeight: 12 },
  trackBottom: { width: 2, flex: 1, minHeight: 12 },
  stopDot: { marginVertical: 2 },
  stopName: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, paddingVertical: 10, paddingLeft: 12, lineHeight: 18 },
  stopTag: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 24, paddingTop: 16, borderTopWidth: 1,
  },
  fareLabel: { fontFamily: "Inter_400Regular", fontSize: 12, marginBottom: 2 },
  fareValue: { fontFamily: "Inter_700Bold", fontSize: 20 },
  newSearchBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  newSearchText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 },
});
