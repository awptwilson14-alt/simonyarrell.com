import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { CELEBS } from "@/constants/celebrities";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const { width, height } = Dimensions.get("window");

export default function CelebrityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isCelebritySaved, toggleCelebrity } = useApp();
  const [activeTab, setActiveTab] = useState<"story" | "looks" | "brands">("story");

  const celeb = CELEBS.find((c) => c.id === id);
  if (!celeb) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>
          Icon not found
        </Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: colors.gold, fontFamily: "Inter_500Medium" }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const saved = isCelebritySaved(celeb.id);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>

        {/* ── Hero ── */}
        <View style={styles.hero}>
          <Image
            source={celeb.image}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={400}
          />
          <LinearGradient
            colors={["rgba(11,11,12,0.55)", "transparent", "transparent", "#0B0B0C"]}
            locations={[0, 0.3, 0.6, 1]}
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
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                toggleCelebrity(celeb.id);
              }}
              style={[
                styles.circleBtn,
                { backgroundColor: saved ? celeb.accentColor : "rgba(11,11,12,0.6)" },
              ]}
              hitSlop={12}
            >
              <Feather name="heart" size={16} color={saved ? "#0B0B0C" : "#F5F5F0"} />
            </Pressable>
          </View>

          {/* Hero info */}
          <View style={styles.heroInfo}>
            <View style={[styles.eraBadge, { borderColor: celeb.accentColor }]}>
              <Text style={[styles.eraText, { color: celeb.accentColor }]}>
                {celeb.era}
              </Text>
            </View>
            <Text style={styles.heroName}>{celeb.name}</Text>
            <Text style={[styles.heroTitle, { color: celeb.accentColor }]}>
              {celeb.title}
            </Text>
          </View>
        </View>

        {/* ── Style pill ── */}
        <View style={[styles.stylePillRow, { borderBottomColor: colors.border }]}>
          <View style={[styles.styleTag, { backgroundColor: celeb.accentColor + "22", borderColor: celeb.accentColor }]}>
            <Feather name="star" size={10} color={celeb.accentColor} />
            <Text style={[styles.styleTagText, { color: celeb.accentColor }]}>
              {celeb.style.toUpperCase()}
            </Text>
          </View>
          {celeb.vibes.slice(0, 2).map((v) => (
            <View key={v} style={[styles.vibeTag, { borderColor: colors.border }]}>
              <Text style={[styles.vibeTagText, { color: colors.mutedForeground }]}>
                {v.toUpperCase()}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Tabs ── */}
        <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
          {(["story", "looks", "brands"] as const).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tab,
                activeTab === tab && { borderBottomColor: celeb.accentColor, borderBottomWidth: 2 },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === tab ? celeb.accentColor : colors.mutedForeground },
                ]}
              >
                {tab === "story" ? "STORY" : tab === "looks" ? "LOOKS" : "BRANDS"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── Story tab ── */}
        {activeTab === "story" && (
          <View style={styles.section}>
            <Text style={[styles.description, { color: colors.mutedForeground }]}>
              {celeb.description}
            </Text>

            <Text style={[styles.sectionLabel, { color: celeb.accentColor }]}>
              KNOWN FOR
            </Text>
            <View style={[styles.knownBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.knownText, { color: colors.foreground }]}>
                {celeb.knownFor}
              </Text>
            </View>

            <Text style={[styles.sectionLabel, { color: celeb.accentColor }]}>
              SIGNATURE PIECES
            </Text>
            {celeb.keyPieces.map((piece, idx) => (
              <View
                key={idx}
                style={[styles.pieceRow, { borderBottomColor: colors.border }]}
              >
                <View style={[styles.pieceDot, { backgroundColor: celeb.accentColor }]} />
                <Text style={[styles.pieceText, { color: colors.foreground }]}>{piece}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Looks tab ── */}
        {activeTab === "looks" && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Signature Looks
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>
              Recreate these iconic outfits
            </Text>
            {celeb.looks.map((look, i) => (
              <View
                key={i}
                style={[
                  styles.lookCard,
                  { backgroundColor: colors.card, borderColor: i === 0 ? celeb.accentColor : colors.border },
                ]}
              >
                <View style={styles.lookHeader}>
                  <Text style={[styles.lookName, { color: colors.foreground }]}>
                    {look.name}
                  </Text>
                  {i === 0 && (
                    <View style={[styles.iconicBadge, { backgroundColor: celeb.accentColor }]}>
                      <Text style={styles.iconicText}>ICONIC</Text>
                    </View>
                  )}
                </View>
                {look.pieces.map((piece, j) => (
                  <View
                    key={j}
                    style={[styles.lookPieceRow, { borderTopColor: colors.border }]}
                  >
                    <Text style={[styles.lookPieceBrand, { color: celeb.accentColor }]}>
                      {piece.brand.toUpperCase()}
                    </Text>
                    <Text style={[styles.lookPieceName, { color: colors.foreground }]}>
                      {piece.item}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* ── Brands tab ── */}
        {activeTab === "brands" && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Brands They Wear
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>
              Shop directly from their wardrobe
            </Text>
            <View style={styles.brandsGrid}>
              {celeb.signatureBrands.map((brand, idx) => (
                <View
                  key={brand}
                  style={[
                    styles.brandChip,
                    {
                      backgroundColor: idx === 0 ? celeb.accentColor + "22" : colors.card,
                      borderColor: idx === 0 ? celeb.accentColor : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.brandChipText,
                      { color: idx === 0 ? celeb.accentColor : colors.foreground },
                    ]}
                  >
                    {brand}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── CTA ── */}
        <View style={[styles.ctaSection, { borderTopColor: colors.border }]}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              router.push({
                pathname: "/(tabs)/style",
                params: { celebrity: celeb.id, celebName: celeb.name },
              });
            }}
            style={[styles.ctaBtn, { backgroundColor: celeb.accentColor }]}
          >
            <Feather name="zap" size={15} color="#0B0B0C" />
            <Text style={styles.ctaBtnText}>
              GENERATE MY {celeb.name.split(" ")[0].toUpperCase()} LOOK
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/celebrity")}
            style={[styles.ctaSecondary, { borderColor: colors.border }]}
          >
            <Feather name="users" size={13} color={colors.mutedForeground} />
            <Text style={[styles.ctaSecondaryText, { color: colors.mutedForeground }]}>
              CHOOSE ANOTHER ICON
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  hero: {
    height: height * 0.54,
    position: "relative",
    justifyContent: "flex-end",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  heroInfo: {
    padding: 24,
    gap: 8,
  },
  eraBadge: {
    alignSelf: "flex-start",
    borderWidth: 0.5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 2,
  },
  eraText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  heroName: {
    fontSize: 34,
    fontFamily: "PlayfairDisplay_700Bold",
    color: "#F5F5F0",
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  heroTitle: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.5,
    fontStyle: "italic",
  },
  stylePillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  styleTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 0.5,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  styleTagText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  vibeTag: {
    borderWidth: 0.5,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  vibeTagText: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
  },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  section: {
    padding: 24,
    gap: 16,
  },
  description: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 23,
    letterSpacing: 0.2,
  },
  sectionLabel: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    marginBottom: -8,
  },
  knownBox: {
    borderWidth: 0.5,
    borderRadius: 4,
    padding: 14,
  },
  knownText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    lineHeight: 20,
    fontStyle: "italic",
  },
  pieceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 0.5,
  },
  pieceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  pieceText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: "PlayfairDisplay_700Bold",
    marginBottom: -4,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 4,
  },
  lookCard: {
    borderWidth: 0.5,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 4,
  },
  lookHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    paddingBottom: 10,
  },
  lookName: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
  iconicBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 2,
  },
  iconicText: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
    color: "#0B0B0C",
  },
  lookPieceRow: {
    borderTopWidth: 0.5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 2,
  },
  lookPieceBrand: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  lookPieceName: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  brandsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  brandChip: {
    borderWidth: 0.5,
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  brandChipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
  ctaSection: {
    padding: 24,
    gap: 12,
    borderTopWidth: 0.5,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 4,
  },
  ctaBtnText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
    color: "#0B0B0C",
  },
  ctaSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 4,
    borderWidth: 0.5,
  },
  ctaSecondaryText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
  },
});
