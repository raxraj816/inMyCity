import { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import * as Location from "expo-location";

type LocationType = {
  lat: number;
  lng: number;
} | null;

type LocationContextType = {
  location: LocationType;
  errorMsg: string | null;
  isLoading: boolean;
};

const LocationContext = createContext<LocationContextType>({
  location: null,
  errorMsg: null,
  isLoading: true,
});

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useState<LocationType>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      if (Platform.OS === "web") {
        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              });
              setIsLoading(false);
            },
            (error) => {
              setErrorMsg(error.message);
              setIsLoading(false);
            }
          );
        } else {
          setErrorMsg("Geolocation not available");
          setIsLoading(false);
        }
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
        setIsLoading(false);
        return;
      }

      try {
        const currentLoc = await Location.getCurrentPositionAsync({});
        setLocation({
          lat: currentLoc.coords.latitude,
          lng: currentLoc.coords.longitude,
        });
      } catch (err: any) {
        setErrorMsg(err.message);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return (
    <LocationContext.Provider value={{ location, errorMsg, isLoading }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  return useContext(LocationContext);
}
