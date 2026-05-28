import * as Haptics from "expo-haptics";
import { LinearGradient } from "@/lib/safeWebShims";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

import { useColors } from "@/hooks/useColors";

interface GoldButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "outline" | "ghost";
  style?: ViewStyle;
  small?: boolean;
}

export function GoldButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
  style,
  small = false,
}: GoldButtonProps) {
  const colors = useColors();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  if (variant === "primary") {
    return (
      <Pressable
        onPress={handlePress}
        disabled={disabled || loading}
        style={({ pressed }) => [
          styles.wrapper,
          small && styles.wrapperSmall,
          { opacity: pressed || disabled ? 0.7 : 1 },
          style,
        ]}
      >
        <LinearGradient
          colors={["#E4C97A", "#C9A84C", "#A07830"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, small && styles.gradientSmall]}
        >
          {/* Inner gold hairline border — couture-plate treatment from
              the splash reference. Sits inset 4px on every side so the
              gradient frames the border, not the other way around. */}
          <View style={[styles.innerBorder, small && styles.innerBorderSmall]} pointerEvents="none" />
          {loading ? (
            <ActivityIndicator color="#080808" size="small" />
          ) : (
            <Text style={[styles.label, small && styles.labelSmall]}>{label}</Text>
          )}
        </LinearGradient>
      </Pressable>
    );
  }

  if (variant === "outline") {
    return (
      <Pressable
        onPress={handlePress}
        disabled={disabled || loading}
        style={({ pressed }) => [
          styles.outline,
          small && styles.outlineSmall,
          { borderColor: colors.gold, opacity: pressed || disabled ? 0.7 : 1 },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.gold} size="small" />
        ) : (
          <Text style={[styles.outlineLabel, { color: colors.gold }, small && styles.labelSmall]}>
            {label}
          </Text>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [{ opacity: pressed || disabled ? 0.5 : 1 }, style]}
    >
      <Text style={[styles.ghostLabel, { color: colors.gold }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 4,
    overflow: "hidden",
  },
  wrapperSmall: {
    borderRadius: 3,
  },
  gradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  gradientSmall: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  innerBorder: {
    position: "absolute",
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderWidth: 0.75,
    borderColor: "rgba(60,40,10,0.55)",
    borderRadius: 2,
  },
  innerBorderSmall: {
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#080808",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  labelSmall: {
    fontSize: 11,
    letterSpacing: 1.5,
  },
  outline: {
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 15,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineSmall: {
    paddingVertical: 9,
    paddingHorizontal: 20,
    borderRadius: 3,
  },
  outlineLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  ghostLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1,
  },
});
