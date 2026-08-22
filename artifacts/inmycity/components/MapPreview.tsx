import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import Constants from "expo-constants";
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from "react-native-maps";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { hasCoordinates, openDirections } from "@/lib/placeActions";

/**
 * A small, non-interactive map showing where a venue is.
 *
 * Deliberately not pannable: an interactive map inside a scrolling detail screen fights the
 * page scroll, which is exactly the kind of thing that makes an app feel awkward one-handed.
 * It answers "where is this" at a glance, and tapping hands off to real navigation.
 *
 * There is a `.web.tsx` sibling that renders nothing, so `react-native-maps` — which has no
 * web support — never enters the web bundle.
 */

type MapPreviewProps = {
  name: string;
  lat?: number | null;
  lng?: number | null;
  /** Approximate span in degrees. Tight enough to show the street, wide enough for context. */
  delta?: number;
};

/**
 * Android renders a blank grey tile without a Google Maps key, so the map is only shown when
 * one is configured. iOS falls back to Apple Maps and always works.
 */
function canRenderMap(): boolean {
  if (Platform.OS === "ios") return true;
  if (Platform.OS !== "android") return false;
  return Boolean(Constants.expoConfig?.extra?.androidMapsConfigured);
}

export function MapPreview({ name, lat, lng, delta = 0.008 }: MapPreviewProps) {
  const colors = useColors();

  if (!hasCoordinates(lat, lng) || !canRenderMap()) return null;

  const latitude = lat as number;
  const longitude = lng as number;

  return (
    <TouchableOpacity
      style={[styles.container, { borderColor: colors.border }]}
      activeOpacity={0.9}
      onPress={() => void openDirections({ lat: latitude, lng: longitude, label: name })}
      accessibilityRole="button"
      accessibilityLabel={`Map showing ${name}. Opens directions.`}
    >
      <MapView
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        initialRegion={{
          latitude,
          longitude,
          latitudeDelta: delta,
          longitudeDelta: delta,
        }}
        pointerEvents="none"
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        liteMode={Platform.OS === "android"}
        cacheEnabled
      >
        <Marker coordinate={{ latitude, longitude }} title={name} />
      </MapView>

      <View style={[styles.hint, { backgroundColor: colors.card }]}>
        <Feather name="navigation" size={12} color={colors.foreground} />
        <Text style={[styles.hintText, { color: colors.foreground }]}>Directions</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 160,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 24,
  },
  hint: {
    position: "absolute",
    right: 10,
    bottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  hintText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
});
