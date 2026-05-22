import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

const syMonogram = require("../assets/images/sy_monogram.png");
const MONO_ASPECT = 359 / 310; // ~1.158 — cropped gold SY only, no surrounding text/flourish

interface Props {
  centered?: boolean;
  style?: object;
  height?: number;
  variant?: "inline" | "stacked";
}

/**
 * Simon Yarrell brand wordmark.
 *
 * - `variant="stacked"` (onboarding splash + About page hero) renders
 *   the lockup the user mirrored from their brand sheet: cropped gold
 *   "SY" monogram image on top, then "SIMON YARRELL" in upright white
 *   serif caps, then the gold tagline broken across two lines
 *   ("Luxury Styling," / "Powered by Intelligence."). No decorative
 *   flourish, no rectangular card background — every element is a
 *   native node so it blends into whatever sits behind it (editorial
 *   hero photo on onboarding, plain dark surface on About). `height`
 *   controls the SY monogram height; the caps + tagline scale
 *   proportionally below it.
 *
 * - `variant="inline"` (default — every header / top-bar) renders a
 *   compact gold upright Playfair "SY" + spaced-caps "SIMON YARRELL"
 *   in Playfair_700Bold, matching the website header treatment.
 *
 * Inline variant API (`centered`, `style`, `height`) is unchanged so
 * existing header call-sites keep their vertical footprint.
 */
export function BrandWordmark({
  centered = false,
  style,
  height = 30,
  variant = "inline",
}: Props) {
  const colors = useColors();

  if (variant === "stacked") {
    // Caps + tagline sizes are derived from the monogram height so the
    // entire composition scales as one unit when callers tweak height.
    const capsSize = Math.round(height * 0.34);
    const taglineSize = Math.max(11, Math.round(height * 0.13));
    return (
      <View style={[styles.stackedWrap, style]}>
        <Image
          source={syMonogram}
          style={{ height, width: height * MONO_ASPECT }}
          resizeMode="contain"
          accessible={false}
        />
        <Text
          style={[
            styles.caps,
            {
              color: colors.foreground,
              fontSize: capsSize,
              marginTop: Math.round(height * 0.18),
              letterSpacing: capsSize * 0.18,
            },
          ]}
          accessibilityLabel="Simon Yarrell"
        >
          SIMON YARRELL
        </Text>
        <Text
          style={[
            styles.tagline,
            {
              color: colors.gold,
              fontSize: taglineSize,
              lineHeight: Math.round(taglineSize * 1.4),
              marginTop: Math.round(height * 0.12),
            },
          ]}
        >
          Luxury Styling,{"\n"}Powered by Intelligence.
        </Text>
      </View>
    );
  }

  // Inline (default header treatment) — text-based so it scales cleanly
  // at small header sizes.
  const monoSize = Math.round(height * 0.95);
  const nameSize = Math.max(10, Math.round(height * 0.36));
  return (
    <View style={[styles.row, centered && styles.centered, style]}>
      <Text
        style={[
          styles.monoInline,
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
  monoInline: {
    fontFamily: "PlayfairDisplay_700Bold",
    letterSpacing: -0.5,
  },
  name: {
    fontFamily: "PlayfairDisplay_700Bold",
    letterSpacing: 3,
  },
  caps: {
    fontFamily: "PlayfairDisplay_700Bold",
    textAlign: "center",
  },
  tagline: {
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
