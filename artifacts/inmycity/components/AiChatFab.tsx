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
  const bounceIn = useRef(new Animated.Value(0)).current;

  const TAB_BAR_HEIGHT = Platform.OS === "ios" ? 83 : 60;
  const bottom = TAB_BAR_HEIGHT + insets.bottom + 32 + extraBottom;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 1100, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1100, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    );

    Animated.spring(bounceIn, {
      toValue: 1,
      friction: 7,
      tension: 55,
      useNativeDriver: true,
    }).start();

    pulseLoop.start();

    return () => {
      pulseLoop.stop();
    };
  }, []);

  return (
    <Animated.View
      style={[
        styles.fabWrapper,
        { bottom },
        { transform: [{ scale: Animated.multiply(bounceIn, pulseAnim) }] },
      ]}
    >
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => router.push("/ai-chat" as any)}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="face-woman-shimmer-outline" size={18} color="#fff" />
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
  fab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 30,
  },
  fabLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: "#fff",
    letterSpacing: 0.2,
  },
});
