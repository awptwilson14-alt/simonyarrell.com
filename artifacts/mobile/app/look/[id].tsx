import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { GoldButton } from "@/components/GoldButton";
import { LookCard } from "@/components/LookCard";
import { LOOKS, OutfitPiece } from "@/constants/data";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const { width, height } = Dimensions.get("window");

type PanelView = "details" | "shop";

export default function LookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isLookSaved, saveLook, unsaveLook, saveProduct, isProductSaved } = useApp();
  const [panel, setPanel] = useState<PanelView>("details");

  const look = LOOKS.find((l) => l.id === id);
  const related = LOOKS.filter((l) => l.id !== id && l.style === look?.style).slice(0, 3);
  const allRelated = related.length > 0 ? related : LOOKS.filter((l) => l.id !== id).slice(0, 3);

  if (!look) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Text style={[{ color: colors.foreground, fontSize: 16 }]}>Look not found</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: colors.gold }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const saved = isLookSaved(look.id);
  const total = look.pieces.reduce((sum, p) => sum + p.price, 0);

  const toggleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (saved) unsaveLook(look.id);
    else saveLook(look);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>

        {/* ── Hero Image ── */}
        <View style={styles.heroContainer}>
          <Image source={look.image} style={styles.heroImage} resizeMode="cover" />
          <LinearGradient
            colors={["rgba(11,11,12,0.6)", "transparent", "transparent", "#0B0B0C"]}
            locations={[0, 0.25, 0.65, 1]}
            style={StyleSheet.absoluteFill}
          />

          {/* Top bar */}
          <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
            <Pressable
              onPress={() => router.back()}
              style={[styles.circleBtn, { backgroundColor: "rgba(11,11,12,0.6)" }]}
              hitSlop={12}
            >
              <Feather name="arrow-left" size={18} color="#F5F5F0" />
            </Pressable>
            <View style={styles.topRight}>
              <Pressable
                onPress={toggleSave}
                style={[styles.circleBtn, {
                  backgroundColor: saved ? colors.gold : "rgba(11,11,12,0.6)",
                }]}
                hitSlop={12}
              >
                <Feather name="heart" size={16} color={saved ? "#0B0B0C" : "#F5F5F0"} />
              </Pressable>
              <Pressable
                style={[styles.circleBtn, { backgroundColor: "rgba(11,11,12,0.6)" }]}
                hitSlop={12}
              >
                <Feather name="share" size={16} color="#F5F5F0" />
              </Pressable>
            </View>
          </View>

          {/* Hero info */}
          <View style={styles.heroInfo}>
            <View style={[styles.stylePill, { borderColor: colors.gold }]}>
              <Text style={[styles.stylePillText, { color: colors.gold }]}>{look.style}</Text>
            </View>
            <Text style={styles.lookName}>{look.name}</Text>
            <Text style={styles.lookDesc} numberOfLines={2}>{look.description}</Text>
          </View>
        </View>

        {/* ── Panel Toggle ── */}
        <View style={[styles.panelToggle, { borderBottomColor: colors.border }]}>
          {(["details", "shop"] as PanelView[]).map((p) => (
            <Pressable
              key={p}
              onPress={() => setPanel(p)}
              style={[styles.panelTab, p === panel && { borderBottomColor: colors.gold, borderBottomWidth: 2 }]}
            >
              <Text style={[styles.panelTabText, { color: p === panel ? colors.gold : colors.mutedForeground }]}>
                {p === "details" ? "LOOK DETAILS" : "SHOP THE LOOK"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── Details Panel ── */}
        {panel === "details" && (
          <View style={[styles.section, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>The Look</Text>
            <Text style={[styles.sectionMeta, { color: colors.mutedForeground }]}>
              {look.occasion} · {look.season} · {look.pieces.length} pieces
            </Text>

            <View style={styles.piecesList}>
              {look.pieces.map((piece, idx) => (
                <View
                  key={piece.id}
                  style={[styles.pieceRow, { borderBottomColor: colors.border }, idx === look.pieces.length - 1 && { borderBottomWidth: 0 }]}
                >
                  <View style={[styles.pieceThumb, { backgroundColor: colors.secondary }]}>
                    <View style={[styles.pieceDot, { backgroundColor: categoryColor(piece.category) }]} />
                  </View>
                  <View style={styles.pieceInfo}>
                    <Text style={[styles.pieceBrand, { color: colors.gold }]}>{piece.brand.toUpperCase()}</Text>
                    <Text style={[styles.pieceName, { color: colors.foreground }]}>{piece.name}</Text>
                    <Text style={[styles.pieceCategory, { color: colors.mutedForeground }]}>{piece.category}</Text>
                  </View>
                  <Text style={[styles.piecePrice, { color: colors.foreground }]}>
                    ${piece.price.toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>

            <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>TOTAL LOOK</Text>
              <Text style={[styles.totalPrice, { color: colors.foreground }]}>
                ${look.estimatedPrice.toLocaleString()}
              </Text>
            </View>
          </View>
        )}

        {/* ── Shop Panel ── */}
        {panel === "shop" && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Shop the Look</Text>
            <Text style={[styles.sectionMeta, { color: colors.mutedForeground }]}>
              {look.pieces.length} items · Total ${look.estimatedPrice.toLocaleString()}
            </Text>

            <View style={styles.shopList}>
              {look.pieces.map((piece, idx) => {
                const pid = `look_${look.id}_${piece.id}`;
                const saved = isProductSaved(pid);
                return (
                  <View
                    key={piece.id}
                    style={[styles.shopRow, { borderBottomColor: colors.border }, idx === look.pieces.length - 1 && { borderBottomWidth: 0 }]}
                  >
                    <View style={[styles.shopThumb, { backgroundColor: colors.secondary }]}>
                      <View style={[styles.pieceDot, { backgroundColor: categoryColor(piece.category) }]} />
                    </View>
                    <View style={styles.shopInfo}>
                      <Text style={[styles.shopBrand, { color: colors.gold }]}>{piece.brand.toUpperCase()}</Text>
                      <Text style={[styles.shopName, { color: colors.foreground }]}>{piece.name}</Text>
                      <Text style={[styles.shopPrice, { color: colors.mutedForeground }]}>
                        ${piece.price.toLocaleString()}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        saveProduct({ id: pid, name: piece.name, brand: piece.brand, price: piece.price, category: piece.category, style: look.style, description: "" });
                      }}
                      hitSlop={12}
                    >
                      <Feather name="heart" size={16} color={saved ? colors.gold : colors.mutedForeground} />
                    </Pressable>
                  </View>
                );
              })}
            </View>

            <View style={[styles.shopTotal, { borderTopColor: colors.border }]}>
              <Text style={[styles.shopTotalLabel, { color: colors.mutedForeground }]}>TOTAL</Text>
              <Text style={[styles.shopTotalPrice, { color: colors.foreground }]}>
                ${look.estimatedPrice.toLocaleString()}
              </Text>
            </View>
          </View>
        )}

        {/* ── CTA ── */}
        <View style={styles.cta}>
          <GoldButton label="SHOP THE LOOK" onPress={() => setPanel("shop")} />
          <GoldButton label={saved ? "SAVED" : "SAVE LOOK"} onPress={toggleSave} variant="outline" />
        </View>

        {/* ── Item thumbnails strip ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbStrip}>
          {look.pieces.map((piece) => (
            <View key={piece.id} style={[styles.stripThumb, { backgroundColor: colors.secondary }]}>
              <View style={[styles.stripDot, { backgroundColor: categoryColor(piece.category) }]} />
            </View>
          ))}
        </ScrollView>

        {/* ── Related Looks ── */}
        <View style={[styles.relatedSection, { borderTopColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, paddingHorizontal: 24, marginBottom: 16 }]}>
            You Might Also Love
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
            {allRelated.map((l) => (
              <LookCard key={l.id} look={l} />
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

function categoryColor(category: string): string {
  const map: Record<string, string> = {
    Dress: "#C6A75E", Top: "#6B7280", Bottom: "#4B5563",
    Outerwear: "#9A7C38", Shoes: "#9CA3AF", Bag: "#C6A75E",
    Jewelry: "#E0C882", Accessories: "#C6A75E",
  };
  return map[category] ?? "#6B7280";
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  heroContainer: { height: height * 0.58, position: "relative", justifyContent: "flex-end" },
  heroImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  topBar: {
    position: "absolute", top: 0, left: 0, right: 0,
    flexDirection: "row", justifyContent: "space-between",
    paddingHorizontal: 20, alignItems: "center",
  },
  circleBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
  },
  topRight: { flexDirection: "row", gap: 10 },
  heroInfo: { padding: 24, gap: 8 },
  stylePill: {
    alignSelf: "flex-start",
    borderWidth: 0.5,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stylePillText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 2, textTransform: "uppercase" },
  lookName: { fontSize: 28, fontFamily: "PlayfairDisplay_700Bold", color: "#F5F5F0", lineHeight: 34 },
  lookDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(245,245,240,0.7)", lineHeight: 20 },
  panelToggle: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
  },
  panelTab: {
    flex: 1, paddingVertical: 16, alignItems: "center",
    borderBottomWidth: 2, borderBottomColor: "transparent",
  },
  panelTabText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  section: { padding: 24, paddingBottom: 0, borderBottomWidth: 0.5, marginBottom: 0 },
  sectionTitle: { fontSize: 20, fontFamily: "PlayfairDisplay_700Bold", letterSpacing: 0.2, marginBottom: 4 },
  sectionMeta: { fontSize: 12, fontFamily: "Inter_400Regular", letterSpacing: 0.3, marginBottom: 20 },
  piecesList: {},
  pieceRow: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingVertical: 14, borderBottomWidth: 0.5,
  },
  pieceThumb: {
    width: 52, height: 52, borderRadius: 4,
    alignItems: "center", justifyContent: "center",
  },
  pieceDot: { width: 18, height: 18, borderRadius: 9 },
  pieceInfo: { flex: 1, gap: 2 },
  pieceBrand: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.5 },
  pieceName: { fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 20 },
  pieceCategory: { fontSize: 11, fontFamily: "Inter_400Regular" },
  piecePrice: { fontSize: 15, fontFamily: "Inter_700Bold" },
  totalRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingTop: 16, paddingBottom: 24,
    borderTopWidth: 0.5, marginTop: 4,
  },
  totalLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 2 },
  totalPrice: { fontSize: 24, fontFamily: "PlayfairDisplay_700Bold" },
  shopList: {},
  shopRow: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingVertical: 14, borderBottomWidth: 0.5,
  },
  shopThumb: {
    width: 56, height: 56, borderRadius: 4,
    alignItems: "center", justifyContent: "center",
  },
  shopInfo: { flex: 1, gap: 3 },
  shopBrand: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.5 },
  shopName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  shopPrice: { fontSize: 12, fontFamily: "Inter_400Regular" },
  shopTotal: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingTop: 16, paddingBottom: 24,
    borderTopWidth: 0.5, marginTop: 4,
  },
  shopTotalLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 2 },
  shopTotalPrice: { fontSize: 22, fontFamily: "PlayfairDisplay_700Bold" },
  cta: { padding: 24, gap: 12 },
  thumbStrip: { paddingHorizontal: 24, gap: 10, paddingBottom: 24 },
  stripThumb: {
    width: 56, height: 56, borderRadius: 4,
    alignItems: "center", justifyContent: "center",
  },
  stripDot: { width: 20, height: 20, borderRadius: 10 },
  relatedSection: { borderTopWidth: 0.5, paddingTop: 24, paddingBottom: 0 },
});
