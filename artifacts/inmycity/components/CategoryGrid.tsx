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
  // Row 1 — Discovery (What's on today?)
  { id: "dining",     label: "Dining",     icon: "silverware-fork-knife", color: "#f97316", active: true, route: "/dining"                  },
  { id: "activities", label: "Activities", icon: "lightning-bolt",        color: "#ef4444", active: true, route: "/activities"               },
  { id: "events",     label: "Events",     icon: "calendar-star",         color: "#0ea5e9", active: true, route: "/events"                   },
  // Row 2 — Lifestyle (How I spend my week)
  { id: "shops",      label: "Shops",      icon: "shopping-outline",      color: "#f97316", active: true, route: "/shops"                    },
  { id: "sports",     label: "Sports &\nFitness", icon: "dumbbell",      color: "#22c55e", active: true, route: "/sports"                   },
  { id: "hotels",     label: "Hotels",     icon: "hanger",                color: "#f59e0b", active: true, route: "/hotels"                   },
  // Row 3 — Practical (Utility + entertainment)
  { id: "transit",    label: "Transit",    icon: "train-variant",         color: "#06b6d4", active: true, route: "/transit"                  },
  { id: "deals",      label: "Deals",      icon: "percent",               color: "#10b981", active: true, route: "/deals"                    },
  { id: "movies",     label: "Movies",     icon: "movie-open",            color: "#8b5cf6", active: true, route: "/movies"                   },
];

export function CategoryGrid() {
  const colors = useColors();
  const router = useRouter();

  const handlePress = (cat: Category) => {
    if (!cat.active || !cat.route) return;
    router.push(cat.route as any);
  };

  return (
    <View style={styles.grid}>
      {CATEGORIES.map((cat) => (
        <TouchableOpacity
          key={cat.id}
          style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => handlePress(cat)}
          activeOpacity={cat.active ? 0.7 : 1}
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
    gap: 8,
    marginBottom: 4,
  },
  tile: {
    width: "31.5%",
    aspectRatio: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 8,
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
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    textAlign: "center",
    lineHeight: 11,
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
