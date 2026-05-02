import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
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
    <View style={[styles.container, { paddingTop: topPadding, borderBottomColor: colors.border }]}>
      <View style={styles.topRow}>
        <View>
          <Text style={[styles.wordmark, { color: colors.amber }]}>inMyCity</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
        </View>
        <View style={styles.rightSlot}>
          {rightElement}
          {showProfile && (
            <TouchableOpacity
              onPress={() => router.push("/profile")}
              activeOpacity={0.75}
              style={[styles.profileBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Feather name="user" size={17} color={colors.foreground} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      {showCityPicker && (
        <TouchableOpacity
          style={[styles.cityBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={showPicker}
          activeOpacity={0.75}
        >
          <Feather name="map-pin" size={13} color={colors.amber} />
          <Text style={[styles.cityBtnText, { color: colors.foreground }]} numberOfLines={1}>
            {selectedCity?.displayName ?? "Select City"}
          </Text>
          <Feather name="chevron-down" size={13} color={colors.mutedForeground} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  wordmark: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 1,
  },
  rightSlot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  cityBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  cityBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
});
