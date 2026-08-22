import React, { useEffect, useRef } from "react";
import { TouchableOpacity, StyleSheet, Platform, Animated, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

interface AiChatFabProps {
  extraBottom?: number;
}

export function AiChatFab({ extraBottom = 0 }: AiChatFabProps) {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const bounceIn = useRef(new Animated.Value(0)).current;

  const TAB_BAR_HEIGHT = Platform.OS === "ios" ? 83 : 60;
  const bottom = TAB_BAR_HEIGHT + insets.bottom + 32 + extraBottom;

  useEffect(() => {
    Animated.spring(bounceIn, {
      toValue: 1,
      friction: 7,
      tension: 55,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.fabWrapper,
        { bottom },
        { transform: [{ scale: bounceIn }] },
      ]}
    >
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.card, borderColor: colors.amber + "66" }]}
        onPress={() => router.push("/ai-chat" as any)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Open CityPilot"
      >
        <View style={[styles.welcomeHalo, { backgroundColor: colors.amber + "18" }]}>
          <View style={[styles.avatarWrap, { backgroundColor: colors.amber }]}>
            <View style={styles.avatarFace}>
              <MaterialCommunityIcons name="face-woman-shimmer-outline" size={30} color={colors.navy} />
            </View>
            <View style={[styles.namaskarBadge, { backgroundColor: colors.card }]}>
              <MaterialCommunityIcons name="hands-pray" size={14} color={colors.amber} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fabWrapper: {
    position: "absolute",
    right: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    alignItems: "center",
    justifyContent: "center",
    width: 72,
    height: 72,
    borderRadius: 999,
    borderWidth: 1,
    ...Platform.select({
      native: {
        shadowColor: "#c2410c",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.22,
        shadowRadius: 16,
        elevation: 8,
      },
      web: { boxShadow: "0 10px 28px rgba(249,115,22,0.24)" } as any,
    }),
  },
  welcomeHalo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarFace: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#fff7ed",
    alignItems: "center",
    justifyContent: "center",
  },
  namaskarBadge: {
    position: "absolute",
    right: -3,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
});
