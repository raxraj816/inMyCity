import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DEFAULT_CITY_ID,
  SUPPORTED_CITIES,
  type CityStatus,
  type SupportedCity,
} from "@workspace/city-config";

export { SUPPORTED_CITIES };
export type { CityStatus, SupportedCity };

const STORAGE_KEY = "@inmycity/selected_city";
const DETECT_RADIUS_KM = 80;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function detectCityFromCoords(lat: number, lng: number): SupportedCity | null {
  const liveCities = SUPPORTED_CITIES.filter((c) => c.status === "live");
  let nearest: SupportedCity | null = null;
  let minDist = Infinity;
  for (const city of liveCities) {
    const dist = haversineKm(lat, lng, city.lat, city.lng);
    if (dist < minDist) {
      minDist = dist;
      nearest = city;
    }
  }
  return minDist <= DETECT_RADIUS_KM ? nearest : null;
}

type CityContextType = {
  selectedCity: SupportedCity | null;
  setCity: (city: SupportedCity) => void;
  pickerVisible: boolean;
  showPicker: () => void;
  hidePicker: () => void;
  isAutoDetected: boolean;
};

const CityContext = createContext<CityContextType | null>(null);

export function CityProvider({ children }: { children: React.ReactNode }) {
  const [selectedCity, setSelectedCityState] = useState<SupportedCity | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [isAutoDetected, setIsAutoDetected] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        const saved = SUPPORTED_CITIES.find((c) => c.id === raw);
        if (saved) {
          setSelectedCityState(saved);
          return;
        }
      }
      const fallback = SUPPORTED_CITIES.find((c) => c.id === DEFAULT_CITY_ID) ?? null;
      setSelectedCityState(fallback);
      setIsAutoDetected(true);
    });
  }, []);

  const setCity = useCallback((city: SupportedCity) => {
    setSelectedCityState(city);
    setIsAutoDetected(false);
    AsyncStorage.setItem(STORAGE_KEY, city.id);
  }, []);

  const showPicker = useCallback(() => setPickerVisible(true), []);
  const hidePicker = useCallback(() => setPickerVisible(false), []);

  return (
    <CityContext.Provider
      value={{ selectedCity, setCity, pickerVisible, showPicker, hidePicker, isAutoDetected }}
    >
      {children}
    </CityContext.Provider>
  );
}

export function useCity() {
  const ctx = useContext(CityContext);
  if (!ctx) throw new Error("useCity must be used within CityProvider");
  return ctx;
}
