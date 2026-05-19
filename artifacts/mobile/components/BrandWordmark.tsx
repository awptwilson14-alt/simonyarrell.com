import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  centered?: boolean;
  style?: object;
}

export function BrandWordmark({ centered = false, style }: Props) {
  const colors = useColors();
  return (
    <View style={[styles.row, centered && styles.centered, style]}>
      <Text style={[styles.mark, { color: colors.gold }]}>MS</Text>
      <Text style={[styles.name, { color: colors.foreground }]}>MAISON SIMON</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  centered: {
    justifyContent: "center",
  },
  mark: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  name: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 3.5,
    opacity: 0.9,
  },
});
