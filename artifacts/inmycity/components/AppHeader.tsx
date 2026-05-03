import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useCity } from "@/context/CityContext";

interface Props {
  subtitle: string;
  topPadding: number;
  showCityPicker?: boolean;
  showProfile?: boolean;
  rightElement?: React.ReactNode;
}

export function AppHeader({
  subtitle,
  topPadding,
  showCityPicker = false,
  showProfile = true,
  rightElement,
}: Props) {
  const colors = useColors();
  const router = useRouter();
  const { selectedCity, showPicker } = useCity();

  return (
    <View
      style={[
        styles.container,
        { paddingTop: Math.max(2, topPadding - 16), borderBottomColor: colors.border },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.wordmarkBlock}>
          <Text style={[styles.wordmark, { color: colors.amber }]}>inMyCity</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}> 
            {subtitle}
          </Text>
        </View>

        <View style={styles.rightSlot}>
          {rightElement}

          {showCityPicker && (
            <TouchableOpacity
              style={[
                styles.cityPill,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={showPicker}
              activeOpacity={0.75}
            >
              <Feather name="map-pin" size={11} color={colors.amber} />
              <Text
                style={[styles.cityPillText, { color: colors.foreground }]}
                numberOfLines={1}
              >
                {selectedCity?.name ?? "City"}
              </Text>
              <Feather name="chevron-down" size={11} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}

          {showProfile && (
            <TouchableOpacity
              onPress={() => router.push("/profile")}
              activeOpacity={0.75}
              style={[
                styles.profileBtn,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Feather name="user" size={17} color={colors.foreground} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  wordmarkBlock: {
    flex: 1,
  },
  wordmark: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    letterSpacing: -0.5,
    lineHeight: 22,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 0,
  },

  rightSlot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },

  cityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: 120,
  },
  cityPillText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    flexShrink: 1,
  },

  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
});