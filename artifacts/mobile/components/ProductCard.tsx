import * as Haptics from "expo-haptics";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { Product } from "@/constants/data";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const colors = useColors();
  const { isProductSaved, saveProduct, unsaveProduct } = useApp();
  const saved = isProductSaved(product.id);

  const toggleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (saved) unsaveProduct(product.id);
    else saveProduct(product);
  };

  const categoryColor: Record<string, string> = {
    Bag: "#C9A84C",
    Shoes: "#888880",
    Outerwear: "#A07830",
    Accessories: "#C9A84C",
    Dress: "#888880",
    Top: "#888880",
    Bottom: "#888880",
    Jewelry: "#C9A84C",
  };

  const dot = categoryColor[product.category] ?? "#888880";

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.imagePlaceholder, { backgroundColor: colors.secondary }]}>
        <View style={[styles.dot, { backgroundColor: dot }]} />
        <Text style={[styles.categoryLabel, { color: colors.mutedForeground }]}>
          {product.category}
        </Text>
      </View>
      <View style={styles.info}>
        <View style={styles.topRow}>
          <Text style={[styles.brand, { color: colors.gold }]}>{product.brand}</Text>
          <Pressable onPress={toggleSave} hitSlop={12}>
            <Feather name="heart" size={14} color={saved ? colors.gold : colors.mutedForeground} />
          </Pressable>
        </View>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={[styles.desc, { color: colors.mutedForeground }]} numberOfLines={2}>
          {product.description}
        </Text>
        <View style={styles.bottomRow}>
          <Text style={[styles.price, { color: colors.foreground }]}>
            ${product.price.toLocaleString()}
          </Text>
          <Pressable style={[styles.shopBtn, { borderColor: colors.gold }]}>
            <Text style={[styles.shopText, { color: colors.gold }]}>SHOP</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 2,
    borderWidth: 0.5,
    overflow: "hidden",
    marginBottom: 12,
  },
  imagePlaceholder: {
    height: 160,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  categoryLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  info: {
    padding: 14,
    gap: 6,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  name: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
    lineHeight: 20,
  },
  desc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  price: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  shopBtn: {
    borderWidth: 0.5,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  shopText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
  },
});
