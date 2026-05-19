import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  Dimensions,
  Image,
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
import { LOOKS } from "@/constants/data";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const { width, height } = Dimensions.get("window");

export default function LookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isLookSaved, saveLook, unsaveLook } = useApp();

  const look = LOOKS.find((l) => l.id === id);
  const related = LOOKS.filter((l) => l.id !== id && l.style === look?.style).slice(0, 3);

  if (!look) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFoundText, { color: colors.foreground }]}>Look not found</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.backLink, { color: colors.gold }]}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const saved = isLookSaved(look.id);

  const toggleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (saved) unsaveLook(look.id);
    else saveLook(look);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          <Image source={look.image} style={styles.heroImage} resizeMode="cover" />
          <LinearGradient
            colors={["rgba(8,8,8,0.5)", "transparent", "transparent", "#080808"]}
            style={StyleSheet.absoluteFill}
          />

          {/* Top Controls */}
          <View style={[styles.topControls, { paddingTop: insets.top + 12 }]}>
            <Pressable
              onPress={() => router.back()}
              style={[styles.controlBtn, { backgroundColor: "rgba(0,0,0,0.5)" }]}
              hitSlop={12}
            >
              <Feather name="arrow-left" size={20} color="#F5F5F0" />
            </Pressable>
            <View style={styles.topRight}>
              <Pressable
                onPress={toggleSave}
                style={[styles.controlBtn, { backgroundColor: saved ? "rgba(201,168,76,0.9)" : "rgba(0,0,0,0.5)" }]}
                hitSlop={12}
              >
                <Feather name="heart" size={18} color={saved ? "#080808" : "#F5F5F0"} />
              </Pressable>
            </View>
          </View>

          {/* Hero Info */}
          <View style={styles.heroInfo}>
            <View style={[styles.styleChip, { borderColor: colors.gold }]}>
              <Text style={[styles.styleChipText, { color: colors.gold }]}>{look.style}</Text>
            </View>
            <Text style={styles.heroTitle}>{look.name}</Text>
            <View style={styles.heroMeta}>
              <Text style={styles.heroOccasion}>{look.occasion} · {look.season}</Text>
              <Text style={[styles.heroPrice, { color: colors.gold }]}>
                ${look.estimatedPrice.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Description */}
        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <Text style={[styles.description, { color: colors.mutedForeground }]}>
            {look.description}
          </Text>
        </View>

        {/* Outfit Pieces */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>The Look</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>
            {look.pieces.length} pieces · Est. ${look.estimatedPrice.toLocaleString()}
          </Text>

          <View style={styles.piecesList}>
            {look.pieces.map((piece, index) => (
              <View
                key={piece.id}
                style={[
                  styles.pieceRow,
                  { borderBottomColor: colors.border },
                  index === look.pieces.length - 1 && styles.pieceRowLast,
                ]}
              >
                <View style={[styles.pieceColorDot, { backgroundColor: categoryColor(piece.category) }]} />
                <View style={styles.pieceInfo}>
                  <Text style={[styles.pieceName, { color: colors.foreground }]}>{piece.name}</Text>
                  <View style={styles.pieceMeta}>
                    <Text style={[styles.pieceBrand, { color: colors.gold }]}>{piece.brand}</Text>
                    <Text style={[styles.pieceCat, { color: colors.mutedForeground }]}>{piece.category}</Text>
                  </View>
                </View>
                <Text style={[styles.piecePrice, { color: colors.foreground }]}>
                  ${piece.price.toLocaleString()}
                </Text>
              </View>
            ))}
          </View>

          {/* Total */}
          <View style={[styles.totalRow, { borderTopColor: colors.gold }]}>
            <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>TOTAL LOOK</Text>
            <Text style={[styles.totalPrice, { color: colors.gold }]}>
              ${look.estimatedPrice.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <GoldButton label="Shop This Look" onPress={() => {}} />
          <GoldButton
            label={saved ? "Saved" : "Save Look"}
            onPress={toggleSave}
            variant="outline"
          />
        </View>

        {/* Related Looks */}
        {related.length > 0 && (
          <View style={styles.relatedSection}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 16 }]}>
              You Might Also Love
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.relatedList}>
              {related.map((l) => (
                <LookCard key={l.id} look={l} />
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function categoryColor(category: string): string {
  const map: Record<string, string> = {
    Dress: "#C9A84C",
    Top: "#888880",
    Bottom: "#6B7280",
    Outerwear: "#A07830",
    Shoes: "#9CA3AF",
    Bag: "#C9A84C",
    Jewelry: "#E4C97A",
    Accessories: "#C9A84C",
  };
  return map[category] ?? "#888880";
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {},
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  notFoundText: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  backLink: { fontSize: 14, fontFamily: "Inter_500Medium" },
  heroContainer: {
    height: height * 0.62,
    position: "relative",
    justifyContent: "flex-end",
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  topControls: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  controlBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  topRight: { flexDirection: "row", gap: 10 },
  heroInfo: {
    padding: 24,
    gap: 8,
  },
  styleChip: {
    alignSelf: "flex-start",
    borderWidth: 0.5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 4,
  },
  styleChipText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    color: "#F5F5F0",
    letterSpacing: -0.3,
    lineHeight: 36,
  },
  heroMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroOccasion: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(245,245,240,0.7)", letterSpacing: 0.5 },
  heroPrice: { fontSize: 20, fontFamily: "Inter_700Bold" },
  section: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderBottomWidth: 0.5,
  },
  description: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.3,
    marginBottom: 20,
  },
  piecesList: { gap: 0 },
  pieceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  pieceRowLast: { borderBottomWidth: 0 },
  pieceColorDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  pieceInfo: { flex: 1, gap: 3 },
  pieceName: { fontSize: 14, fontFamily: "Inter_500Medium", letterSpacing: 0.2 },
  pieceMeta: { flexDirection: "row", gap: 8, alignItems: "center" },
  pieceBrand: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  pieceCat: { fontSize: 11, fontFamily: "Inter_400Regular" },
  piecePrice: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 16, borderTopWidth: 0.5, marginTop: 4 },
  totalLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 2 },
  totalPrice: { fontSize: 22, fontFamily: "Inter_700Bold" },
  actionsSection: { paddingHorizontal: 24, paddingVertical: 24, gap: 12 },
  relatedSection: { paddingBottom: 24 },
  relatedList: { paddingHorizontal: 24 },
});
