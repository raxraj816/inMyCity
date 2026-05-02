import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type CityStatus = "live" | "soon";

export type SupportedCity = {
  id: string;
  name: string;
  displayName: string;
  country: string;
  state: string;
  lat: number;
  lng: number;
  status: CityStatus;
  tagline: string;
};

export const SUPPORTED_CITIES: SupportedCity[] = [
  {
    id: "mumbai",
    name: "Mumbai",
    displayName: "Mumbai, Maharashtra",
    country: "India",
    state: "Maharashtra",
    lat: 19.076,
    lng: 72.8777,
    status: "live",
    tagline: "The City of Dreams",
  },
  {
    id: "bangalore",
    name: "Bangalore",
    displayName: "Bangalore, Karnataka",
    country: "India",
    state: "Karnataka",
    lat: 12.9716,
    lng: 77.5946,
    status: "live",
    tagline: "Silicon Valley of India",
  },
  {
    id: "new-york",
    name: "New York",
    displayName: "New York, USA",
    country: "USA",
    state: "New York",
    lat: 40.7128,
    lng: -74.006,
    status: "live",
    tagline: "The City That Never Sleeps",
  },
  {
    id: "san-francisco",
    name: "San Francisco",
    displayName: "San Francisco, USA",
    country: "USA",
    state: "California",
    lat: 37.7749,
    lng: -122.4194,
    status: "live",
    tagline: "By the Golden Gate",
  },
  {
    id: "delhi",
    name: "Delhi",
    displayName: "Delhi, India",
    country: "India",
    state: "Delhi",
    lat: 28.7041,
    lng: 77.1025,
    status: "soon",
    tagline: "Heart of India",
  },
  {
    id: "hyderabad",
    name: "Hyderabad",
    displayName: "Hyderabad, Telangana",
    country: "India",
    state: "Telangana",
    lat: 17.385,
    lng: 78.4867,
    status: "soon",
    tagline: "City of Pearls",
  },
  {
    id: "pune",
    name: "Pune",
    displayName: "Pune, Maharashtra",
    country: "India",
    state: "Maharashtra",
    lat: 18.5204,
    lng: 73.8567,
    status: "soon",
    tagline: "Oxford of the East",
  },
  {
    id: "chennai",
    name: "Chennai",
    displayName: "Chennai, Tamil Nadu",
    country: "India",
    state: "Tamil Nadu",
    lat: 13.0827,
    lng: 80.2707,
    status: "soon",
    tagline: "Gateway to South India",
  },
];

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
      const fallback = SUPPORTED_CITIES.find((c) => c.id === "mumbai") ?? null;
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
