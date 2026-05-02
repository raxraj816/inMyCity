import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";

import { useColors } from "@/hooks/useColors";
import { useCity, SUPPORTED_CITIES, type SupportedCity } from "@/context/CityContext";

const COUNTRY_FLAGS: Record<string, string> = {
  India: "🇮🇳",
  USA: "🇺🇸",
};

function CityRow({ city, isSelected, onPress }: { city: SupportedCity; isSelected: boolean; onPress: () => void }) {
  const colors = useColors();
  const isSoon = city.status === "soon";

  return (
    <TouchableOpacity
      onPress={isSoon ? undefined : onPress}
      activeOpacity={isSoon ? 1 : 0.7}
      style={[
        styles.cityRow,
        { borderBottomColor: colors.border },
        isSoon && styles.cityRowDim,
      ]}
    >
      <View style={[styles.flagCircle, { backgroundColor: colors.muted }]}>
        <Text style={styles.flagText}>{COUNTRY_FLAGS[city.country] ?? "🌍"}</Text>
      </View>
      <View style={styles.cityInfo}>
        <Text style={[styles.cityName, { color: isSoon ? colors.mutedForeground : colors.foreground }]}>
          {city.name}
        </Text>
        <Text style={[styles.cityTagline, { color: colors.mutedForeground }]}>
          {isSoon ? "Coming soon" : city.tagline}
        </Text>
      </View>
      {isSelected && !isSoon && (
        <View style={[styles.selectedDot, { backgroundColor: colors.amber }]}>
          <Feather name="check" size={12} color="#fff" />
        </View>
      )}
      {isSoon && (
        <View style={[styles.soonBadge, { backgroundColor: colors.muted }]}>
          <Text style={[styles.soonBadgeText, { color: colors.mutedForeground }]}>Soon</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function CityPicker() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedCity, setCity, pickerVisible, hidePicker } = useCity();

  const liveCities = SUPPORTED_CITIES.filter((c) => c.status === "live");
  const soonCities = SUPPORTED_CITIES.filter((c) => c.status === "soon");
  const allCities = [...liveCities, ...soonCities];

  const handleSelect = (city: SupportedCity) => {
    if (city.status === "soon") return;
    setCity(city);
    hidePicker();
  };

  const bottomPad = Platform.OS === "web" ? 24 : insets.bottom + 16;

  return (
    <Modal
      visible={pickerVisible}
      transparent
      animationType="slide"
      onRequestClose={hidePicker}
    >
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={hidePicker}>
        {Platform.OS === "ios" ? (
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.backdropFill]} />
        )}
      </TouchableOpacity>

      <View style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: bottomPad }]}>
        {/* Handle bar */}
        <View style={[styles.handleBar, { backgroundColor: colors.border }]} />

        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={{ width: 36 }} />
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Choose City</Text>
          <TouchableOpacity onPress={hidePicker} style={styles.closeBtn}>
            <Feather name="x" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Section: Live */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>LIVE NOW</Text>
        {liveCities.map((city) => (
          <CityRow
            key={city.id}
            city={city}
            isSelected={selectedCity?.id === city.id}
            onPress={() => handleSelect(city)}
          />
        ))}

        {/* Section: Coming Soon */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 8 }]}>COMING SOON</Text>
        {soonCities.map((city) => (
          <CityRow
            key={city.id}
            city={city}
            isSelected={false}
            onPress={() => {}}
          />
        ))}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  backdropFill: {
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    ...Platform.select({
      web: { boxShadow: "0 -4px 32px rgba(0,0,0,0.12)" },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 20,
      },
    }),
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  headerTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  cityRowDim: {
    opacity: 0.5,
  },
  flagCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  flagText: {
    fontSize: 22,
  },
  cityInfo: {
    flex: 1,
  },
  cityName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    marginBottom: 2,
  },
  cityTagline: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  selectedDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  soonBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  soonBadgeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
});
