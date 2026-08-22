import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

type Category = {
  id: string;
  label: string;
  icon: MCIName;
  color: string;
  active: boolean;
  route?: string;
};

const CATEGORIES: Category[] = [
  // Row 1 — Going out (What's on today?)
  { id: "events",     label: "Events",     icon: "calendar-star",         color: "#0369a1", active: true, route: "/events"     },
  { id: "activities", label: "Activities", icon: "lightning-bolt",        color: "#dc2626", active: true, route: "/activities" },
  { id: "sports",     label: "Sports &\nFitness", icon: "dumbbell",      color: "#15803d", active: true, route: "/sports"     },
  // Row 2 — After dark and on screen
  { id: "nightlife",  label: "Nightlife",  icon: "glass-cocktail",        color: "#be185d", active: true, route: "/nightlife"  },
  { id: "movies",     label: "Movies",     icon: "movie-open",            color: "#4f46e5", active: true, route: "/movies"     },
  { id: "explore",    label: "Explore",    icon: "map-outline",           color: "#0e7490", active: true, route: "/cityguide"  },
  // Row 3 — Everyday (Spending and eating)
  { id: "deals",      label: "Deals",      icon: "percent",               color: "#047857", active: true, route: "/deals"      },
  { id: "shops",      label: "Shops",      icon: "shopping-outline",      color: "#c2410c", active: true, route: "/shops"      },
  { id: "dining",     label: "Dining",     icon: "silverware-fork-knife", color: "#c2410c", active: true, route: "/dining"     },
];

export function CategoryGrid() {
  const colors = useColors();
  const router = useRouter();

  const handlePress = (cat: Category) => {
    if (!cat.active || !cat.route) return;
    router.push(cat.route as any);
  };

  return (
    <View style={styles.grid} accessibilityRole="menu">
      {CATEGORIES.map((cat) => (
        <TouchableOpacity
          key={cat.id}
          style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => handlePress(cat)}
          activeOpacity={cat.active ? 0.7 : 1}
          accessibilityRole="button"
          accessibilityState={{ disabled: !cat.active }}
          accessibilityLabel={cat.label.replace("\n", " ") + (cat.active ? "" : ", coming soon")}
          accessibilityHint={cat.active ? `Opens ${cat.label.replace("\n", " ").toLowerCase()}` : undefined}
        >
          <View style={[styles.iconCircle, { backgroundColor: cat.color + "1a" }]}>
            <MaterialCommunityIcons
              name={cat.icon}
              size={22}
              color={cat.active ? cat.color : colors.mutedForeground}
            />
          </View>
          <Text
            style={[styles.label, { color: cat.active ? colors.foreground : colors.mutedForeground }]}
            numberOfLines={2}
          >
            {cat.label}
          </Text>
          {!cat.active && (
            <View style={[styles.soonBadge, { backgroundColor: colors.muted }]}>
              <Text style={[styles.soonText, { color: colors.mutedForeground }]}>Soon</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 4,
  },
  tile: {
    width: "30.5%",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    position: "relative",
    ...Platform.select({
      web: { boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
      },
    }),
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    textAlign: "center",
    lineHeight: 12,
  },
  soonBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  soonText: {
    fontFamily: "Inter_500Medium",
    fontSize: 8,
    letterSpacing: 0.3,
  },
});
