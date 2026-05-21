import * as Haptics from "expo-haptics";
import { useRouter, useLocalSearchParams } from "expo-router";
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
import { PRODUCTS, TRENDS, isLookInTrend } from "@/constants/data";
import {
  BRANDS,
  BRAND_TIERS,
  BrandTier,
  getBrandsByTier,
} from "@/constants/brands";
import { useColors } from "@/hooks/useColors";
import { BrandWordmark } from "@/components/BrandWordmark";
import { useApp } from "@/context/AppContext";
import { findCelebByName } from "@/lib/celebLookup";

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

  // Brand-handoff from external surfaces (closet WARDROBE SIGNATURE, batch 62).
  // Case-insensitive lookup since closet items are user-entered ("Gucci")
  // while BRANDS catalog uses canonical casing ("GUCCI"). On a hit: pin the
  // mainTab to brands, set the matching tier, expand the brand. Clear the
  // param via setParams after consuming so a re-render doesn't re-fire the
  // effect — same snapshot-then-clear pattern the /style screen uses for
  // celebrity/trendHint params (batches 51/52).
  const { brand: brandParam } = useLocalSearchParams<{ brand?: string | string[] }>();
  React.useEffect(() => {
    if (!brandParam) return;
    // useLocalSearchParams can return string | string[] for repeated keys.
    // We only handle the single-value case; arrays are ambiguous intent here.
    const name = Array.isArray(brandParam) ? brandParam[0] : brandParam;
    if (!name) return;
    const match = BRANDS.find((b) => b.name.toLowerCase() === name.toLowerCase());
    if (match) {
      setMainTab("brands");
      setActiveTier(match.tier);
      // Expansion state is keyed by brand.id (matches the interactive tap
      // handler in the brand drawer below). Passing match.name would land
      // the user on the right tier but leave the brand card collapsed —
      // architect-flagged in batch 62 review.
      setExpandedBrand(match.id);
    }
    router.setParams({ brand: undefined });
  }, [brandParam, router]);
  // Shop products tab trend filter — ninth surface in the trend-hint loop
  // (batches 50/51/52/53/54/55/56/58/60 + this). Closes the asymmetry where
  // saved products could be filtered by trend (profile, batch 60) but the
  // global shop grid couldn't — same Product.style ∈ TRENDS membership, two
  // different filterability stories. Hidden when <2 distinct trends are
  // represented in PRODUCTS, same row-visibility/auto-clear coupling pattern
  // batches 56/57/60 established for the four profile filter guards.
  const [productTrendFilter, setProductTrendFilter] = useState<string | null>(null);
  const { savedProducts } = useApp();

  const tierBrands = getBrandsByTier(activeTier);
  // Per-tier counts powering inline chip badges. Single pass over BRANDS
  // (vs filtering per chip) keeps the row O(n+k) instead of O(n·k). Same
  // chip-count pattern shipped to closet category chips in batch 47 — both
  // surfaces now communicate distribution at a glance so the user knows
  // what they're stepping into BEFORE tapping a tier.
  const tierBrandCounts = (() => {
    const m = new Map<string, number>();
    for (const b of BRANDS) m.set(b.tier, (m.get(b.tier) ?? 0) + 1);
    return m;
  })();
  const accent = TIER_ACCENT[activeTier];

  // Saved products carrying celeb attribution — the only honest source of
  // "icon-channeled shopping" intel. Generic shop saves leave inspiredBy
  // undefined per the Product type comment in data.ts. Capped at 8 so the
  // rail never dominates the products grid below.
  const iconChanneled = savedProducts.filter((p) => p.inspiredBy).slice(0, 8);
  // Resolve the unique celebs represented in the rail — used for the eyebrow
  // count ("3 ICONS · 5 PIECES"). Set-of-names keeps the dedupe trivial.
  const iconNames = new Set(iconChanneled.map((p) => p.inspiredBy!));

  // Which TRENDS are actually represented in PRODUCTS, counted via the
  // canonical isLookInTrend helper (constants/data.ts) — same predicate that
  // powers all eight other trend surfaces. Hide the row at <2 so we never
  // render a single-chip "filter" (not actually a choice). Sort desc by
  // count so the most-stocked trends lead, matching profile savedTrends
  // sort order.
  const shopProductTrends = (() => {
    return TRENDS
      .map((t) => ({
        name: t.name,
        count: PRODUCTS.reduce((n, p) => (isLookInTrend(p, t.name) ? n + 1 : n), 0),
      }))
      .filter(({ count }) => count > 0)
      .sort((a, b) => b.count - a.count);
  })();
  // Same coupling pattern as the four profile filter guards: clear when the
  // selected trend disappears entirely OR when the row would hide (length<2).
  // Single source of truth — row-visibility threshold and auto-clear threshold
  // can never disagree.
  React.useEffect(() => {
    if (
      productTrendFilter &&
      (shopProductTrends.length < 2 ||
        !shopProductTrends.some((t) => t.name === productTrendFilter))
    ) {
      setProductTrendFilter(null);
    }
  }, [productTrendFilter, shopProductTrends]);
  // AND-composed with no other axes today, but keeping the filter shape
  // consistent with profile.visibleSavedProducts so future axes (category,
  // brand) can stack via early-return per axis.
  const visibleProducts = PRODUCTS.filter((p) => {
    if (productTrendFilter && !isLookInTrend(p, productTrendFilter)) return false;
    return true;
  });

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
                      <Text
                        style={[
                          styles.tierChipCount,
                          {
                            color: active ? tierAccent : colors.mutedForeground,
                            opacity: active ? 0.75 : 0.55,
                          },
                        ]}
                      >
                        {"  "}{tierBrandCounts.get(tier.id) ?? 0}
                      </Text>
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
                          onPress={() =>
                            // Batch 83: pass the brand name as a route param
                            // so /style activates brand-lock mode (every
                            // piece slot filtered to ONLY this designer's
                            // catalog items). Snapshotted + cleared on the
                            // /style side so cold-opening the Style tab
                            // later doesn't re-apply the lock.
                            router.push({
                              pathname: "/(tabs)/style",
                              params: { brand: brand.name },
                            })
                          }
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
          <>
            {/* From Your Icons — surfaces saved products that carry
                inspiredBy attribution. Hidden silently when empty so the
                products subtab still leads with the full PRODUCTS grid for
                new users; appears once the user has saved at least one
                celeb-channeled product. Per-card celeb tinting is already
                handled inside ProductCard (batch 35/36 chain). */}
            {iconChanneled.length > 0 && (
              <View style={styles.iconRail}>
                <View style={styles.iconRailHead}>
                  <Text style={[styles.iconRailLabel, { color: colors.gold }]}>
                    FROM YOUR ICONS
                  </Text>
                  <Text style={[styles.iconRailMeta, { color: colors.mutedForeground }]}>
                    {iconNames.size} {iconNames.size === 1 ? "ICON" : "ICONS"} · {iconChanneled.length} {iconChanneled.length === 1 ? "PIECE" : "PIECES"}
                  </Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.iconRailScroll}
                >
                  {iconChanneled.map((product) => {
                    // Resolve celeb for the tiny accent bar at the bottom of
                    // each rail card. Falls back to gold when name can't be
                    // resolved (defensive; matches LookCard fallback from
                    // batch 35).
                    const celeb = findCelebByName(product.inspiredBy);
                    const accentColor = celeb?.accentColor ?? colors.gold;
                    return (
                      <View key={product.id} style={styles.iconRailCardWrap}>
                        <ProductCard product={product} />
                        <View style={[styles.iconRailAccent, { backgroundColor: accentColor }]} />
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Trend filter row — same chip grammar as profile saved-products
                row (batch 60): trending-up icon, gold active state, non-
                uppercased trend names, "ALL TRENDS" pill. Hidden at <2 to
                preserve the editorial flat-grid feel for thin catalogs. */}
            {shopProductTrends.length >= 2 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.shopTrendRow}
              >
                {[{ name: null as string | null, count: PRODUCTS.length, label: "ALL TRENDS" }, ...shopProductTrends.map((t) => ({ name: t.name as string | null, count: t.count, label: t.name }))].map((t) => {
                  const active = productTrendFilter === t.name;
                  return (
                    <Pressable
                      key={t.name ?? "__all"}
                      onPress={() => { Haptics.selectionAsync(); setProductTrendFilter(t.name); }}
                      style={[
                        styles.shopTrendChip,
                        {
                          borderColor: active ? colors.gold : colors.border,
                          backgroundColor: active ? "rgba(198,167,94,0.12)" : "transparent",
                        },
                      ]}
                    >
                      {t.name && <Feather name="trending-up" size={9} color={active ? colors.gold : colors.mutedForeground} />}
                      <Text style={[styles.shopTrendChipText, { color: active ? colors.gold : colors.mutedForeground }]}>
                        {t.label} · {t.count}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
            <View style={styles.productsSection}>
              {visibleProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </View>
          </>
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
  tierChipCount: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
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
  // Trend chip row sits ABOVE the productsSection padding, so it gets its
  // own paddingLeft to line up with the grid (matches the 20px section pad).
  // paddingRight extends so the trailing chip clears comfortably during
  // horizontal scroll. Values mirror profile.celebFilterRow but with the
  // shop's 20px gutter instead of profile's 24px.
  shopTrendRow: { gap: 8, paddingLeft: 20, paddingRight: 24, marginTop: 14, marginBottom: 6 },
  shopTrendChip: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 0.5, paddingHorizontal: 11, paddingVertical: 6 },
  shopTrendChipText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.2 },
  iconRail: {
    paddingTop: 18,
    paddingBottom: 8,
    gap: 10,
  },
  iconRailHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  iconRailLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  iconRailMeta: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1.5,
  },
  iconRailScroll: {
    paddingHorizontal: 20,
    gap: 12,
    paddingRight: 30,
  },
  iconRailCardWrap: {
    width: 160,
  },
  iconRailAccent: {
    height: 2,
    marginTop: 8,
    borderRadius: 1,
  },
});
