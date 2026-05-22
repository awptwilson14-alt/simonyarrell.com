import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";

import { useColors } from "@/hooks/useColors";

/**
 * Editorial gold hairline with a small diamond (rotated square) at the
 * center — the maison crest motif used under "SIMON YARRELL" on the
 * splash and between the GET STARTED button and "Continue as guest".
 * Two side hairlines extend from the diamond. `width` controls total
 * width; the diamond is sized proportionally.
 */
interface OrnamentRuleProps {
  width?: number;
  style?: ViewStyle;
  /** Diamond side length in px. Defaults to 6. */
  diamondSize?: number;
  /** Side-rule color. Defaults to gold theme color. */
  color?: string;
}

export function OrnamentRule({
  width = 180,
  style,
  diamondSize = 6,
  color,
}: OrnamentRuleProps) {
  const colors = useColors();
  const gold = color ?? colors.gold;
  return (
    <View style={[styles.row, { width }, style]}>
      <View style={[styles.rule, { backgroundColor: gold, flex: 1 }]} />
      <View
        style={[
          styles.diamond,
          {
            width: diamondSize,
            height: diamondSize,
            borderColor: gold,
            marginHorizontal: 8,
          },
        ]}
      />
      <View style={[styles.rule, { backgroundColor: gold, flex: 1 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  rule: {
    height: 1,
    opacity: 0.7,
  },
  diamond: {
    borderWidth: 1,
    backgroundColor: "transparent",
    transform: [{ rotate: "45deg" }],
    opacity: 0.85,
  },
});
