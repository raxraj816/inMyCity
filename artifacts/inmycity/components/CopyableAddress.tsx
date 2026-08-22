import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  type StyleProp,
  type TextStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { copyAddress } from "@/lib/placeActions";

/**
 * An address you can tap to copy.
 *
 * Confirmation is inline and transient rather than an alert: copying is a low-stakes action,
 * and a modal the user has to dismiss costs more than the copy saved.
 */

type CopyableAddressProps = {
  address: string;
  /** Text style from the host screen, so the address keeps that screen's typography. */
  textStyle?: StyleProp<TextStyle>;
};

const CONFIRMATION_MS = 1600;

export function CopyableAddress({ address, textStyle }: CopyableAddressProps) {
  const colors = useColors();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Without this, the timer can fire after the screen is gone and set state on an
  // unmounted component.
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const onPress = useCallback(async () => {
    const ok = await copyAddress(address);
    if (!ok) return;

    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), CONFIRMATION_MS);
  }, [address]);

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Copy address: ${address}`}
      accessibilityHint="Copies the address to your clipboard"
    >
      <Text style={[styles.text, textStyle]}>{address}</Text>
      <View style={styles.indicator}>
        <Feather
          name={copied ? "check" : "copy"}
          size={14}
          color={copied ? colors.success : colors.mutedForeground}
        />
        {copied && (
          <Text style={[styles.copied, { color: colors.success }]}>Copied</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    // Keeps the whole row within a comfortable thumb target without a visible button.
    minHeight: 40,
  },
  text: {
    flexShrink: 1,
  },
  indicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  copied: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
});
