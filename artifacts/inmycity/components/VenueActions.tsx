import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import {
  callPhone,
  hasCoordinates,
  openDirections,
  openWebsite,
} from "@/lib/placeActions";

/**
 * The row of practical actions on a venue: directions, call, website.
 *
 * Directions is the primary action and is always first — for a city app it is the most
 * common thing a user wants after deciding on a place. Actions with no data behind them are
 * omitted rather than shown disabled, so nothing on screen leads to a dead end.
 */

type VenueActionsProps = {
  name: string;
  lat?: number | null;
  lng?: number | null;
  phone?: string | null;
  website?: string | null;
};

type Action = {
  key: string;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  primary?: boolean;
};

export function VenueActions({ name, lat, lng, phone, website }: VenueActionsProps) {
  const colors = useColors();

  const actions: Action[] = [];

  if (hasCoordinates(lat, lng)) {
    actions.push({
      key: "directions",
      icon: "navigation",
      label: "Directions",
      primary: true,
      onPress: () => void openDirections({ lat: lat as number, lng: lng as number, label: name }),
    });
  }

  if (phone) {
    actions.push({
      key: "call",
      icon: "phone",
      label: "Call",
      onPress: () => void callPhone(phone),
    });
  }

  if (website) {
    actions.push({
      key: "website",
      icon: "globe",
      label: "Website",
      onPress: () => void openWebsite(website),
    });
  }

  if (actions.length === 0) return null;

  return (
    <View style={styles.row}>
      {actions.map((action) => {
        const isPrimary = action.primary === true;
        return (
          <TouchableOpacity
            key={action.key}
            style={[
              styles.action,
              // Directions carries the longest label, so give it the extra width rather
              // than letting it truncate to "Direct…".
              isPrimary && styles.actionPrimary,
              {
                backgroundColor: isPrimary ? colors.amber : colors.card,
                borderColor: isPrimary ? colors.amber : colors.border,
              },
            ]}
            onPress={action.onPress}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={
              isPrimary ? `Get directions to ${name}` : `${action.label} ${name}`
            }
          >
            <Feather
              name={action.icon}
              size={16}
              color={isPrimary ? "#fff" : colors.foreground}
            />
            <Text
              style={[
                styles.label,
                { color: isPrimary ? "#fff" : colors.foreground },
              ]}
              numberOfLines={1}
            >
              {action.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
    // No horizontal padding: the component inherits whatever the parent screen uses.
    marginBottom: 24,
  },
  action: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    // 48pt clears the one-handed-on-a-train tap target bar.
    minHeight: 48,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionPrimary: {
    flex: 1.2,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    flexShrink: 1,
  },
});
