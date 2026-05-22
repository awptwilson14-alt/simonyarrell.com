import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  centered?: boolean;
  style?: object;
  height?: number;
  variant?: "inline" | "stacked";
}

/**
 * Simon Yarrell brand wordmark.
 *
 * Renders the SY monogram (Playfair italic, gold) alongside the
 * "SIMON YARRELL" caps lockup (Playfair, off-white). All sizing is
 * derived from the `height` prop so existing call-sites that pass a
 * height continue to lay out the same vertical footprint.
 *
 * - `variant="inline"` (default) — SY · SIMON YARRELL on one row,
 *   used by every header / top-bar (matches the SY website navbar).
 * - `variant="stacked"` — SY monogram above SIMON YARRELL caps,
 *   used by the onboarding splash + the new About page (matches the
 *   Simon Yarrell brand sheet).
 *
 * Replaces the previous PNG-based wordmark during the May 2026
 * rebrand from Maison Simon. Text-based so it scales perfectly and
 * picks up the existing PlayfairDisplay / Inter font registrations.
 */
export function BrandWordmark({
  centered = false,
  style,
  height = 30,
  variant = "inline",
}: Props) {
  const colors = useColors();

  if (variant === "stacked") {
    const monoSize = Math.round(height * 1.6);
    const nameSize = Math.max(11, Math.round(height * 0.4));
    return (
      <View style={[styles.stacked, style]}>
        <Text
          style={[
            styles.mono,
            { color: colors.gold, fontSize: monoSize, lineHeight: monoSize },
          ]}
          accessible={false}
        >
          SY
        </Text>
        <Text
          style={[
            styles.nameStacked,
            {
              color: colors.foreground,
              fontSize: nameSize,
              marginTop: Math.round(height * 0.18),
            },
          ]}
          accessibilityLabel="Simon Yarrell"
        >
          SIMON YARRELL
        </Text>
      </View>
    );
  }

  // Inline (default header treatment).
  const monoSize = Math.round(height * 0.95);
  const nameSize = Math.max(10, Math.round(height * 0.36));
  return (
    <View style={[styles.row, centered && styles.centered, style]}>
      <Text
        style={[
          styles.mono,
          {
            color: colors.gold,
            fontSize: monoSize,
            lineHeight: monoSize,
            marginRight: Math.round(height * 0.28),
          },
        ]}
        accessible={false}
      >
        SY
      </Text>
      <Text
        style={[
          styles.name,
          { color: colors.foreground, fontSize: nameSize },
        ]}
        accessibilityLabel="Simon Yarrell"
      >
        SIMON YARRELL
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  centered: {
    justifyContent: "center",
  },
  stacked: {
    alignItems: "center",
  },
  mono: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontStyle: "italic",
    letterSpacing: -0.5,
  },
  name: {
    fontFamily: "PlayfairDisplay_600SemiBold",
    letterSpacing: 3,
  },
  nameStacked: {
    fontFamily: "PlayfairDisplay_600SemiBold",
    letterSpacing: 4,
  },
});
