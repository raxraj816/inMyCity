import React, { useState, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, Platform, FlatList,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const ONBOARDING_KEY = "onboarding_complete";

const SLIDES = [
  {
    id: "welcome",
    icon: "city" as const,
    color: "#f59e0b",
    title: "Welcome to inMyCity",
    body: "Your smart guide to the best of Mumbai, Bangalore, New York, and San Francisco — all in one place.",
  },
  {
    id: "discover",
    icon: "compass-outline" as const,
    color: "#0ea5e9",
    title: "Discover What's Around",
    body: "Dining, events, hotels, activities, transit — every corner of your city, explored and curated for you.",
  },
  {
    id: "plan",
    icon: "map-marker-check-outline" as const,
    color: "#22c55e",
    title: "Plan Your Day",
    body: "Browse weekend goals, follow city guides, and save the spots you love — all offline-ready.",
  },
  {
    id: "go",
    icon: "lightning-bolt" as const,
    color: "#ec4899",
    title: "Your City Awaits",
    body: "Switch cities anytime. Ask our AI assistant anything. Let's get started.",
  },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const isLast = activeIndex === SLIDES.length - 1;

  const goNext = () => {
    if (isLast) {
      finish();
    } else {
      const next = activeIndex + 1;
      listRef.current?.scrollToIndex({ index: next, animated: true });
      setActiveIndex(next);
    }
  };

  const skip = () => finish();

  const finish = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "1");
    router.replace("/(tabs)");
  };

  const renderSlide = ({ item }: { item: typeof SLIDES[0] }) => (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <View style={[styles.iconCircle, { backgroundColor: item.color + "20" }]}>
        <MaterialCommunityIcons name={item.icon} size={72} color={item.color} />
      </View>
      <Text style={[styles.slideTitle, { color: colors.foreground }]}>{item.title}</Text>
      <Text style={[styles.slideBody, { color: colors.mutedForeground }]}>{item.body}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Skip */}
      {!isLast && (
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={skip}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[styles.skipText, { color: colors.mutedForeground }]}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={s => s.id}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={styles.flatList}
      />

      {/* Dot indicators */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i === activeIndex ? SLIDES[activeIndex].color : colors.border,
                width: i === activeIndex ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>

      {/* CTA button */}
      <TouchableOpacity
        style={[
          styles.btn,
          {
            backgroundColor: SLIDES[activeIndex].color,
            marginBottom: insets.bottom + 24,
          },
        ]}
        onPress={goNext}
        activeOpacity={0.85}
      >
        <Text style={styles.btnText}>
          {isLast ? "Get Started" : "Next"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
  },
  skipBtn: {
    alignSelf: "flex-end",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  skipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
  },
  flatList: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 24,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
  },
  slideTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    textAlign: "center",
    lineHeight: 32,
  },
  slideBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  dots: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 32,
    alignItems: "center",
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  btn: {
    marginHorizontal: 24,
    alignSelf: "stretch",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  btnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: "#fff",
  },
});
