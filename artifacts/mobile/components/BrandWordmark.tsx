import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

const logoLockup = require("../assets/images/sy_logo.png");
const LOCKUP_ASPECT = 1536 / 1024; // 1.5

interface Props {
  centered?: boolean;
  style?: object;
  height?: number;
  variant?: "inline" | "stacked";
}

/**
 * Simon Yarrell brand wordmark.
 *
 * - `variant="stacked"` (used by onboarding splash + About page) renders
 *   the supplied brand-sheet PNG directly so the lockup matches the
 *   official artwork pixel-for-pixel — SY monogram, "SIMON YARRELL"
 *   caps, gold italic tagline, and decorative flourish all included.
 *   Width is derived from `height` via the source PNG aspect ratio
 *   (1536×1024 → 1.5).
 *
 * - `variant="inline"` (default — every header / top-bar) renders a
 *   compact text version of the same lockup: gold upright Playfair "SY"
 *   monogram + spaced-caps "SIMON YARRELL" in Playfair_700Bold.
 *   Upright (not italic) to match the official artwork's font style.
 *
 * Replaces the previous Maison Simon PNG wordmark during the May 2026
 * rebrand. Inline variant preserves the original BrandWordmark API
 * (`centered`, `style`, `height`) so every existing header call-site
 * keeps the same vertical footprint.
 */
export function BrandWordmark({
  centered = false,
  style,
  height = 30,
  variant = "inline",
}: Props) {
  const colors = useColors();

  if (variant === "stacked") {
    return (
      <View style={[styles.stackedWrap, style]}>
        <Image
          source={logoLockup}
          style={{ height, width: height * LOCKUP_ASPECT }}
          resizeMode="contain"
          accessibilityLabel="Simon Yarrell — Luxury Styling, Powered by Intelligence."
        />
      </View>
    );
  }

  // Inline (default header treatment) — text-based so it scales cleanly
  // at small header sizes where the full PNG lockup would be illegible.
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
            marginRight: Math.round(height * 0.3),
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
  stackedWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  mono: {
    fontFamily: "PlayfairDisplay_700Bold",
    letterSpacing: -0.5,
  },
  name: {
    fontFamily: "PlayfairDisplay_700Bold",
    letterSpacing: 3,
  },
});
