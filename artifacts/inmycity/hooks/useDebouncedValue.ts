import { useEffect, useState } from "react";

/**
 * Follows a value, but only after it has stopped changing for `delayMs`.
 *
 * Search fires a request per keystroke without this. On a congested Mumbai cell that is both
 * slow and expensive, and the answers arrive out of order — the user sees results for "vad"
 * after results for "vada pav".
 */
export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}
