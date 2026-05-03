import React, { useEffect, useRef } from "react";
import { TouchableOpacity, Text, StyleSheet, Platform, Animated, Easing } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
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

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const bounceIn = useRef(new Animated.Value(0)).current;

  const TAB_BAR_HEIGHT = Platform.OS === "ios" ? 83 : 60;
  const bottom = TAB_BAR_HEIGHT + insets.bottom + 32 + extraBottom;

  useEffect(() => {
    // Bounce in on mount
    Animated.spring(bounceIn, {
      toValue: 1,
      friction: 5,
      tension: 70,
      useNativeDriver: true,
    }).start();

    // Gentle idle pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    ).start();

    // Glow ring pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1200, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.fabWrapper,
        { bottom },
        { transform: [{ scale: Animated.multiply(bounceIn, pulseAnim) }] },
      ]}
    >
      {/* Expanding glow ring */}
      <Animated.View
        style={[
          styles.glowRing,
          {
            backgroundColor: colors.primary,
            opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.25] }),
            transform: [{ scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }) }],
          },
        ]}
      />
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => router.push("/ai-chat" as any)}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="robot-love-outline" size={18} color="#fff" />
        <Text style={styles.fabLabel}>CityPilot</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fabWrapper: {
    position: "absolute",
    right: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  glowRing: {
    position: "absolute",
    width: 160,
    height: 46,
    borderRadius: 30,
  },
  fab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 30,
    ...Platform.select({
      ios: {
        shadowColor: "#f97316",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
      web: { boxShadow: "0 4px 20px rgba(249,115,22,0.45)" } as any,
    }),
  },
  fabLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: "#fff",
    letterSpacing: 0.2,
  },
});
