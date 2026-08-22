import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

type Props = {
  rating: number;
  maxStars?: number;
  size?: number;
};

export function RatingStars({ rating, maxStars = 5, size = 16 }: Props) {
  const colors = useColors();

  return (
    // Read as one value rather than five separate star icons.
    <View
      style={styles.container}
      accessible
      accessibilityLabel={`Rated ${rating.toFixed(1)} out of ${maxStars}`}
    >
      {Array.from({ length: maxStars }).map((_, i) => (
        <Feather
          key={i}
          name="star"
          size={size}
          color={colors.amber}
          style={i < Math.round(rating) ? styles.filled : styles.empty}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  filled: {
    opacity: 1,
  },
  empty: {
    opacity: 0.3,
  },
});
