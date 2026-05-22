import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { OrnamentRule } from "@/components/OrnamentRule";
import { useColors } from "@/hooks/useColors";

// Maison Simon "MS" monogram — ornate interlocking gold serif lockup on a
// transparent background. Replaces the previous flat upright "SY" mark and
// is rendered for both the stacked hero variant AND the compact inline
// header variant so the new format reads consistently across the app.
// Ornate overlapping "SY" monogram (Simon Yarrell). Decorative Victorian /
// Baroque serif with filigree scrolls — the S sits in front of the Y so the
// initials read as an intertwined maison crest. Transparent PNG, square
// 1024×1024 native, sized via height prop so it scales with the lockup.
const msMonogram = require("../assets/images/sy_monogram.png");
const MONO_ASPECT = 1; // square — native 1024×1024 transparent PNG

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
    // Caps sized smaller on narrower phones so "SIMON YARRELL" never wraps
    // mid-word (the previous 0.34 × height + 0.18 tracking pushed the word
    // off-canvas on iPhone widths, splitting "YARRELL" across two lines).
    const capsSize = Math.round(height * 0.26);
    const taglineSize = Math.max(11, Math.round(height * 0.13));
    return (
      <View style={[styles.stackedWrap, style]}>
        <Image
          source={msMonogram}
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
              letterSpacing: capsSize * 0.12,
            },
          ]}
          accessibilityLabel="Simon Yarrell"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
        >
          SIMON YARRELL
        </Text>
        {/* Editorial gold ornament rule sits directly under the caps —
            matches the splash reference exactly. Width is tuned to span
            most of the caps row; diamond center reads as the maison crest. */}
        <OrnamentRule
          width={Math.round(capsSize * 8)}
          diamondSize={Math.max(5, Math.round(capsSize * 0.22))}
          style={{ marginTop: Math.round(height * 0.10) }}
        />
        <Text
          style={[
            styles.tagline,
            {
              // Off-white/cream tagline (not solid gold) — matches the
              // reference where "Luxury Styling, / Powered by Intelligence."
              // reads as a warm muted highlight beneath the gold rule.
              color: "rgba(245,240,225,0.92)",
              fontSize: taglineSize,
              lineHeight: Math.round(taglineSize * 1.4),
              marginTop: Math.round(height * 0.10),
            },
          ]}
        >
          Luxury Styling,{"\n"}Powered by Intelligence.
        </Text>
      </View>
    );
  }

  // Inline (default header treatment) — uses the same ornate MS monogram
  // image as the stacked hero variant, sized to the row height so it sits
  // cleanly inside header bars. Image instead of text since the
  // interlocking serif lockup isn't a real installed font.
  const monoHeight = Math.round(height * 1.05);
  const nameSize = Math.max(10, Math.round(height * 0.36));
  return (
    <View style={[styles.row, centered && styles.centered, style]}>
      <Image
        source={msMonogram}
        style={{
          height: monoHeight,
          width: monoHeight * MONO_ASPECT,
          marginRight: Math.round(height * 0.35),
        }}
        resizeMode="contain"
        accessible={false}
      />
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
