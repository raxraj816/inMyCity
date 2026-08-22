import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { useColors } from "@/hooks/useColors";

type Props = {
  places: number;
  events: number;
  deals: number;
};

export function StatsBar({ places, events, deals }: Props) {
  const colors = useColors();

  return (
    <View
      style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}
      accessible
      accessibilityLabel={`${places} places, ${events} events, ${deals} deals in this city`}
    >
      <View style={styles.stat}>
        <Text style={[styles.value, { color: colors.foreground }]}>{places}</Text>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Places</Text>
      </View>
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <View style={styles.stat}>
        <Text style={[styles.value, { color: colors.foreground }]}>{events}</Text>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Events</Text>
      </View>
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <View style={styles.stat}>
        <Text style={[styles.value, { color: colors.foreground }]}>{deals}</Text>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Deals</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    ...Platform.select({
      native: {
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      },
      web: { boxShadow: "0 2px 8px rgba(15,23,42,0.05)" },
    }),
  },
  stat: {
    flex: 1,
    alignItems: "center",
  },
  divider: {
    width: 1,
    height: "100%",
  },
  value: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
});
