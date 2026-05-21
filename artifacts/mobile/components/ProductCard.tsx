import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { ResilientImage } from "@/components/ResilientImage";
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

  const openShop = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(product.purchaseUrl).catch(() => {});
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* ── Product Image (with editorial brand-monogram fallback) ── */}
      <View style={[styles.imageWrapper, { backgroundColor: colors.secondary }]}>
        <ResilientImage
          uri={product.imageUrl}
          style={styles.image}
          brand={product.brand}
          category={product.category}
          size="lg"
          transition={300}
        />
        {/* Tier badge */}
        <View style={[styles.tierBadge, { backgroundColor: "rgba(11,11,12,0.72)" }]}>
          <Text style={[styles.tierBadgeText, { color: tierColor(product.price) }]}>
            {tierLabel(product.price)}
          </Text>
        </View>
      </View>

      {/* ── Info ── */}
      <View style={styles.info}>
        <View style={styles.topRow}>
          <Text style={[styles.brand, { color: colors.gold }]} numberOfLines={1}>
            {product.brand.toUpperCase()}
          </Text>
          <Pressable onPress={toggleSave} hitSlop={12}>
            <Feather
              name="heart"
              size={15}
              color={saved ? colors.gold : colors.mutedForeground}
            />
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
          <Pressable
            onPress={openShop}
            style={[styles.shopBtn, { backgroundColor: colors.gold }]}
          >
            <Feather name="external-link" size={11} color="#0B0B0C" />
            <Text style={styles.shopText}>BUY NOW</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function tierLabel(price: number): string {
  if (price >= 3000) return "ULTRA LUXURY";
  if (price >= 1000) return "LUXURY";
  if (price >= 400) return "PREMIUM";
  if (price >= 100) return "CONTEMPORARY";
  return "FAST FASHION";
}

function tierColor(price: number): string {
  if (price >= 3000) return "#C6A75E";
  if (price >= 1000) return "#B8A898";
  if (price >= 400) return "#8E9EAB";
  if (price >= 100) return "#7A8C6E";
  return "#9E7A8C";
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 4,
    borderWidth: 0.5,
    overflow: "hidden",
    marginBottom: 14,
  },
  imageWrapper: {
    height: 220,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  tierBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 2,
  },
  tierBadgeText: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
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
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    flex: 1,
    marginRight: 8,
  },
  name: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
    lineHeight: 21,
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
    fontSize: 18,
    fontFamily: "PlayfairDisplay_700Bold",
    letterSpacing: 0.2,
  },
  shopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 2,
  },
  shopText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
    color: "#0B0B0C",
  },
});
