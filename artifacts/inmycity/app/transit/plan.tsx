import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Platform,
  FlatList, TextInput, KeyboardAvoidingView
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useSearchTransitRoutes } from "@workspace/api-client-react";
import { useCity } from "@/context/CityContext";

const TYPE_ICONS: Record<string, React.ComponentProps<typeof Feather>["name"]> = {
  metro: "zap",
  suburban_rail: "minus-circle",
  bus: "truck",
  tram: "activity",
  ferry: "anchor",
};

export default function TransitPlanScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedCity } = useCity();

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [searched, setSearched] = useState(false);

  const isLocal = selectedCity?.name === "Mumbai" || selectedCity?.name === "Bangalore";
  const currencySymbol = isLocal ? "₹" : "$";

  const { data: routes = [], isLoading, refetch } = useSearchTransitRoutes(
    { city: selectedCity?.name, from: from || undefined, to: to || undefined },
    { query: { enabled: false } }
  );

  const handleSearch = () => {
    setSearched(true);
    refetch();
  };

  const swapStations = () => {
    setFrom(to);
    setTo(from);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20), backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Plan Journey</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Search Form */}
      <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* From */}
        <View style={styles.inputRow}>
          <View style={[styles.stationDot, { backgroundColor: "#06b6d4" }]} />
          <TextInput
            style={[styles.input, { color: colors.foreground }]}
            placeholder="From — enter station or area"
            placeholderTextColor={colors.mutedForeground}
            value={from}
            onChangeText={setFrom}
            returnKeyType="next"
          />
          {from.length > 0 && (
            <TouchableOpacity onPress={() => setFrom("")}>
              <Feather name="x" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {/* Divider with swap */}
        <View style={[styles.dividerRow, { borderColor: colors.border }]}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <TouchableOpacity
            style={[styles.swapBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={swapStations}
          >
            <Feather name="repeat" size={14} color="#06b6d4" />
          </TouchableOpacity>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        {/* To */}
        <View style={styles.inputRow}>
          <View style={[styles.stationSquare, { borderColor: "#06b6d4" }]} />
          <TextInput
            style={[styles.input, { color: colors.foreground }]}
            placeholder="To — enter station or area"
            placeholderTextColor={colors.mutedForeground}
            value={to}
            onChangeText={setTo}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          {to.length > 0 && (
            <TouchableOpacity onPress={() => setTo("")}>
              <Feather name="x" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.searchBtn, { backgroundColor: "#06b6d4", opacity: (from || to) ? 1 : 0.5 }]}
          onPress={handleSearch}
          disabled={!from && !to}
        >
          <Feather name="search" size={16} color="#fff" />
          <Text style={styles.searchBtnText}>Find Routes</Text>
        </TouchableOpacity>
      </View>

      {/* Results */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          {[1, 2, 3].map(i => <View key={i} style={[styles.skeletonCard, { backgroundColor: colors.card }]} />)}
        </View>
      ) : searched && routes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="map" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No routes found</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Try different station names or browse all lines
          </Text>
          <TouchableOpacity
            style={[styles.browseBtn, { borderColor: "#06b6d4" }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.browseBtnText, { color: "#06b6d4" }]}>Browse All Lines</Text>
          </TouchableOpacity>
        </View>
      ) : !searched ? (
        <View style={styles.hintContainer}>
          <Text style={[styles.hintTitle, { color: colors.foreground }]}>Quick tips</Text>
          <View style={styles.hintList}>
            {[
              { icon: "map-pin" as const, text: "Type a station name, neighbourhood, or landmark" },
              { icon: "repeat" as const, text: "Tap the swap button to reverse your journey" },
              { icon: "share-2" as const, text: "Browse all lines using the Transit screen" },
            ].map((tip, i) => (
              <View key={i} style={[styles.hintItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.hintIcon, { backgroundColor: "#06b6d41a" }]}>
                  <Feather name={tip.icon} size={14} color="#06b6d4" />
                </View>
                <Text style={[styles.hintText, { color: colors.mutedForeground }]}>{tip.text}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          data={routes}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={[styles.resultsList, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const icon = TYPE_ICONS[item.lineType] ?? "share-2";
            return (
              <TouchableOpacity
                style={[styles.routeCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push(`/transit/route/${item.id}` as any)}
                activeOpacity={0.85}
              >
                {/* Line color bar */}
                <View style={[styles.routeColorBar, { backgroundColor: item.lineColor }]} />
                <View style={styles.routeBody}>
                  {/* Line name + type */}
                  <View style={styles.routeHeader}>
                    <View style={[styles.typePill, { backgroundColor: item.lineColor + "20" }]}>
                      <Feather name={icon} size={11} color={item.lineColor} />
                      <Text style={[styles.typePillText, { color: item.lineColor }]}>{item.lineType.replace("_", " ")}</Text>
                    </View>
                    {item.transfers > 0 && (
                      <View style={[styles.transferPill, { backgroundColor: colors.muted }]}>
                        <Feather name="repeat" size={11} color={colors.mutedForeground} />
                        <Text style={[styles.transferText, { color: colors.mutedForeground }]}>
                          {item.transfers} transfer{item.transfers > 1 ? "s" : ""}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={[styles.routeLineName, { color: colors.foreground }]}>{item.lineName}</Text>

                  {/* From → To */}
                  <View style={styles.journeyRow}>
                    <View style={[styles.dot, { backgroundColor: item.lineColor }]} />
                    <Text style={[styles.journeyStation, { color: colors.foreground }]}>{item.from}</Text>
                  </View>
                  <View style={[styles.journeyLine, { borderColor: item.lineColor + "50" }]} />
                  <View style={styles.journeyRow}>
                    <View style={[styles.square, { borderColor: item.lineColor }]} />
                    <Text style={[styles.journeyStation, { color: colors.foreground }]}>{item.to}</Text>
                  </View>

                  {/* Stats */}
                  <View style={[styles.routeStats, { borderTopColor: colors.border }]}>
                    {item.durationMinutes && (
                      <View style={styles.statItem}>
                        <Feather name="clock" size={12} color={colors.mutedForeground} />
                        <Text style={[styles.statText, { color: colors.foreground }]}>{item.durationMinutes} min</Text>
                      </View>
                    )}
                    {item.fare != null && (
                      <View style={styles.statItem}>
                        <Feather name="credit-card" size={12} color={colors.mutedForeground} />
                        <Text style={[styles.statText, { color: "#06b6d4" }]}>{currencySymbol}{item.fare}</Text>
                      </View>
                    )}
                    <View style={styles.statItem}>
                      <Feather name="list" size={12} color={colors.mutedForeground} />
                      <Text style={[styles.statText, { color: colors.foreground }]}>{item.stops.length} stops</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontFamily: "Inter_700Bold", fontSize: 18 },
  formCard: {
    margin: 16, borderRadius: 20, padding: 16, borderWidth: StyleSheet.hairlineWidth, gap: 0,
    ...Platform.select({
      web: { boxShadow: "0 2px 12px rgba(0,0,0,0.08)" },
      default: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
    }),
  },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  stationDot: { width: 12, height: 12, borderRadius: 6 },
  stationSquare: { width: 12, height: 12, borderRadius: 3, borderWidth: 2 },
  input: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 14, paddingVertical: 8 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 0, marginVertical: 4 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  swapBtn: {
    width: 34, height: 34, borderRadius: 10, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  searchBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, marginTop: 12, paddingVertical: 14, borderRadius: 14,
  },
  searchBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },
  loadingContainer: { padding: 16, gap: 12 },
  skeletonCard: { height: 160, borderRadius: 16 },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center" },
  browseBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5 },
  browseBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  hintContainer: { padding: 16 },
  hintTitle: { fontFamily: "Inter_700Bold", fontSize: 16, marginBottom: 12 },
  hintList: { gap: 10 },
  hintItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth,
  },
  hintIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  hintText: { fontFamily: "Inter_400Regular", fontSize: 13, flex: 1, lineHeight: 18 },
  resultsList: { padding: 16, gap: 12 },
  routeCard: {
    borderRadius: 18, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth, flexDirection: "row",
    ...Platform.select({
      web: { boxShadow: "0 2px 10px rgba(0,0,0,0.07)" },
      default: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3 },
    }),
  },
  routeColorBar: { width: 5 },
  routeBody: { flex: 1, padding: 14, gap: 6 },
  routeHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  typePill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typePillText: { fontFamily: "Inter_600SemiBold", fontSize: 10 },
  transferPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  transferText: { fontFamily: "Inter_500Medium", fontSize: 10 },
  routeLineName: { fontFamily: "Inter_700Bold", fontSize: 14, marginBottom: 6 },
  journeyRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  square: { width: 10, height: 10, borderRadius: 2, borderWidth: 2 },
  journeyStation: { fontFamily: "Inter_500Medium", fontSize: 13 },
  journeyLine: { height: 14, borderLeftWidth: 2, borderStyle: "dashed", marginLeft: 4, marginVertical: 2 },
  routeStats: {
    flexDirection: "row", gap: 16, paddingTop: 10, marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
});
