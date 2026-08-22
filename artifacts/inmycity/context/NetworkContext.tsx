import * as Network from "expo-network";
import { onlineManager } from "@tanstack/react-query";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

/**
 * Whether the device can currently reach the network.
 *
 * Two things depend on this. The UI shows an offline banner, so a user looking at
 * hours-old content knows why nothing is changing. React Query's `onlineManager` is wired to
 * the same signal, so queries stop retrying into a dead connection and refetch the moment it
 * comes back — without that, every screen spends its first seconds offline spinning through
 * retries before failing.
 */

type NetworkContextValue = {
  /** Null until the first reading arrives; treat as "assume online" while unknown. */
  isOnline: boolean | null;
  /** Connected to a network that has no working internet route (captive portals, dead Wi-Fi). */
  isInternetReachable: boolean | null;
};

const NetworkContext = createContext<NetworkContextValue>({
  isOnline: null,
  isInternetReachable: null,
});

function resolveOnline(state: Network.NetworkState | undefined): NetworkContextValue {
  if (!state) return { isOnline: null, isInternetReachable: null };

  const connected = state.isConnected ?? null;
  const reachable = state.isInternetReachable ?? null;

  // `isInternetReachable` is the stronger signal but is not always available; fall back to
  // the connection flag rather than declaring the user offline on missing data.
  return {
    isOnline: reachable ?? connected,
    isInternetReachable: reachable,
  };
}

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [value, setValue] = useState<NetworkContextValue>({
    isOnline: null,
    isInternetReachable: null,
  });

  useEffect(() => {
    let cancelled = false;

    const apply = (state: Network.NetworkState | undefined) => {
      if (cancelled) return;
      const next = resolveOnline(state);
      setValue(next);
      // Unknown counts as online: blocking queries on a reading we never got would leave the
      // app permanently idle on platforms that do not report network state.
      onlineManager.setOnline(next.isOnline ?? true);
    };

    Network.getNetworkStateAsync().then(apply).catch(() => apply(undefined));
    const subscription = Network.addNetworkStateListener(apply);

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  const memoized = useMemo(() => value, [value.isOnline, value.isInternetReachable]);

  return <NetworkContext.Provider value={memoized}>{children}</NetworkContext.Provider>;
}

export function useNetwork(): NetworkContextValue {
  return useContext(NetworkContext);
}

/** Convenience for the common case: false only when we know the device is offline. */
export function useIsOnline(): boolean {
  return useNetwork().isOnline !== false;
}
