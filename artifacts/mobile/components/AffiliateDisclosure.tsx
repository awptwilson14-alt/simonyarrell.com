import React from "react";
import { StyleSheet, Text, type StyleProp, type TextStyle } from "react-native";
import { useColors } from "@/hooks/useColors";

/**
 * Reusable affiliate disclosure — required in shopping areas, product pages,
 * and relevant legal pages. One component so the wording stays consistent
 * everywhere.
 */
export default function AffiliateDisclosure({ style }: { style?: StyleProp<TextStyle> }) {
  const colors = useColors();
  return (
    <Text style={[styles.text, { color: colors.mutedForeground }, style]}>
      Simon Yarrell may earn a commission from qualifying purchases made through retailer links.
      This never affects which pieces we recommend or the price you pay.
    </Text>
  );
}

const styles = StyleSheet.create({
  text: { fontSize: 10, lineHeight: 15, fontStyle: "italic" },
});
