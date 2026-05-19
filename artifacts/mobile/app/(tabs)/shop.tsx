import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { ProductCard } from "@/components/ProductCard";
import { PRODUCTS } from "@/constants/data";
import {
  BRANDS,
  BRAND_TIERS,
  BrandTier,
  getBrandsByTier,
} from "@/constants/brands";
import { useColors } from "@/hooks/useColors";
import { BrandWordmark } from "@/components/BrandWordmark";

const { width } = Dimensions.get("window");
const CARD_W = (width - 48) / 2;

type MainTab = "brands" | "products";

const TIER_ACCENT: Record<BrandTier, string> = {
  "ultra-luxury": "#C6A75E",
  luxury: "#B8A898",
  premium: "#8E9EAB",
  contemporary: "#7A8C6E",
  "fast-fashion": "#9E7A8C",
};

const TIER_ICON: Record<BrandTier, React.ComponentProps<typeof Feather>["name"]> = {
  "ultra-luxury": "award",
  luxury: "star",
  premium: "trending-up",
  contemporary: "shopping-bag",
  "fast-fashion": "zap",
};

export default function ShopScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [mainTab, setMainTab] = useState<MainTab>("brands");
  const [activeTier, setActiveTier] = useState<BrandTier>("ultra-luxury");
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null);

  const tierBrands = getBrandsByTier(activeTier);
  const accent = TIER_ACCENT[activeTier];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topPad }]}>
        <BrandWordmark style={{ marginBottom: 6 }} />
        <View style={styles.headerRow}>
          <Text style={[styles.screenTitle, { color: colors.foreground }]}>Shop</Text>
          <Text style={[styles.brandCount, { color: colors.mutedForeground }]}>
            {BRANDS.length} BRANDS
          </Text>
        </View>

        {/* Main tab toggle */}
        <View style={[styles.mainTabBar, { borderColor: colors.border }]}>
          {(["brands", "products"] as MainTab[]).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => {
                Haptics.selectionAsync();
                setMainTab(tab);
              }}
              style={[
                styles.mainTab,
                { backgroundColor: mainTab === tab ? colors.gold : "transparent" },
              ]}
            >
              <Feather
                name={tab === "brands" ? "grid" : "tag"}
                size={13}
                color={mainTab === tab ? "#0B0B0C" : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.mainTabText,
                  { color: mainTab === tab ? "#0B0B0C" : colors.mutedForeground },
                ]}
              >
                {tab === "brands" ? "BROWSE BRANDS" : "SHOP PRODUCTS"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 100 + (Platform.OS === "web" ? 34 : insets.bottom) },
        ]}
      >
        {/* ══════════════════════════════ BRANDS TAB ══════════════════ */}
        {mainTab === "brands" && (
          <>
            {/* Tier selector */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tierScroll}
              contentContainerStyle={styles.tierList}
            >
              {BRAND_TIERS.map((tier) => {
                const active = activeTier === tier.id;
                const tierAccent = TIER_ACCENT[tier.id];
                return (
                  <Pressable
                    key={tier.id}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setActiveTier(tier.id);
                      setExpandedBrand(null);
                    }}
                    style={[
                      styles.tierChip,
                      {
                        borderColor: active ? tierAccent : colors.border,
                        backgroundColor: active
                          ? `${tierAccent}18`
                          : "transparent",
                      },
                    ]}
                  >
                    <Feather
                      name={TIER_ICON[tier.id]}
                      size={11}
                      color={active ? tierAccent : colors.mutedForeground}
                    />
                    <Text
                      style={[
                        styles.tierChipText,
                        { color: active ? tierAccent : colors.mutedForeground },
                      ]}
                    >
                      {tier.label.toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Tier description */}
            <View
              style={[
                styles.tierHeader,
                { backgroundColor: colors.card, borderColor: accent + "44" },
              ]}
            >
              <View style={styles.tierHeaderLeft}>
                <Feather name={TIER_ICON[activeTier]} size={16} color={accent} />
                <View>
                  <Text style={[styles.tierHeaderTitle, { color: colors.foreground }]}>
                    {BRAND_TIERS.find((t) => t.id === activeTier)?.label}
                  </Text>
                  <Text style={[styles.tierHeaderDesc, { color: colors.mutedForeground }]}>
                    {BRAND_TIERS.find((t) => t.id === activeTier)?.description}
                  </Text>
                </View>
              </View>
              <Text style={[styles.tierCount, { color: accent }]}>
                {tierBrands.length}
              </Text>
            </View>

            {/* Brand grid */}
            <View style={styles.brandGrid}>
              {tierBrands.map((brand) => {
                const isExpanded = expandedBrand === brand.id;
                const initials = brand.name
                  .split(" ")
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase();

                return (
                  <Pressable
                    key={brand.id}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setExpandedBrand(isExpanded ? null : brand.id);
                    }}
                    style={({ pressed }) => [
                      styles.brandCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: isExpanded ? accent : colors.border,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    {/* Monogram */}
                    <View
                      style={[
                        styles.brandMonogram,
                        { backgroundColor: isExpanded ? `${accent}22` : colors.secondary },
                      ]}
                    >
                      <Text
                        style={[
                          styles.brandInitials,
                          { color: isExpanded ? accent : colors.mutedForeground },
                        ]}
                      >
                        {initials}
                      </Text>
                    </View>

                    {/* Info */}
                    <Text
                      style={[styles.brandName, { color: colors.foreground }]}
                      numberOfLines={1}
                    >
                      {brand.name}
                    </Text>
                    <Text
                      style={[styles.brandOrigin, { color: accent }]}
                      numberOfLines={1}
                    >
                      {brand.origin}
                    </Text>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <View style={[styles.brandExpanded, { borderTopColor: colors.border }]}>
                        <Text
                          style={[styles.brandKnown, { color: colors.mutedForeground }]}
                          numberOfLines={2}
                        >
                          {brand.known}
                        </Text>
                        <Text
                          style={[styles.brandDesc, { color: colors.foreground }]}
                        >
                          {brand.description}
                        </Text>
                        <View style={styles.brandCats}>
                          {brand.categories.slice(0, 3).map((cat) => (
                            <View
                              key={cat}
                              style={[
                                styles.catBadge,
                                { borderColor: accent + "66" },
                              ]}
                            >
                              <Text style={[styles.catBadgeText, { color: accent }]}>
                                {cat}
                              </Text>
                            </View>
                          ))}
                        </View>
                        <Pressable
                          style={[styles.brandShopBtn, { borderColor: accent }]}
                          onPress={() => router.push("/(tabs)/style")}
                        >
                          <Text style={[styles.brandShopText, { color: accent }]}>
                            STYLE WITH {brand.name.split(" ")[0].toUpperCase()}
                          </Text>
                          <Feather name="arrow-right" size={12} color={accent} />
                        </Pressable>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* ══════════════════════════════ PRODUCTS TAB ══════════════════ */}
        {mainTab === "products" && (
          <View style={styles.productsSection}>
            {PRODUCTS.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 12,
    paddingTop: 16,
  },
  screenTitle: {
    fontSize: 28,
    fontFamily: "PlayfairDisplay_700Bold",
    letterSpacing: -0.3,
  },
  brandCount: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    letterSpacing: 2,
  },
  mainTabBar: {
    flexDirection: "row",
    borderWidth: 0.5,
    borderRadius: 4,
    overflow: "hidden",
  },
  mainTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 11,
  },
  mainTabText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  content: {
    gap: 0,
  },
  tierScroll: { marginBottom: 0 },
  tierList: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 8,
  },
  tierChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 0.5,
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginRight: 0,
  },
  tierChipText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  tierHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 14,
    borderRadius: 4,
    borderWidth: 0.5,
    gap: 12,
  },
  tierHeaderLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  tierHeaderTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  tierHeaderDesc: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
    marginTop: 2,
  },
  tierCount: {
    fontSize: 28,
    fontFamily: "PlayfairDisplay_700Bold",
    flexShrink: 0,
  },
  brandGrid: {
    paddingHorizontal: 20,
    gap: 10,
  },
  brandCard: {
    borderWidth: 0.5,
    borderRadius: 4,
    padding: 16,
    gap: 6,
  },
  brandMonogram: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  brandInitials: {
    fontSize: 14,
    fontFamily: "PlayfairDisplay_700Bold",
    letterSpacing: 1,
  },
  brandName: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
  brandOrigin: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  brandExpanded: {
    borderTopWidth: 0.5,
    marginTop: 10,
    paddingTop: 14,
    gap: 10,
  },
  brandKnown: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.3,
    lineHeight: 16,
    fontStyle: "italic",
  },
  brandDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  brandCats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  catBadge: {
    borderWidth: 0.5,
    borderRadius: 2,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  catBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
  },
  brandShopBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 0.5,
    borderRadius: 4,
    paddingVertical: 10,
    marginTop: 4,
  },
  brandShopText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  productsSection: {
    padding: 20,
    gap: 0,
  },
});
