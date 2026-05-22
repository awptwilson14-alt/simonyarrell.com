import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { GoldButton } from "@/components/GoldButton";
import { SPLASH_HEROES } from "@/constants/heroImages";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useShopBrandHandoff } from "@/hooks/useShopBrandHandoff";
import { useRouter } from "expo-router";
import { BrandWordmark } from "@/components/BrandWordmark";
import { TitleRule } from "@/components/TitleRule";

const CATEGORIES = ["All", "Tops", "Bottoms", "Dresses", "Outerwear", "Shoes", "Bags", "Accessories", "Jewelry"];
const COLORS_LIST = ["Black", "White", "Navy", "Camel", "Beige", "Ivory", "Grey", "Brown", "Gold", "Silver", "Red", "Green", "Blue"];

export default function ClosetScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { closetItems, addClosetItem, removeClosetItem, userProfile } = useApp();
  const router = useRouter();
  // Batch 64 surfaced goShopBrand for the WARDROBE SIGNATURE MOST WORN
  // brand (which skipped the catalog gate — the user's own most-worn brand
  // is a trusted single signal). Batch 66 also pulls brandCatalog because
  // individual closet items carry user-entered brand strings that may not
  // match a canonical BRANDS catalog entry (e.g. "MyVintageStore"). Gate
  // here so each item card only shows the chevron affordance when the
  // brand actually resolves in /shop — fail-closed matches the affordance
  // contract used by look pieces, celebrity chips, and ProductCard.
  const { brandCatalog, goShopBrand } = useShopBrandHandoff();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [activeCategory, setActiveCategory] = useState("All");
  // In-page color filter driven by the WARDROBE SIGNATURE palette dots
  // (batch 69). Null = no color filter active. Kept here rather than in
  // AppContext because it's a transient view-state, not a persisted
  // preference — same lifecycle treatment as activeCategory.
  const [activeColor, setActiveColor] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [newCategory, setNewCategory] = useState("Tops");
  const [newColor, setNewColor] = useState("Black");

  // Per-category live counts powering the filter chip badges. Single pass
  // over closetItems (vs filtering per chip in render) keeps the chip row
  // O(n+k) instead of O(n·k). Empty categories are hidden from the chip row
  // (except "All", which always shows the total) so the filter doesn't
  // surface dead taps for things the user has never added.
  const categoryCounts = (() => {
    const m = new Map<string, number>();
    for (const it of closetItems) m.set(it.category, (m.get(it.category) ?? 0) + 1);
    return m;
  })();
  const visibleCategories = CATEGORIES.filter(
    (c) => c === "All" || (categoryCounts.get(c) ?? 0) > 0,
  );
  const countFor = (cat: string) =>
    cat === "All" ? closetItems.length : (categoryCounts.get(cat) ?? 0);

  // Auto-reset to "All" if the active category's chip just vanished (user
  // deleted their last item in that bucket). Without this guard, the chip
  // row would have no visible active state and the grid would render
  // "No items in this category" — recoverable only by tapping another chip.
  // Effect, not render-time setState, to avoid React's "Cannot update during
  // render" anti-pattern. Same self-healing pattern as profile.tsx's celeb
  // filter guards (batches 33, 46).
  useEffect(() => {
    if (activeCategory !== "All" && (categoryCounts.get(activeCategory) ?? 0) === 0) {
      setActiveCategory("All");
    }
  }, [activeCategory, categoryCounts]);

  const filtered = closetItems.filter(
    (i) =>
      (activeCategory === "All" || i.category === activeCategory) &&
      (activeColor === null || i.color === activeColor)
  );

  // Derived "wardrobe signature" — mode of brand and color across the full
  // closet (NOT the active-category filter; signature should reflect the
  // whole wardrobe, not whatever view the user is currently scoped to).
  // Cheap O(n) reduction; closets are small so no memoization needed.
  // "Unknown" brand is excluded — it's the placeholder for items added
  // without a brand and shouldn't dominate the signature.
  const signature = (() => {
    if (closetItems.length < 3) return null;
    const brandCount = new Map<string, number>();
    const colorCount = new Map<string, number>();
    for (const it of closetItems) {
      if (it.brand && it.brand !== "Unknown") {
        brandCount.set(it.brand, (brandCount.get(it.brand) ?? 0) + 1);
      }
      colorCount.set(it.color, (colorCount.get(it.color) ?? 0) + 1);
    }
    const topBrand = [...brandCount.entries()].sort((a, b) => b[1] - a[1])[0];
    const topColors = [...colorCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    // Only render if we have either a real top brand OR enough color data.
    // Empty signature would just be visual noise.
    if (!topBrand && topColors.length === 0) return null;
    return { brand: topBrand?.[0], colors: topColors.map(([c]) => c) };
  })();

  // Self-healing color filter — clears activeColor whenever the matching
  // palette dot is no longer rendered, NOT just when the color is absent
  // from the closet. Two scenarios this guards against:
  //   1. User deletes the last item of activeColor → color drops out of
  //      colorCount entirely → dot vanishes.
  //   2. User adds enough items of OTHER colors that activeColor falls out
  //      of the top-3 slice → color still exists in closet, but its dot
  //      vanishes from the palette row.
  // Both cases produce the same dead-end: a hidden active filter the user
  // can't toggle off. Guard reads from signature?.colors — the same source
  // of truth the dot-row renders from — so behavior and UI cannot diverge.
  // closetItems is the dep (signature is derived from it; depending on the
  // recomputed signature object would loop). Architect-corrected (batch 69
  // first pass used closetItems.some which missed scenario 2).
  useEffect(() => {
    if (activeColor !== null && !signature?.colors.includes(activeColor)) {
      setActiveColor(null);
    }
  }, [activeColor, closetItems]);

  const handleAdd = () => {
    if (!newName.trim()) return;
    addClosetItem({ name: newName.trim(), brand: newBrand.trim() || "Unknown", category: newCategory, color: newColor });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setNewName("");
    setNewBrand("");
    setShowAddForm(false);
  };

  const handleDelete = (id: string, name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert("Remove Item", `Remove "${name}" from your closet?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removeClosetItem(id) },
    ]);
  };

  const dotColor: Record<string, string> = {
    Black: "#1A1A1A", White: "#F5F5F0", Navy: "#1B2A4A", Camel: "#C19A6B",
    Beige: "#F5F0E8", Ivory: "#FFFFF0", Grey: "#808080", Brown: "#8B4513",
    Gold: "#C9A84C", Silver: "#C0C0C0", Red: "#8B0000", Green: "#355E3B", Blue: "#4169E1",
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad }]}>
        <BrandWordmark style={{ marginBottom: 6 }} />
        <View style={styles.headerContent}>
          <View style={styles.titleBlock}>
            <Text style={[styles.screenTitle, { color: colors.foreground }]}>My Closet</Text>
            {/* Shared TitleRule atom (batch 119). */}
            <TitleRule />
          </View>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowAddForm(!showAddForm);
            }}
            style={[styles.addBtn, { borderColor: colors.gold }]}
          >
            <Feather name={showAddForm ? "x" : "plus"} size={16} color={colors.gold} />
          </Pressable>
        </View>
        <Text style={[styles.count, { color: colors.mutedForeground }]}>
          {closetItems.length} ITEMS
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 100 + (Platform.OS === "web" ? 34 : insets.bottom) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Add Form */}
        {showAddForm && (
          <View style={[styles.addForm, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.formTitle, { color: colors.gold }]}>ADD ITEM</Text>

            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Item name *"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.textInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
            />
            <TextInput
              value={newBrand}
              onChangeText={setNewBrand}
              placeholder="Brand (optional)"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.textInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>CATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {CATEGORIES.slice(1).map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => { Haptics.selectionAsync(); setNewCategory(cat); }}
                    style={[styles.chip, { borderColor: newCategory === cat ? colors.gold : colors.border, backgroundColor: newCategory === cat ? "rgba(201,168,76,0.1)" : "transparent" }]}
                  >
                    <Text style={[styles.chipText, { color: newCategory === cat ? colors.gold : colors.mutedForeground }]}>{cat}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>COLOR</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {COLORS_LIST.map((col) => (
                  <Pressable
                    key={col}
                    onPress={() => { Haptics.selectionAsync(); setNewColor(col); }}
                    style={[styles.colorChip, { borderColor: newColor === col ? colors.gold : colors.border }]}
                  >
                    <View style={[styles.colorDot, { backgroundColor: dotColor[col] ?? "#888" }]} />
                    <Text style={[styles.chipText, { color: newColor === col ? colors.gold : colors.mutedForeground }]}>{col}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <GoldButton label="Add to Closet" onPress={handleAdd} disabled={!newName.trim()} />
          </View>
        )}

        {/* Wardrobe Signature — derived intel about the user's closet shape.
            Suppressed for sparse closets (<3 items) so it doesn't read as
            speculative. MOST WORN brand is tappable (batch 62) → jumps to
            shop with that brand pre-expanded inside its tier; closes a clear
            dead-end where the user's strongest closet signal had no follow-
            through. PALETTE dots are tappable (batch 69) as an in-page color
            filter — closes the prior dead-end without inventing a fictional
            /shop?color=X surface. Distinct vocab from the shop handoff: no
            chevron, gold ring + thicker border on active = "filter this view"
            (sibling to the activeCategory chip pattern below), NOT "navigate
            away". Selection haptic mirrors the category chips. */}
        {signature && (
          <View style={[styles.signatureCard, { borderColor: colors.gold + "40", backgroundColor: colors.card }]}>
            <Text style={[styles.signatureLabel, { color: colors.gold }]}>WARDROBE SIGNATURE</Text>
            <View style={styles.signatureRow}>
              {signature.brand && (
                <Pressable
                  // Closet WARDROBE SIGNATURE → shop brand drawer (batch 62,
                  // refactored to shared hook batch 64). NOT gated by
                  // brandCatalog — user's most-worn brand is a trusted single
                  // signal, gating would be a UX regression if a niche brand
                  // they actually own isn't in the BRANDS catalog. Shop side
                  // handles miss silently (param cleared, no state change).
                  onPress={() => goShopBrand(signature.brand)}
                  style={({ pressed }) => [styles.signatureBlock, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <Text style={[styles.signatureKey, { color: colors.mutedForeground }]}>MOST WORN</Text>
                  <View style={styles.signatureBrandRow}>
                    <Text style={[styles.signatureVal, { color: colors.gold }]} numberOfLines={1}>
                      {signature.brand}
                    </Text>
                    <Feather name="chevron-right" size={14} color={colors.gold} />
                  </View>
                </Pressable>
              )}
              {signature.colors.length > 0 && (
                <View style={styles.signatureBlock}>
                  <Text style={[styles.signatureKey, { color: colors.mutedForeground }]}>
                    {activeColor && signature.colors.includes(activeColor)
                      ? `PALETTE · ${activeColor.toUpperCase()}`
                      : "PALETTE"}
                  </Text>
                  <View style={styles.paletteRow}>
                    {signature.colors.map((c) => {
                      const active = activeColor === c;
                      return (
                        <Pressable
                          key={c}
                          onPress={() => {
                            Haptics.selectionAsync();
                            setActiveColor(active ? null : c);
                          }}
                          hitSlop={6}
                          accessibilityRole="button"
                          accessibilityLabel={active ? `Clear ${c} filter` : `Filter closet by ${c}`}
                          style={[
                            styles.paletteDot,
                            {
                              backgroundColor: dotColor[c] ?? "#888",
                              borderColor: active ? colors.gold : colors.border,
                              borderWidth: active ? 1.5 : 0.5,
                            },
                          ]}
                        />
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Category Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
          <View style={styles.chipRow}>
            {visibleCategories.map((cat) => {
              const active = activeCategory === cat;
              const count = countFor(cat);
              return (
                <Pressable
                  key={cat}
                  onPress={() => { Haptics.selectionAsync(); setActiveCategory(cat); }}
                  style={[styles.chip, { borderColor: active ? colors.gold : colors.border, backgroundColor: active ? colors.gold : "transparent" }]}
                >
                  <Text style={[styles.chipText, { color: active ? "#080808" : colors.mutedForeground }]}>
                    {cat}
                    <Text style={[styles.chipCount, { color: active ? "#080808" : colors.mutedForeground, opacity: active ? 0.7 : 0.55 }]}>
                      {"  "}{count}
                    </Text>
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {/* Closet Grid — empty state mirrors activity inbox (batch 106) with
            a gendered editorial backdrop. Same SPLASH_HEROES + 3-stop dark
            gradient pattern so legibility is preserved across the app. */}
        {filtered.length === 0 ? (() => {
          const heroKey: "men" | "women" =
            userProfile.gender === "Men" ? "men" : "women";
          return (
            <View style={[styles.empty, { borderColor: colors.border }]}>
              <Image
                source={SPLASH_HEROES[heroKey]}
                style={styles.emptyBackdrop}
                resizeMode="cover"
              />
              <LinearGradient
                colors={["rgba(11,11,12,0.55)", "rgba(11,11,12,0.88)", "rgba(11,11,12,0.96)"]}
                locations={[0, 0.5, 1]}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.emptyContent}>
                <Feather name="shopping-bag" size={40} color={colors.gold} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                  {closetItems.length === 0
                    ? "Your closet is empty"
                    : activeColor
                    ? `No ${activeColor.toLowerCase()} items${activeCategory !== "All" ? ` in ${activeCategory}` : ""}`
                    : "No items in this category"}
                </Text>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  Add pieces from your wardrobe to get personalized outfit recommendations using items you already own.
                </Text>
                <GoldButton label="Add First Item" onPress={() => setShowAddForm(true)} variant="outline" />
              </View>
            </View>
          );
        })() : (
          <View style={styles.grid}>
            {filtered.map((item) => (
              <View key={item.id} style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.itemColorBlock, { backgroundColor: dotColor[item.color] ?? "#333" }]} />
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
                  {brandCatalog.has(item.brand.toLowerCase()) ? (
                    // Item-level closet→shop handoff (batch 66). Symmetric
                    // to the WARDROBE SIGNATURE handoff (batch 62) but at
                    // single-item granularity: tap a piece's brand to jump
                    // straight to that brand's drawer in /shop. itemCard is
                    // a View (not Pressable) so this nested Pressable is
                    // safe; alignSelf:flex-start keeps the tap target snug
                    // around the text+chevron rather than swallowing the
                    // whole column width (matches look-piece-brand vocab).
                    <Pressable
                      onPress={() => goShopBrand(item.brand)}
                      hitSlop={4}
                      style={({ pressed }) => [styles.itemBrandLinkRow, { opacity: pressed ? 0.6 : 1 }]}
                    >
                      <Text style={[styles.itemBrand, { color: colors.gold }]} numberOfLines={1}>{item.brand}</Text>
                      <Feather name="chevron-right" size={11} color={colors.gold} />
                    </Pressable>
                  ) : (
                    <Text style={[styles.itemBrand, { color: colors.gold }]} numberOfLines={1}>{item.brand}</Text>
                  )}
                  <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>{item.category} · {item.color}</Text>
                </View>
                <Pressable onPress={() => handleDelete(item.id, item.name)} hitSlop={12}>
                  <Feather name="trash-2" size={14} color={colors.mutedForeground} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {closetItems.length > 0 && (
          <View style={styles.closetActions}>
            <GoldButton
              label="Style with My Closet"
              onPress={() => router.push("/(tabs)/style")}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 16 },
  titleBlock: { gap: 6 },
  screenTitle: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  addBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 0.5, alignItems: "center", justifyContent: "center" },
  count: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 2, marginTop: 4 },
  content: { paddingHorizontal: 20, gap: 20 },
  addForm: { borderWidth: 0.5, borderRadius: 2, padding: 18, gap: 16 },
  formTitle: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  textInput: { borderWidth: 0.5, borderRadius: 2, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: "Inter_400Regular" },
  fieldLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 2 },
  chipRow: { flexDirection: "row", gap: 8 },
  chip: { borderWidth: 0.5, borderRadius: 2, paddingHorizontal: 12, paddingVertical: 7 },
  chipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  chipCount: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  colorChip: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 0.5, borderRadius: 2, paddingHorizontal: 10, paddingVertical: 7 },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  catScroll: { marginBottom: -4 },
  grid: { gap: 10 },
  itemCard: { flexDirection: "row", alignItems: "center", borderWidth: 0.5, borderRadius: 2, overflow: "hidden", gap: 14 },
  itemColorBlock: { width: 8, alignSelf: "stretch" },
  itemInfo: { flex: 1, paddingVertical: 14, gap: 2 },
  itemName: { fontSize: 14, fontFamily: "Inter_600SemiBold", letterSpacing: 0.2 },
  itemBrand: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 1 },
  itemBrandLinkRow: { flexDirection: "row", alignItems: "center", gap: 3, alignSelf: "flex-start" },
  itemMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  empty: { marginHorizontal: 20, marginTop: 16, borderWidth: 0.5, borderRadius: 2, overflow: "hidden" },
  emptyBackdrop: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%", opacity: 0.55 },
  emptyContent: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 24, gap: 16 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: 0.2 },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20, textAlign: "center", maxWidth: 280 },
  closetActions: { marginTop: 8 },
  signatureCard: { borderWidth: 0.5, borderRadius: 2, padding: 16, gap: 12 },
  signatureBrandRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  signatureLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  signatureRow: { flexDirection: "row", gap: 24 },
  signatureBlock: { gap: 6, flex: 1 },
  signatureKey: { fontSize: 9, fontFamily: "Inter_500Medium", letterSpacing: 1.5 },
  signatureVal: { fontSize: 14, fontFamily: "Inter_600SemiBold", letterSpacing: 0.2 },
  paletteRow: { flexDirection: "row", gap: 6, marginTop: 2 },
  paletteDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 0.5 },
});
