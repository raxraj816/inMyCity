import React, { useEffect, useRef } from "react";
import { Animated, View, StyleSheet, Easing } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface RobotGreetingProps {
  size?: number;
  color: string;
  backgroundColor: string;
}

export function RobotGreeting({ size = 34, color, backgroundColor }: RobotGreetingProps) {
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const bobAnim = useRef(new Animated.Value(0)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(bounceAnim, {
        toValue: 1,
        friction: 6,
        tension: 55,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(waveAnim, { toValue: 1, duration: 140, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
        Animated.timing(waveAnim, { toValue: -1, duration: 140, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(waveAnim, { toValue: 0.5, duration: 140, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(waveAnim, { toValue: 0, duration: 160, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
      ]),
    ]).start();

    const bobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bobAnim, { toValue: -3, duration: 1200, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(bobAnim, { toValue: 0, duration: 1200, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    );

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 0.7, duration: 1200, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(glowAnim, { toValue: 0.35, duration: 1200, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    );

    bobLoop.start();
    glowLoop.start();

    return () => {
      bobLoop.stop();
      glowLoop.stop();
    };
  }, []);

  const scale = bounceAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
  const rotate = waveAnim.interpolate({ inputRange: [-1, 1], outputRange: ["-8deg", "8deg"] });
  const containerSize = size * 1.25;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { width: containerSize, height: containerSize, borderRadius: containerSize / 2 },
        { transform: [{ scale }, { translateY: bobAnim }] },
      ]}
    >
      <Animated.View
        style={[
          styles.glowRing,
          {
            width: containerSize + 10,
            height: containerSize + 10,
            borderRadius: (containerSize + 10) / 2,
            borderColor: color,
            opacity: glowAnim,
          },
        ]}
      />
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
    borderWidth: 1.5,
  },
  iconCircle: {
    alignItems: "center",
    justifyContent: "center",
  },
});
