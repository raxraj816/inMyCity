import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useCity } from "@/context/CityContext";

interface Props {
  title: string;
  topPadding: number;
  rightElement?: React.ReactNode;
}

export function ScreenHeader({ title, topPadding, rightElement }: Props) {
  const colors = useColors();
  const router = useRouter();
  const { selectedCity, showPicker } = useCity();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(2, topPadding - 16),
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backBtn}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather name="arrow-left" size={22} color={colors.foreground} />
      </TouchableOpacity>

      <View style={styles.brandBlock}>
        <Text style={[styles.wordmark, { color: colors.amber }]}>inMyCity</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {title}{selectedCity ? ` · ${selectedCity.name}` : ""}
        </Text>
      </View>

      <View style={styles.rightSlot}>
        {rightElement}

        <TouchableOpacity
          style={[styles.cityPill, { backgroundColor: colors.card, borderColor: colors.border }]}
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

        <TouchableOpacity
          onPress={() => router.push("/profile")}
          activeOpacity={0.75}
          style={[styles.profileBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Feather name="user" size={17} color={colors.foreground} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    flexShrink: 0,
  },
  brandBlock: {
    flex: 1,
  },
  wordmark: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    letterSpacing: -0.5,
    lineHeight: 19,
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
    maxWidth: 100,
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