import { useCallback, useState } from "react";

import { useLocation } from "@/context/LocationContext";

/**
 * Shared state for the "Near me" and "Open now" list controls.
 *
 * Turning on "Near me" is the moment location earns its permission prompt: the user has just
 * asked for distance-sorted results, so the OS dialog arrives with obvious context instead of
 * during cold start. If they decline, the toggle simply switches itself back off and the list
 * carries on sorted by rating — no error, no blocked screen.
 */

/** Default search radius, in km. Comfortably covers a Mumbai neighbourhood and its neighbours. */
export const DEFAULT_NEARBY_RADIUS_KM = 8;

export type NearbyControls = {
  nearbyEnabled: boolean;
  openNowEnabled: boolean;
  /** Fold straight into a list query: `useGetPlaces({ city, ...queryParams })`. */
  queryParams: { lat?: number; lng?: number; radius?: number; openNow?: boolean };
  /** True while the permission prompt or position fix is in flight. */
  isLocating: boolean;
  locationDenied: boolean;
  toggleNearby: () => void;
  toggleOpenNow: () => void;
};

export function useNearby(radiusKm: number = DEFAULT_NEARBY_RADIUS_KM): NearbyControls {
  const { location, status, isLoading, requestLocation } = useLocation();
  const [nearbyRequested, setNearbyRequested] = useState(false);
  const [openNowEnabled, setOpenNowEnabled] = useState(false);

  const nearbyEnabled = nearbyRequested && !!location;

  const toggleNearby = useCallback(() => {
    if (nearbyRequested) {
      setNearbyRequested(false);
      return;
    }

    if (location) {
      setNearbyRequested(true);
      return;
    }

    // Optimistically switch on, then stand down if the user declines.
    setNearbyRequested(true);
    void requestLocation().then((coords) => {
      if (!coords) setNearbyRequested(false);
    });
  }, [nearbyRequested, location, requestLocation]);

  const toggleOpenNow = useCallback(() => setOpenNowEnabled((value) => !value), []);

  return {
    nearbyEnabled,
    openNowEnabled,
    queryParams: {
      ...(nearbyEnabled && location
        ? { lat: location.lat, lng: location.lng, radius: radiusKm }
        : {}),
      ...(openNowEnabled ? { openNow: true } : {}),
    },
    isLocating: nearbyRequested && !location && (isLoading || status === "requesting"),
    locationDenied: status === "denied",
    toggleNearby,
    toggleOpenNow,
  };
}
