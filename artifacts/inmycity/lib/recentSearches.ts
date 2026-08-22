import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

/**
 * The last few things this user searched for, kept on the device.
 *
 * Search in a city app is repetitive — the same station, the same dish, the same friend's
 * neighbourhood — and retyping "chhatrapati shivaji maharaj terminus" on a phone on a moving
 * train is nobody's idea of a good time. Stored locally only; it never leaves the device.
 */

const STORAGE_KEY = "@inmycity/recent_searches";
const MAX_RECENT = 8;

async function read(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    // A corrupt entry is not worth surfacing: the feature degrades to "no history".
    return [];
  }
}

export function useRecentSearches() {
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    read().then((entries) => {
      if (active) setRecent(entries);
    });
    return () => {
      active = false;
    };
  }, []);

  const persist = useCallback((entries: string[]) => {
    setRecent(entries);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries)).catch(() => {});
  }, []);

  /** Records a term, moving an existing one back to the front rather than duplicating it. */
  const remember = useCallback(
    (term: string) => {
      const trimmed = term.trim();
      if (!trimmed) return;
      setRecent((current) => {
        const next = [trimmed, ...current.filter((entry) => entry.toLowerCase() !== trimmed.toLowerCase())].slice(
          0,
          MAX_RECENT,
        );
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [],
  );

  const forget = useCallback(
    (term: string) => {
      persist(recent.filter((entry) => entry !== term));
    },
    [persist, recent],
  );

  const clear = useCallback(() => persist([]), [persist]);

  return { recent, remember, forget, clear };
}
