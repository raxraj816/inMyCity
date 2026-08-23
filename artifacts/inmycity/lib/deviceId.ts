import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

/**
 * A stable per-install identifier, so a reader's own likes, saves, community joins and
 * upvotes work before they sign in.
 *
 * Decision 4 of the launch plan is that saving must not require an account. The server keys
 * those rows on this value, namespaced as `anon:<id>` so it can never collide with a user id,
 * and reconciles them to the account on first login.
 *
 * It is random, generated on device, and carries nothing about the person or the hardware.
 * Nothing else is derived from it, and it is not sent anywhere but this app's own API.
 */
const STORAGE_KEY = "@inmycity/device_id";

let cached: string | null = null;
let inFlight: Promise<string | null> | null = null;

function generate(): string {
  // `randomUUID` is available in Expo's crypto on every platform the app targets; the manual
  // fallback keeps a missing native module from breaking every anonymous interaction.
  try {
    return Crypto.randomUUID().replace(/-/g, "");
  } catch {
    return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  }
}

async function load(): Promise<string | null> {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    if (existing) {
      cached = existing;
      return existing;
    }

    const created = generate();
    await AsyncStorage.setItem(STORAGE_KEY, created);
    cached = created;
    return created;
  } catch {
    // Storage being unavailable means anonymous actions do not persist across launches. That
    // is a degraded experience, not a broken one, so it must not throw into every request.
    return null;
  }
}

/** The device id, creating and persisting one on first use. */
export function getDeviceId(): Promise<string | null> {
  if (cached) return Promise.resolve(cached);
  inFlight ??= load().finally(() => {
    inFlight = null;
  });
  return inFlight;
}
