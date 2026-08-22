import { Alert, Linking, Platform, Share } from "react-native";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";

import {
  type Destination,
  type MapPlatform,
  directionsUrlCandidates,
  isValidCoordinate,
  showOnMapUrlCandidates,
  telUrl,
  websiteUrl,
} from "./mapLinks";

/**
 * The actions a user actually wants from a venue: get me there, call it, open its site,
 * send it to someone. Centralised so every detail screen behaves identically — places,
 * events, hotels and activities previously each did their own thing, and places had none
 * of them at all.
 */

function currentPlatform(): MapPlatform {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  return "web";
}

/** Opens the first candidate URL the device can handle. */
async function openFirstSupported(candidates: string[]): Promise<boolean> {
  for (const url of candidates) {
    try {
      // canOpenURL needs the scheme declared in app config; https always resolves, so the
      // https fallback at the end of every candidate list keeps this from failing silently.
      if (url.startsWith("http") || (await Linking.canOpenURL(url))) {
        await Linking.openURL(url);
        return true;
      }
    } catch {
      // Try the next candidate rather than surfacing a scheme-specific failure.
    }
  }
  return false;
}

function warn(message: string) {
  Alert.alert("Can't do that right now", message);
}

export function hasCoordinates(lat: unknown, lng: unknown): boolean {
  return isValidCoordinate(lat, lng);
}

/** Starts navigation to a venue in the user's maps app. */
export async function openDirections(destination: Destination): Promise<void> {
  if (!isValidCoordinate(destination.lat, destination.lng)) {
    warn("We don't have exact coordinates for this place yet.");
    return;
  }

  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  const opened = await openFirstSupported(
    directionsUrlCandidates(destination, currentPlatform()),
  );
  if (!opened) warn("No maps app is available to open directions.");
}

/** Shows a venue on a map without starting navigation. */
export async function showOnMap(destination: Destination): Promise<void> {
  if (!isValidCoordinate(destination.lat, destination.lng)) {
    warn("We don't have exact coordinates for this place yet.");
    return;
  }

  const opened = await openFirstSupported(
    showOnMapUrlCandidates(destination, currentPlatform()),
  );
  if (!opened) warn("No maps app is available.");
}

export async function callPhone(phone: string | null | undefined): Promise<void> {
  if (!phone) return;

  const url = telUrl(phone);
  if (!url) {
    warn("That phone number doesn't look complete.");
    return;
  }

  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  try {
    await Linking.openURL(url);
  } catch {
    warn("This device can't place calls.");
  }
}

export async function openWebsite(website: string | null | undefined): Promise<void> {
  if (!website) return;

  const url = websiteUrl(website);
  if (!url) {
    warn("That website link isn't valid.");
    return;
  }

  try {
    await Linking.openURL(url);
  } catch {
    warn("Couldn't open that link.");
  }
}

/**
 * Copies an address to the clipboard.
 *
 * Worth its own action in Mumbai: the usual way to reach somewhere is to read the address to
 * an auto driver or paste it into a ride-hailing app, and retyping it from a detail screen is
 * exactly the kind of friction that makes an app annoying.
 */
export async function copyAddress(address: string | null | undefined): Promise<boolean> {
  if (!address?.trim()) return false;

  try {
    await Clipboard.setStringAsync(address.trim());
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    return true;
  } catch {
    warn("Couldn't copy the address.");
    return false;
  }
}

/**
 * Shares a venue. Includes a link when one is available, because a share with no link is a
 * dead end for whoever receives it.
 */
export async function shareEntity(options: {
  title: string;
  url?: string | null;
  note?: string;
}): Promise<void> {
  const { title, url, note } = options;

  const message = [note ?? `${title} — found on inMyCity`, url].filter(Boolean).join("\n");

  try {
    await Share.share(
      Platform.OS === "ios" && url
        ? { message: note ?? title, url }
        : { message },
    );
  } catch {
    // The user dismissing the share sheet throws on some platforms; nothing to report.
  }
}
