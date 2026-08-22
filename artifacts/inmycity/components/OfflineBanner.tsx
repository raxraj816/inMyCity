import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaInsetsContext, useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useNetwork } from "@/context/NetworkContext";

/**
 * A single line explaining why the app is not updating.
 *
 * It says what the user can still do: the content on screen is the last version fetched, and
 * it is still browsable. Nothing else about the app changes — the header, the filters and the
 * tabs all stay where they were.
 */
function Banner({ topInset }: { topInset: number }) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.banner,
        {
          paddingTop: topInset + 7,
          backgroundColor: colors.warningLight,
          borderBottomColor: colors.border,
        },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessible
      accessibilityLabel="You are offline. Showing content saved on this device."
    >
      <Feather name="wifi-off" size={14} color={colors.warning} />
      <Text style={[styles.text, { color: colors.warning }]}>Offline — showing saved content</Text>
    </View>
  );
}

/**
 * Wraps the app so the banner can take the top of the screen when the device goes offline.
 *
 * The banner absorbs the status-bar inset and hands its children a top inset of zero.
 * Without that, every screen would keep padding for a status bar that the banner is already
 * covering, and the whole app would visibly jump down by the height of the notch.
 */
export function OfflineBannerHost({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const { isOnline } = useNetwork();
  const offline = isOnline === false;

  // The tree shape stays the same whether or not the banner is showing. Returning children
  // bare when online and wrapped when offline would move them to a different position in the
  // tree, which unmounts and remounts the whole navigator the moment the network drops —
  // losing the screen the user was on, mid-journey, on exactly the connection where it hurts.
  const insetsForChildren = React.useMemo(
    () => (offline ? { ...insets, top: 0 } : insets),
    [offline, insets],
  );

  return (
    <View style={styles.host}>
      {offline ? <Banner topInset={insets.top} /> : null}
      <SafeAreaInsetsContext.Provider value={insetsForChildren}>
        <View style={styles.host}>{children}</View>
      </SafeAreaInsetsContext.Provider>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { flex: 1 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingBottom: 7,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  text: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
});
