import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import {
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { Look } from "@/constants/data";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");

interface LookCardProps {
  look: Look;
  width?: number;
  showSave?: boolean;
}

export function LookCard({ look, width: cardWidth, showSave = true }: LookCardProps) {
  const colors = useColors();
  const { isLookSaved, saveLook, unsaveLook } = useApp();
  const router = useRouter();
  const saved = isLookSaved(look.id);
  const w = cardWidth ?? width * 0.62;

  const toggleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (saved) unsaveLook(look.id);
    else saveLook(look);
  };

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/look/[id]", params: { id: look.id } })}
      style={({ pressed }) => [
        styles.card,
        { width: w, backgroundColor: colors.card, opacity: pressed ? 0.92 : 1 },
      ]}
    >
      <View style={styles.imageContainer}>
        <Image source={look.image} style={[styles.image, { width: w }]} resizeMode="cover" />
        {showSave && (
          <Pressable onPress={toggleSave} style={styles.saveBtn} hitSlop={12}>
            <Feather name={saved ? "heart" : "heart"} size={18} color={saved ? colors.gold : "#fff"} />
          </Pressable>
        )}
        <View style={styles.styleTag}>
          <Text style={styles.styleTagText}>{look.style}</Text>
        </View>
      </View>
      <View style={[styles.info, { borderTopColor: colors.border }]}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
          {look.name}
        </Text>
        <View style={styles.meta}>
          <Text style={[styles.occasion, { color: colors.mutedForeground }]}>{look.occasion}</Text>
          <Text style={[styles.price, { color: colors.gold }]}>
            ${look.estimatedPrice.toLocaleString()}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 2,
    overflow: "hidden",
    marginRight: 12,
  },
  imageContainer: {
    position: "relative",
  },
  image: {
    height: 320,
  },
  saveBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 8,
  },
  styleTag: {
    position: "absolute",
    bottom: 12,
    left: 12,
    backgroundColor: "rgba(201,168,76,0.9)",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  styleTagText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#080808",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  info: {
    padding: 12,
    borderTopWidth: 0.5,
    gap: 4,
  },
  name: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
  meta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  occasion: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  price: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
});
