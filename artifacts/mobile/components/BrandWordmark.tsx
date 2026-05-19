import React from "react";
import { Image, StyleSheet, View } from "react-native";

const logoImg = require("../assets/images/logo_ms.png");

interface Props {
  centered?: boolean;
  style?: object;
  height?: number;
}

export function BrandWordmark({ centered = false, style, height = 30 }: Props) {
  const aspectRatio = 1.83;
  return (
    <View style={[styles.row, centered && styles.centered, style]}>
      <Image
        source={logoImg}
        style={{ height, width: height * aspectRatio }}
        resizeMode="contain"
      />
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
});
