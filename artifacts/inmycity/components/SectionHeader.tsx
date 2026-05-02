import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";

type Props = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function SectionHeader({ title, actionLabel, onAction }: Props) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      {actionLabel && onAction && (
        <Text
          style={[styles.action, { color: colors.amber }]}
          onPress={onAction}
        >
          {actionLabel}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  action: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
