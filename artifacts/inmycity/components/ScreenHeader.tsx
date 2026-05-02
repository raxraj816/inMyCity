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
  const { selectedCity } = useCity();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: topPadding,
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

      {rightElement ? (
        <View style={styles.rightSlot}>{rightElement}</View>
      ) : (
        <View style={styles.spacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
  },
  brandBlock: {
    flex: 1,
  },
  wordmark: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 1,
  },
  rightSlot: {
    alignItems: "center",
    justifyContent: "center",
  },
  spacer: {
    width: 38,
  },
});
