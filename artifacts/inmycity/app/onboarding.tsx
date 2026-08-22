import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  Platform, ScrollView, useWindowDimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";

const ONBOARDING_KEY = "onboarding_complete";

// A non-scrollable pager is `overflow: hidden` on web, and browsers ignore
// smooth programmatic scrolls on such a box — only instant ones land.
const ANIMATE_PAGING = Platform.OS !== "web";

const SLIDES = [
  {
    id: "welcome",
    icon: "city" as const,
    color: "#b45309",
    title: "Welcome to inMyCity",
    body: "Mumbai's decision companion for food, plans, events, transit-aware ideas, and what to do next.",
  },
  {
    id: "discover",
    icon: "compass-outline" as const,
    color: "#0369a1",
    title: "Built for Mumbaikars",
    body: "Find rain-safe plans, budget outings, local train-friendly routes, and neighborhood picks that fit real Mumbai life.",
  },
  {
    id: "plan",
    icon: "map-marker-check-outline" as const,
    color: "#15803d",
    title: "Plan Without App-Hopping",
    body: "Browse weekend goals, save ideas, share plans, and use CityPilot when you want a direct recommendation.",
  },
  {
    id: "go",
    icon: "lightning-bolt" as const,
    color: "#be185d",
    title: "Know What To Do Next",
    body: "Mumbai launches first. Other Indian cities come after this experience becomes genuinely useful here.",
  },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // The pager is full-bleed, so the window width is the page width — and it
  // updates on browser resize, unlike a module-level Dimensions.get() read.
  const { width: slideWidth } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const activeIndexRef = useRef(0);

  const isLast = activeIndex === SLIDES.length - 1;

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  // Keep the current page aligned when the page width changes (browser resize).
  useEffect(() => {
    scrollRef.current?.scrollTo({
      x: activeIndexRef.current * slideWidth,
      animated: false,
    });
  }, [slideWidth]);

  const goNext = () => {
    if (isLast) {
      finish();
    } else {
      const next = activeIndex + 1;
      scrollRef.current?.scrollTo({ x: next * slideWidth, animated: ANIMATE_PAGING });
      setActiveIndex(next);
    }
  };

  const skip = () => finish();

  const finish = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "1");
    router.replace("/(tabs)");
  };

  const renderSlide = (item: typeof SLIDES[0]) => (
    <View key={item.id} style={[styles.slide, { width: slideWidth }]}>
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

      {/* Slides — a plain pager: every page is exactly `slideWidth` wide.
          A FlatList wraps each cell in an auto-height row on web, which
          collapsed the slides; direct children avoid that wrapper. */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={styles.pager}
        contentContainerStyle={styles.pagerContent}
      >
        {SLIDES.map(renderSlide)}
      </ScrollView>

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
  pager: {
    flex: 1,
    alignSelf: "stretch",
  },
  pagerContent: {
    // Vertical centring. On web each child sits in an auto-height paging
    // wrapper, so centring the wrapper is what actually lands; on native the
    // page stretches instead and centres its own content. Same result.
    alignItems: "center",
  },
  slide: {
    // No `flex: 1` here: inside the pager's row layout that resolves to a
    // zero flex-basis on web and squeezes every page into one viewport.
    // The width is set inline from the current window width instead.
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: "stretch",
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
