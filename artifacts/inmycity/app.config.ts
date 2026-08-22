import type { ExpoConfig } from "expo/config";

/**
 * Expo config as code, so the pieces that differ per environment — the Google Maps key and
 * the Universal Link domain — come from the environment rather than being committed.
 *
 * Replaces the former `app.json`. Secrets stay out of the repo (see AGENTS.md); set these in
 * `.env.local` for development and in EAS secrets for builds.
 */

const LOCATION_PERMISSION =
  "inMyCity uses your location to show places near you and sort results by how far away they are. You can browse the whole city without sharing it.";

/** Google Maps needs a key on Android; iOS falls back to Apple Maps and needs none. */
const androidMapsApiKey = process.env.GOOGLE_MAPS_API_KEY_ANDROID?.trim() || undefined;
const iosMapsApiKey = process.env.GOOGLE_MAPS_API_KEY_IOS?.trim() || undefined;

/** Host behind the public web origin, used for Universal Links / App Links. */
function linkDomain(): string | undefined {
  const raw = process.env.EXPO_PUBLIC_WEB_BASE_URL?.trim();
  if (!raw) return undefined;
  try {
    return new URL(raw).host;
  } catch {
    return undefined;
  }
}

const domain = linkDomain();

const config: ExpoConfig = {
  name: "inMyCity",
  slug: "inmycity",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "inmycity",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  splash: {
    image: "./assets/images/splash.png",
    resizeMode: "cover",
    backgroundColor: "#0f172a",
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.inmycity.app",
    ...(domain ? { associatedDomains: [`applinks:${domain}`] } : {}),
    ...(iosMapsApiKey ? { config: { googleMapsApiKey: iosMapsApiKey } } : {}),
    infoPlist: {
      NSLocationWhenInUseUsageDescription: LOCATION_PERMISSION,
      // Required before canOpenURL will answer truthfully for these schemes.
      LSApplicationQueriesSchemes: ["comgooglemaps", "maps"],
    },
  },
  android: {
    package: "com.inmycity.app",
    adaptiveIcon: {
      foregroundImage: "./assets/images/icon.png",
      backgroundColor: "#0f172a",
    },
    permissions: [
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.ACCESS_FINE_LOCATION",
    ],
    ...(androidMapsApiKey
      ? { config: { googleMaps: { apiKey: androidMapsApiKey } } }
      : {}),
    ...(domain
      ? {
          intentFilters: [
            {
              action: "VIEW",
              autoVerify: true,
              data: [{ scheme: "https", host: domain }],
              category: ["BROWSABLE", "DEFAULT"],
            },
          ],
        }
      : {}),
  },
  web: {
    favicon: "./assets/images/icon.png",
  },
  plugins: [
    "expo-router",
    "expo-font",
    "expo-web-browser",
    "expo-secure-store",
    [
      "expo-location",
      {
        locationWhenInUsePermission: LOCATION_PERMISSION,
        isIosBackgroundLocationEnabled: false,
        isAndroidBackgroundLocationEnabled: false,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    /**
     * Whether an embedded map can actually render. Android shows a blank grey tile without a
     * Google Maps key, so the app checks this and falls back to the directions actions rather
     * than displaying a broken map.
     */
    androidMapsConfigured: Boolean(androidMapsApiKey),
    webBaseUrl: process.env.EXPO_PUBLIC_WEB_BASE_URL?.trim() || null,
  },
};

export default config;
