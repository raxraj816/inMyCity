import React from "react";
import { ScrollView, Text, TouchableOpacity, StyleSheet, View } from "react-native";
import { useColors } from "@/hooks/useColors";

type Props = {
  categories: string[];
  selectedCategory: string | null;
  onSelect: (category: string | null) => void;
};

export function CategoryFilter({ categories, selectedCategory, onSelect }: Props) {
  const colors = useColors();

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        <TouchableOpacity
          style={[
            styles.chip,
            {
              backgroundColor: selectedCategory === null ? colors.navy : colors.card,
              borderColor: selectedCategory === null ? colors.navy : colors.border,
            },
          ]}
          onPress={() => onSelect(null)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.text,
              { color: selectedCategory === null ? colors.card : colors.foreground },
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.chip,
              {
                backgroundColor:
                  selectedCategory === category ? colors.navy : colors.card,
                borderColor:
                  selectedCategory === category ? colors.navy : colors.border,
              },
            ]}
            onPress={() => onSelect(category)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.text,
                {
                  color:
                    selectedCategory === category ? colors.card : colors.foreground,
                },
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: 12,
  },
  container: {
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  text: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    textTransform: "capitalize",
  },
});
