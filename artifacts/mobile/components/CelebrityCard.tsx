import * as Haptics from "expo-haptics";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { Celebrity } from "@/constants/data";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

interface CelebrityCardProps {
  celebrity: Celebrity;
  onPress: () => void;
}

export function CelebrityCard({ celebrity, onPress }: CelebrityCardProps) {
  const colors = useColors();
  const { isCelebritySaved, toggleCelebrity } = useApp();
  const saved = isCelebritySaved(celebrity.id);

  const initials = celebrity.name.split(" ").map((n) => n[0]).join("").slice(0, 2);

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleCelebrity(celebrity.id);
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: saved ? colors.gold : colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
        <Text style={[styles.initials, { color: colors.gold }]}>{initials}</Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.foreground }]}>{celebrity.name}</Text>
        <Text style={[styles.style, { color: colors.gold }]}>{celebrity.style}</Text>
        <Text style={[styles.desc, { color: colors.mutedForeground }]} numberOfLines={2}>
          {celebrity.description}
        </Text>
      </View>
      <Pressable onPress={handleSave} hitSlop={12} style={styles.heartBtn}>
        <Feather
          name="heart"
          size={16}
          color={saved ? colors.gold : colors.mutedForeground}
        />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 2,
    borderWidth: 0.5,
    marginBottom: 10,
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  initials: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
  style: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  desc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
    marginTop: 2,
  },
  heartBtn: {
    padding: 4,
  },
});
