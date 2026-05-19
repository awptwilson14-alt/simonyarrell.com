import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { Trend } from "@/constants/data";
import { useColors } from "@/hooks/useColors";

interface TrendCardProps {
  trend: Trend;
  onPress: () => void;
  size?: "large" | "small";
}

export function TrendCard({ trend, onPress, size = "large" }: TrendCardProps) {
  const colors = useColors();
  const isLarge = size === "large";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        isLarge ? styles.cardLarge : styles.cardSmall,
        { opacity: pressed ? 0.88 : 1 },
      ]}
    >
      <Image
        source={trend.image}
        style={[styles.image, isLarge ? styles.imageLarge : styles.imageSmall]}
        resizeMode="cover"
      />
      <View style={styles.overlay}>
        <View style={[styles.badge, { borderColor: colors.gold }]}>
          <Text style={[styles.badgeText, { color: colors.gold }]}>TREND</Text>
        </View>
        <Text style={styles.name}>{trend.name}</Text>
        {isLarge && (
          <Text style={styles.vibe} numberOfLines={1}>
            {trend.vibe}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 2,
    overflow: "hidden",
    position: "relative",
  },
  cardLarge: {
    width: 200,
    marginRight: 12,
  },
  cardSmall: {
    flex: 1,
    minWidth: 140,
  },
  image: {
    width: "100%",
  },
  imageLarge: {
    height: 260,
  },
  imageSmall: {
    height: 180,
  },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
    backgroundColor: "rgba(0,0,0,0.55)",
    gap: 4,
  },
  badge: {
    borderWidth: 0.5,
    alignSelf: "flex-start",
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
  },
  name: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#F5F5F0",
    letterSpacing: 0.3,
  },
  vibe: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(245,245,240,0.7)",
    letterSpacing: 0.3,
  },
});
