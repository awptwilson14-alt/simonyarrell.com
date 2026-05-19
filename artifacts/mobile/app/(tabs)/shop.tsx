import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FilterChips } from "@/components/FilterChips";
import { ProductCard } from "@/components/ProductCard";
import { PRODUCTS } from "@/constants/data";
import { useColors } from "@/hooks/useColors";

const FILTER_CATEGORIES = ["All", "Bag", "Shoes", "Outerwear", "Accessories", "Dress", "Bottom", "Jewelry"];
const FILTER_STYLES = ["All", "Old Money", "Luxury Streetwear", "Clean Minimal", "Techwear", "Vacation Luxe"];

export default function ShopScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [categoryFilter, setCategoryFilter] = useState("All");
  const [styleFilter, setStyleFilter] = useState("All");

  const filtered = PRODUCTS.filter((p) => {
    const catMatch = categoryFilter === "All" || p.category === categoryFilter;
    const styleMatch = styleFilter === "All" || p.style === styleFilter;
    return catMatch && styleMatch;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <View style={styles.headerContent}>
          <Text style={[styles.screenTitle, { color: colors.foreground }]}>Shop</Text>
          <Text style={[styles.count, { color: colors.mutedForeground }]}>
            {filtered.length} ITEMS
          </Text>
        </View>
        <View style={styles.filters}>
          <FilterChips
            options={FILTER_CATEGORIES}
            selected={categoryFilter}
            onSelect={setCategoryFilter}
            label="CATEGORY"
          />
          <FilterChips
            options={FILTER_STYLES}
            selected={styleFilter}
            onSelect={setStyleFilter}
            label="STYLE"
          />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 100 + (Platform.OS === "web" ? 34 : insets.bottom) },
        ]}
      >
        {filtered.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 16,
  },
  headerContent: {
    paddingTop: 16,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 12,
  },
  screenTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  count: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 2,
  },
  filters: {
    gap: 16,
  },
  content: {
    padding: 20,
    gap: 0,
  },
});
