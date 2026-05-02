import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useColors } from "@/hooks/useColors";

type Props = {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
};

export function SkeletonCard({
  width = "100%",
  height = 120,
  borderRadius = 12,
  style,
}: Props) {
  const colors = useColors();
  const animatedValue = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 0.7,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animatedValue]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.muted,
          opacity: animatedValue,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    overflow: "hidden",
  },
});
