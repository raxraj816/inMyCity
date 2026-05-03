import React, { useEffect, useRef } from "react";
import { Animated, View, StyleSheet, Easing } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface RobotGreetingProps {
  size?: number;
  color: string;
  backgroundColor: string;
}

export function RobotGreeting({ size = 44, color, backgroundColor }: RobotGreetingProps) {
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const bobAnim = useRef(new Animated.Value(0)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    // Bounce in on mount
    Animated.spring(bounceAnim, {
      toValue: 1,
      friction: 4,
      tension: 60,
      useNativeDriver: true,
    }).start(() => {
      // After bounce, start wave gesture
      Animated.sequence([
        Animated.timing(waveAnim, { toValue: 1, duration: 180, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
        Animated.timing(waveAnim, { toValue: -1, duration: 180, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(waveAnim, { toValue: 1, duration: 180, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(waveAnim, { toValue: -1, duration: 180, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(waveAnim, { toValue: 0, duration: 200, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
      ]).start();

      // Gentle idle bob loop
      Animated.loop(
        Animated.sequence([
          Animated.timing(bobAnim, { toValue: -6, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
          Animated.timing(bobAnim, { toValue: 0, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        ])
      ).start();

      // Glow pulse loop
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1000, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(glowAnim, { toValue: 0.5, duration: 1000, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        ])
      ).start();
    });
  }, []);

  const scale = bounceAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
  const rotate = waveAnim.interpolate({ inputRange: [-1, 1], outputRange: ["-12deg", "12deg"] });
  const containerSize = size * 2;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { width: containerSize, height: containerSize, borderRadius: containerSize / 2 },
        { transform: [{ scale }, { translateY: bobAnim }] },
      ]}
    >
      {/* Glow ring */}
      <Animated.View
        style={[
          styles.glowRing,
          {
            width: containerSize + 16,
            height: containerSize + 16,
            borderRadius: (containerSize + 16) / 2,
            borderColor: color,
            opacity: glowAnim,
          },
        ]}
      />
      {/* Icon container */}
      <View style={[styles.iconCircle, { width: containerSize, height: containerSize, borderRadius: containerSize / 2, backgroundColor }]}>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <MaterialCommunityIcons name="robot-love-outline" size={size} color={color} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  glowRing: {
    position: "absolute",
    borderWidth: 2,
  },
  iconCircle: {
    alignItems: "center",
    justifyContent: "center",
  },
});
