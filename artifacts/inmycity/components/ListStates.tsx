import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useNetwork } from "@/context/NetworkContext";

/**
 * The three states every list can be in besides "here is your content".
 *
 * They live together because they have to feel like one thing: same spacing, same icon
 * treatment, same voice. Before this, four screens had a pull-to-refresh and the rest did
 * not, empty states were written per screen, and an error replaced the whole screen with a
 * developer-facing fallback — the user lost the header, the filters and any way back.
 */

type FeatherIcon = React.ComponentProps<typeof Feather>["name"];

export type EmptyStateProps = {
  icon?: FeatherIcon;
  title: string;
  /** What to try next. Always offer something; a dead end is never the answer. */
  message: string;
  accent?: string;
  action?: { label: string; onPress: () => void };
};

export function EmptyState({ icon = "inbox", title, message, accent, action }: EmptyStateProps) {
  const colors = useColors();
  const tint = accent ?? colors.amber;

  return (
    <View style={styles.container} accessible accessibilityLabel={`${title}. ${message}`}>
      <View style={[styles.icon, { backgroundColor: tint + "15" }]}>
        <Feather name={icon} size={30} color={tint} />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.mutedForeground }]}>{message}</Text>
      {action ? (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: tint }]}
          onPress={action.onPress}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={action.label}
        >
          <Text style={styles.buttonText}>{action.label}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export type ErrorStateProps = {
  /** Shown only in development; users get a plain explanation instead. */
  error?: unknown;
  onRetry: () => void;
  accent?: string;
  /** What failed to load, in the user's words: "deals", "this neighbourhood". */
  subject?: string;
};

/**
 * An error inside the list, not instead of the screen.
 *
 * The distinction matters offline: the header, the city and the filters stay put, so retrying
 * once the train leaves the tunnel is one tap rather than a fresh navigation.
 */
export function ErrorState({ error, onRetry, accent, subject = "this" }: ErrorStateProps) {
  const colors = useColors();
  const { isOnline } = useNetwork();
  const tint = accent ?? colors.amber;

  const offline = isOnline === false;
  const title = offline ? "You're offline" : `Couldn't load ${subject}`;
  const message = offline
    ? "Anything saved on this device is still browsable. This list will fill in when you're back on a connection."
    : "The connection dropped or the server is having a moment. Nothing is lost — try again.";

  return (
    <View style={styles.container} accessible accessibilityLabel={`${title}. ${message}`}>
      <View style={[styles.icon, { backgroundColor: tint + "15" }]}>
        <Feather name={offline ? "wifi-off" : "alert-circle"} size={30} color={tint} />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.mutedForeground }]}>{message}</Text>
      {__DEV__ && error instanceof Error ? (
        <Text style={[styles.devDetail, { color: colors.mutedForeground }]} numberOfLines={3}>
          {error.message}
        </Text>
      ) : null}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: tint }]}
        onPress={onRetry}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Try again"
        accessibilityHint={`Reloads ${subject}`}
      >
        <Text style={styles.buttonText}>Try again</Text>
      </TouchableOpacity>
    </View>
  );
}

/**
 * The pull-to-refresh control every list uses.
 *
 * `refreshing` is deliberately driven by `isRefetching` rather than `isLoading`: the first
 * load draws skeletons, and tying the spinner to it leaves the control spinning on a screen
 * the user never pulled.
 */
export function useListRefreshControl(isRefetching: boolean, refetch: () => unknown, accent?: string) {
  const colors = useColors();
  const tint = accent ?? colors.amber;

  return (
    <RefreshControl
      refreshing={isRefetching}
      onRefresh={() => refetch()}
      tintColor={tint}
      colors={[tint]}
      progressBackgroundColor={colors.card}
      accessibilityLabel="Pull to refresh"
    />
  );
}

/**
 * The rendering budget every long list shares.
 *
 * Card rows are expensive — an image, a rating, several text measurements — and the default
 * `FlatList` settings render far more of them up front than a phone scrolling a city
 * catalogue needs. `removeClippedSubviews` is Android-only on purpose: it is a well-known
 * source of blank cells on iOS.
 */
export const LIST_PERFORMANCE_PROPS = {
  initialNumToRender: 6,
  maxToRenderPerBatch: 8,
  windowSize: 7,
  removeClippedSubviews: Platform.OS === "android",
} as const;

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 40,
    paddingTop: 56,
    paddingBottom: 40,
  },
  icon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 19, textAlign: "center" },
  message: { fontFamily: "Inter_400Regular", fontSize: 15, textAlign: "center", lineHeight: 22 },
  devDetail: { fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "center" },
  button: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 22,
    minHeight: 44,
    justifyContent: "center",
  },
  buttonText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },
});
