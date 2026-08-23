import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as SecureStore from "expo-secure-store";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OfflineBannerHost } from "@/components/OfflineBanner";
import { setBaseUrl, setAuthTokenGetter, setDeviceIdGetter } from "@workspace/api-client-react";
import { LocationProvider } from "@/context/LocationContext";
import { CityProvider } from "@/context/CityContext";
import { NetworkProvider } from "@/context/NetworkContext";
import { AuthProvider } from "@/lib/auth";
import { getDeviceId } from "@/lib/deviceId";
import { persistOptions, queryClient } from "@/lib/queryPersistence";

// Safe token getter — skips SecureStore on web (not needed there)
function safeGetToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") return Promise.resolve(null);
    return SecureStore.getItemAsync("auth_session_token");
  } catch {
    return Promise.resolve(null);
  }
}

setBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3001");
setAuthTokenGetter(safeGetToken);
// Lets likes, saves, joins and upvotes work before sign-in. See `lib/deviceId.ts`.
setDeviceIdGetter(getDeviceId);

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="place/[id]" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="event/[id]" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="deal/[id]" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="itinerary/[id]" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="neighborhood/[id]" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="qa/[id]" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="qa/ask" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="pulse/compose" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="dining" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="nightlife" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="sports" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="places" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="movies" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="movie/[id]" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="hotels" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="hotel/[id]" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="events" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="deals" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="activities" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="activity/[id]" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="itineraries" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="transit" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="transit/plan" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="transit/line/[id]" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="transit/route/[id]" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="profile" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="ai-chat" options={{ headerShown: false, presentation: "modal", animation: "slide_from_bottom" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  const nav = <RootLayoutNav />;
  const withKeyboard =
    Platform.OS !== "web"
      ? React.createElement(
          require("react-native-keyboard-controller").KeyboardProvider,
          null,
          nav,
        )
      : nav;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        {/* Restores the last cache from disk before the first render, so a cold start on a
            bad connection opens on real content instead of a blank screen. */}
        <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
          <NetworkProvider>
            <AuthProvider>
              {/* Location wraps City so the city can be auto-detected from coordinates once
                  the user has opted into sharing them. */}
              <LocationProvider>
                <CityProvider>
                  <GestureHandlerRootView style={{ flex: 1 }}>
                    <OfflineBannerHost>{withKeyboard}</OfflineBannerHost>
                  </GestureHandlerRootView>
                </CityProvider>
              </LocationProvider>
            </AuthProvider>
          </NetworkProvider>
        </PersistQueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
