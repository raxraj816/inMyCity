import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DEFAULT_CITY_ID,
  SUPPORTED_CITIES,
  type CityStatus,
  type SupportedCity,
} from "@workspace/city-config";
import { useLocation } from "./LocationContext";

export { SUPPORTED_CITIES };
export type { CityStatus, SupportedCity };

const STORAGE_KEY = "@inmycity/selected_city";

/**
 * Known synchronously, so the first render already has a city.
 *
 * Reading the saved city from AsyncStorage is async, and while it resolved every screen used
 * to render with `selectedCity === null`. That fired a full set of list queries with no city,
 * which were then aborted and refired once the city arrived — four wasted round-trips on
 * every cold start, which on a weak connection is visible latency for no benefit.
 */
const DEFAULT_CITY: SupportedCity =
  SUPPORTED_CITIES.find((city) => city.id === DEFAULT_CITY_ID) ?? SUPPORTED_CITIES[0];
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
  /** Never null: starts at the default city and is corrected once storage is read. */
  selectedCity: SupportedCity;
  setCity: (city: SupportedCity) => void;
  pickerVisible: boolean;
  showPicker: () => void;
  hidePicker: () => void;
  isAutoDetected: boolean;
};

const CityContext = createContext<CityContextType | null>(null);

export function CityProvider({ children }: { children: React.ReactNode }) {
  const [selectedCity, setSelectedCityState] = useState<SupportedCity>(DEFAULT_CITY);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [isAutoDetected, setIsAutoDetected] = useState(false);
  const [hasStoredChoice, setHasStoredChoice] = useState(false);
  const { location } = useLocation();

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      const saved = raw ? SUPPORTED_CITIES.find((c) => c.id === raw) : undefined;

      if (saved) {
        setHasStoredChoice(true);
        // Only re-render when the stored choice differs from the default we started with.
        setSelectedCityState((current) => (current.id === saved.id ? current : saved));
        return;
      }

      setIsAutoDetected(true);
    });
  }, []);

  // If the user later shares their location and has never picked a city themselves, correct
  // the default to whichever live city they are actually in. Their own choice always wins.
  useEffect(() => {
    if (hasStoredChoice || !location) return;

    const detected = detectCityFromCoords(location.lat, location.lng);
    if (!detected) return;

    setSelectedCityState((current) => (current.id === detected.id ? current : detected));
    setIsAutoDetected(true);
  }, [location, hasStoredChoice]);

  const setCity = useCallback((city: SupportedCity) => {
    setSelectedCityState(city);
    setIsAutoDetected(false);
    setHasStoredChoice(true);
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
