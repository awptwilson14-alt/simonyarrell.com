import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";

import { useColors } from "@/hooks/useColors";

// Single source of truth for the gold editorial hairline rule that sits under
// screen titles and section headers across the app. Extracted in batch 119
// after the motif drifted into 8+ inline definitions (batches 115-118):
// SectionHeader, every tab title (Home/Explore/Closet/Shop), and the
// modal/stack routes (Activity, Celebrity directory, Partners). Centralizing
// here keeps the gold tint, height (1px hairline), and opacity (0.7) locked
// in one spot — width remains a knob so each surface can size the rule
// proportionally to its title (24px title → 28px rule, 32px → 32px,
// 40px Playfair hero → 40px). Pure decoration — no interactivity.
interface TitleRuleProps {
  width?: number;
  style?: ViewStyle;
}

export function TitleRule({ width = 32, style }: TitleRuleProps) {
  const colors = useColors();
  // Caller `style` is applied FIRST so the locked properties (height,
  // opacity, backgroundColor, width) come after and always win. This
  // guarantees the motif can't drift via caller overrides — only layout
  // tweaks like margin/padding/alignSelf survive. Width is configurable
  // through the explicit prop, not via style.
  return (
    <View
      style={[
        style,
        styles.rule,
        { width, backgroundColor: colors.gold },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  rule: {
    height: 1,
    opacity: 0.7,
  },
});
