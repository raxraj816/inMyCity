import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import type { NearbyControls } from "@/hooks/useNearby";

/**
 * "Near me" and "Open now" chips.
 *
 * Two toggles, no configuration screen — these are the filters that change a decision in a
 * city app, so they sit inline with the category pills rather than behind a filter sheet.
 * Both default to off, so the list is useful before the user touches anything.
 */

type NearbyFiltersProps = {
  controls: NearbyControls;
  /** Accent colour of the host screen, so the chips match their surroundings. */
  accent: string;
  /**
   * Whether to offer "Open now". Only endpoints that evaluate opening hours support it —
   * places and activities today — and a chip that filters nothing is worse than no chip.
   */
  showOpenNow?: boolean;
};

export function NearbyFilters({ controls, accent, showOpenNow = true }: NearbyFiltersProps) {
  const colors = useColors();
  const {
    nearbyEnabled,
    openNowEnabled,
    isLocating,
    locationDenied,
    toggleNearby,
    toggleOpenNow,
  } = controls;

  const chip = (active: boolean) => [
    styles.chip,
    {
      backgroundColor: active ? accent : colors.card,
      borderColor: active ? accent : colors.border,
    },
  ];

  const chipText = (active: boolean) => [
    styles.chipText,
    { color: active ? "#fff" : colors.foreground },
  ];

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={chip(nearbyEnabled)}
        onPress={toggleNearby}
        activeOpacity={0.8}
        disabled={isLocating}
        accessibilityRole="switch"
        aria-checked={nearbyEnabled}
        aria-disabled={isLocating}
        accessibilityState={{ checked: nearbyEnabled, disabled: isLocating }}
        accessibilityLabel="Sort by distance from me"
        accessibilityHint={
          nearbyEnabled
            ? "Turns off distance sorting"
            : "Uses your location to show the closest places first"
        }
      >
        {isLocating ? (
          <ActivityIndicator size="small" color={colors.foreground} />
        ) : (
          <Feather
            name="navigation"
            size={13}
            color={nearbyEnabled ? "#fff" : colors.foreground}
          />
        )}
        <Text style={chipText(nearbyEnabled)}>
          {isLocating ? "Locating…" : "Near me"}
        </Text>
      </TouchableOpacity>

      {showOpenNow && (
      <TouchableOpacity
        style={chip(openNowEnabled)}
        onPress={toggleOpenNow}
        activeOpacity={0.8}
        accessibilityRole="switch"
        aria-checked={openNowEnabled}
        accessibilityState={{ checked: openNowEnabled }}
        accessibilityLabel="Show only places open now"
      >
        <Feather
          name="clock"
          size={13}
          color={openNowEnabled ? "#fff" : colors.foreground}
        />
        <Text style={chipText(openNowEnabled)}>Open now</Text>
      </TouchableOpacity>
      )}

      {locationDenied && (
        <Text style={[styles.hint, { color: colors.mutedForeground }]} numberOfLines={2}>
          Location is off. Enable it in Settings to sort by distance.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  hint: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    flexBasis: "100%",
  },
});
