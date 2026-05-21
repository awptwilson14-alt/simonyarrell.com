import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  Alert,
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

import { GoldButton } from "@/components/GoldButton";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useRouter } from "expo-router";
import { BrandWordmark } from "@/components/BrandWordmark";

const CATEGORIES = ["All", "Tops", "Bottoms", "Dresses", "Outerwear", "Shoes", "Bags", "Accessories", "Jewelry"];
const COLORS_LIST = ["Black", "White", "Navy", "Camel", "Beige", "Ivory", "Grey", "Brown", "Gold", "Silver", "Red", "Green", "Blue"];

export default function ClosetScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { closetItems, addClosetItem, removeClosetItem } = useApp();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [activeCategory, setActiveCategory] = useState("All");
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
    (i) => activeCategory === "All" || i.category === activeCategory
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
          <Text style={[styles.screenTitle, { color: colors.foreground }]}>My Closet</Text>
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
            speculative. Tapping does nothing — purely an editorial overview. */}
        {signature && (
          <View style={[styles.signatureCard, { borderColor: colors.gold + "40", backgroundColor: colors.card }]}>
            <Text style={[styles.signatureLabel, { color: colors.gold }]}>WARDROBE SIGNATURE</Text>
            <View style={styles.signatureRow}>
              {signature.brand && (
                <View style={styles.signatureBlock}>
                  <Text style={[styles.signatureKey, { color: colors.mutedForeground }]}>MOST WORN</Text>
                  <Text style={[styles.signatureVal, { color: colors.foreground }]} numberOfLines={1}>
                    {signature.brand}
                  </Text>
                </View>
              )}
              {signature.colors.length > 0 && (
                <View style={styles.signatureBlock}>
                  <Text style={[styles.signatureKey, { color: colors.mutedForeground }]}>PALETTE</Text>
                  <View style={styles.paletteRow}>
                    {signature.colors.map((c) => (
                      <View
                        key={c}
                        style={[styles.paletteDot, { backgroundColor: dotColor[c] ?? "#888", borderColor: colors.border }]}
                      />
                    ))}
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

        {/* Closet Grid */}
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="shopping-bag" size={40} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {closetItems.length === 0 ? "Your closet is empty" : "No items in this category"}
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Add pieces from your wardrobe to get personalized outfit recommendations using items you already own.
            </Text>
            <GoldButton label="Add First Item" onPress={() => setShowAddForm(true)} variant="outline" />
          </View>
        ) : (
          <View style={styles.grid}>
            {filtered.map((item) => (
              <View key={item.id} style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.itemColorBlock, { backgroundColor: dotColor[item.color] ?? "#333" }]} />
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[styles.itemBrand, { color: colors.gold }]} numberOfLines={1}>{item.brand}</Text>
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
  itemMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  empty: { alignItems: "center", paddingVertical: 60, gap: 16 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: 0.2 },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20, textAlign: "center", maxWidth: 280 },
  closetActions: { marginTop: 8 },
  signatureCard: { borderWidth: 0.5, borderRadius: 2, padding: 16, gap: 12 },
  signatureLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  signatureRow: { flexDirection: "row", gap: 24 },
  signatureBlock: { gap: 6, flex: 1 },
  signatureKey: { fontSize: 9, fontFamily: "Inter_500Medium", letterSpacing: 1.5 },
  signatureVal: { fontSize: 14, fontFamily: "Inter_600SemiBold", letterSpacing: 0.2 },
  paletteRow: { flexDirection: "row", gap: 6, marginTop: 2 },
  paletteDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 0.5 },
});
