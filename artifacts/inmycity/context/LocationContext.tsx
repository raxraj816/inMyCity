import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import * as Location from "expo-location";

/**
 * Location is opt-in and requested in context, never at app launch.
 *
 * The OS grants one permission prompt per install. Firing it during cold start — before the
 * user has seen anything worth granting it for — is the reliable way to get denied forever.
 * So on mount this only reads the *existing* permission state; the prompt itself is raised by
 * `requestLocation()`, called from a control the user tapped.
 *
 * Every screen must remain fully usable while `location` is null.
 */

export type LocationCoords = { lat: number; lng: number } | null;

export type LocationStatus =
  /** Not asked yet — show a "Use my location" affordance. */
  | "idle"
  /** Prompt open, or a fix in flight. */
  | "requesting"
  | "granted"
  /** Refused, or the OS restricts it. Offer to retry via Settings, never block. */
  | "denied"
  /** No location hardware or API on this platform. */
  | "unavailable";

type LocationContextType = {
  location: LocationCoords;
  status: LocationStatus;
  errorMsg: string | null;
  /** True while a fix is being acquired. */
  isLoading: boolean;
  /** Whether asking is worthwhile — false once denied or unavailable. */
  canRequest: boolean;
  /** Raises the OS prompt if needed, then resolves the current position. */
  requestLocation: () => Promise<LocationCoords>;
};

const LocationContext = createContext<LocationContextType>({
  location: null,
  status: "idle",
  errorMsg: null,
  isLoading: false,
  canRequest: true,
  requestLocation: async () => null,
});

function readWebPosition(): Promise<LocationCoords> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      reject(new Error("Geolocation not available"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      (error) => reject(new Error(error.message)),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  });
}

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useState<LocationCoords>(null);
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Read-only check on mount. `getForegroundPermissionsAsync` never shows a prompt, so a user
  // who granted access on a previous run gets nearby results immediately, and everyone else
  // is left undisturbed.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (Platform.OS === "web") return;

      try {
        const { status: permission } = await Location.getForegroundPermissionsAsync();
        if (cancelled || permission !== "granted") return;

        setStatus("requesting");
        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;

        setLocation({ lat: current.coords.latitude, lng: current.coords.longitude });
        setStatus("granted");
      } catch {
        if (!cancelled) setStatus("idle");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const requestLocation = useCallback(async (): Promise<LocationCoords> => {
    setErrorMsg(null);
    setIsLoading(true);
    setStatus("requesting");

    try {
      if (Platform.OS === "web") {
        const coords = await readWebPosition();
        setLocation(coords);
        setStatus("granted");
        return coords;
      }

      const { status: permission } = await Location.requestForegroundPermissionsAsync();
      if (permission !== "granted") {
        setStatus("denied");
        setErrorMsg("Location access was declined.");
        return null;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = {
        lat: current.coords.latitude,
        lng: current.coords.longitude,
      };
      setLocation(coords);
      setStatus("granted");
      return coords;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not get your location.";
      setErrorMsg(message);
      // A failed fix is not a refusal — the user may simply be indoors. Keep asking possible.
      setStatus((previous) => (previous === "denied" ? "denied" : "unavailable"));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <LocationContext.Provider
      value={{
        location,
        status,
        errorMsg,
        isLoading,
        canRequest: status !== "denied",
        requestLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  return useContext(LocationContext);
}
