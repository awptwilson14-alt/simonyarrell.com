import { Image } from "expo-image";
import React, { useState } from "react";
import { Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

/**
 * Editorial fallback image used everywhere a hotlinked CDN photo can fail
 * or be denylisted (see `constants/badImageIds.ts`). Renders a luxury tile
 * — brand monogram in PlayfairDisplay gold + category icon + color swatch
 * dot — so the cell reads as "intentional, no-photo presentation" rather
 * than a missing-image error. Used by look detail and ProductCard so the
 * fallback styling stays identical across surfaces.
 */

export function categoryIcon(cat?: string): React.ComponentProps<typeof Feather>["name"] {
  switch ((cat ?? "").toLowerCase()) {
    case "dress":      return "feather";
    case "top":        return "user";
    case "bottom":     return "minus";
    case "outerwear":  return "shield";
    case "shoes":      return "navigation";
    case "bag":        return "shopping-bag";
    case "jewelry":    return "star";
    case "accessories":return "circle";
    default:           return "tag";
  }
}

const BRAND_SKIP_WORDS = new Set(["the", "x", "&", "and", "by", "de"]);

export function brandMonogram(brand?: string): string {
  if (!brand) return "·";
  const words = brand
    .replace(/[^\w\s&]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0 && !BRAND_SKIP_WORDS.has(w.toLowerCase()));
  if (words.length === 0) return brand.charAt(0).toUpperCase();
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}

const COLOR_NAME_TO_HEX: Record<string, string> = {
  black: "#0B0B0C", white: "#F5F5F0", ivory: "#F2EBDD", cream: "#EFE6D2",
  natural: "#D9CDB4", stone: "#C9BFAE", beige: "#D6C6A8", sand: "#D2BE96",
  camel: "#B48455", tan: "#A8794D", brown: "#6B4A2B", chocolate: "#3E2A1A",
  cognac: "#8B4A2B", chestnut: "#6E3B1F", taupe: "#8E7E69",
  grey: "#9CA3AF", gray: "#9CA3AF", charcoal: "#2D2F33", silver: "#C4C8CE",
  navy: "#13213C", blue: "#2B4D7F", denim: "#3F5C82", indigo: "#1F2F58",
  red: "#9E2A2B", burgundy: "#5B1A1A", wine: "#5B1A1A", crimson: "#8B1A22",
  pink: "#E6BCC6", rose: "#C58994", blush: "#E6C9C2",
  green: "#3F5B3B", olive: "#5A5A2E", sage: "#A7B197", forest: "#2A3F2A",
  yellow: "#D9B14A", mustard: "#B58A2E",
  orange: "#C4642B", rust: "#9A4A24",
  purple: "#5A3D6B", lavender: "#BFB1D0",
  gold: "#C6A75E", bronze: "#9A7C38", nude: "#D9BFA8",
};

export function colorNameToHex(name?: string, fallback = "#6B7280"): string {
  if (!name) return fallback;
  const key = name.trim().toLowerCase().replace(/[-_/]/g, " ");
  if (COLOR_NAME_TO_HEX[key]) return COLOR_NAME_TO_HEX[key];
  const parts = key.split(/\s+/).filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    if (COLOR_NAME_TO_HEX[parts[i]]) return COLOR_NAME_TO_HEX[parts[i]];
  }
  return fallback;
}

export interface ResilientImageProps {
  uri?: string;
  // Loose type: the same dimensions object is passed straight through to
  // either a View (fallback) or an expo-image element. Splitting these into
  // separate strict StyleProp generics doesn't compose cleanly across both.
  style: any;
  fallbackColor?: string;
  transition?: number;
  brand?: string;
  category?: string;
  color?: string;
  /** Scale the monogram + icon for larger tiles (e.g. ProductCard hero). */
  size?: "sm" | "md" | "lg";
}

export function ResilientImage({
  uri,
  style,
  fallbackColor = "#6B7280",
  transition = 250,
  brand,
  category,
  color,
  size = "sm",
}: ResilientImageProps) {
  const [failed, setFailed] = useState(false);

  if (!uri || failed) {
    const monoSize = size === "lg" ? 44 : size === "md" ? 28 : 20;
    const iconSize = size === "lg" ? 18 : size === "md" ? 12 : 9;
    const dotSize  = size === "lg" ? 12 : size === "md" ? 8  : 6;
    return (
      <View
        style={[
          style,
          {
            backgroundColor: "#15151A",
            borderWidth: 0.5,
            borderColor: "rgba(198,167,94,0.25)",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
          },
        ]}
      >
        <Text
          style={{
            fontFamily: "PlayfairDisplay_700Bold",
            fontSize: monoSize,
            color: "#C6A75E",
            letterSpacing: 0.5,
          }}
          numberOfLines={1}
        >
          {brandMonogram(brand)}
        </Text>
        <Feather
          name={categoryIcon(category)}
          size={iconSize}
          color="rgba(245,245,240,0.55)"
          style={{ marginTop: size === "lg" ? 6 : 2 }}
        />
        {color ? (
          <View
            style={{
              position: "absolute",
              bottom: size === "lg" ? 8 : 4,
              right: size === "lg" ? 8 : 4,
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: colorNameToHex(color, fallbackColor),
              borderWidth: 0.5,
              borderColor: "rgba(245,245,240,0.35)",
            }}
          />
        ) : null}
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      contentFit="cover"
      transition={transition}
      onError={() => setFailed(true)}
    />
  );
}
