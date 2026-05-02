import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

type Category = {
  id: string;
  label: string;
  icon: FeatherIconName;
  color: string;
  active: boolean;
  route?: string;
};

const CATEGORIES: Category[] = [
  { id: "dining",     label: "Dining",      icon: "coffee",    color: "#f97316", active: true,  route: "/(tabs)/feeds?section=dining" },
  { id: "places",     label: "Places",      icon: "map-pin",   color: "#6366f1", active: true,  route: "/(tabs)/feeds?section=places" },
  { id: "events",     label: "Events",      icon: "calendar",  color: "#0ea5e9", active: true,  route: "/(tabs)/feeds?section=events" },
  { id: "deals",      label: "Deals",       icon: "tag",       color: "#10b981", active: true,  route: "/(tabs)/feeds?section=deals"  },
  { id: "movies",     label: "Movies",      icon: "film",      color: "#8b5cf6", active: true,  route: "/movies" },
  { id: "hotels",     label: "Hotels",      icon: "home",      color: "#f59e0b", active: true,  route: "/hotels" },
  { id: "activities", label: "Activities",  icon: "zap",       color: "#ef4444", active: true,  route: "/activities" },
  { id: "travel",     label: "Travel",      icon: "navigation",color: "#06b6d4", active: false },
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
          {/* Icon circle */}
          <View style={[styles.iconCircle, { backgroundColor: cat.color + "1a" }]}>
            <Feather
              name={cat.icon}
              size={20}
              color={cat.active ? cat.color : colors.mutedForeground}
            />
          </View>
          <Text
            style={[
              styles.label,
              { color: cat.active ? colors.foreground : colors.mutedForeground },
            ]}
            numberOfLines={1}
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
    width: "22.5%",
    aspectRatio: 0.9,
    borderRadius: 16,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    textAlign: "center",
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
