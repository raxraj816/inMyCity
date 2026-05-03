import React from "react";
import { TouchableOpacity, Text, StyleSheet, Platform } from "react-native";
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

  const TAB_BAR_HEIGHT = Platform.OS === "ios" ? 83 : 60;
  const bottom = TAB_BAR_HEIGHT + insets.bottom + 32 + extraBottom;

  return (
    <TouchableOpacity
      style={[styles.fab, { backgroundColor: colors.primary, bottom }]}
      onPress={() => router.push("/ai-chat" as any)}
      activeOpacity={0.85}
    >
      <MaterialCommunityIcons name="robot-happy-outline" size={16} color="#fff" />
      <Feather name="zap" size={12} color="#fff" style={styles.spark} />
      <Text style={styles.fabLabel}>CityPilot</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 30,
    ...Platform.select({
      ios: {
        shadowColor: "#f97316",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
      },
      android: { elevation: 8 },
      web: { boxShadow: "0 4px 20px rgba(249,115,22,0.4)" } as any,
    }),
  },
  spark: {
    marginLeft: -2,
    marginRight: 1,
  },
  fabLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: "#fff",
    letterSpacing: 0.2,
  },
});