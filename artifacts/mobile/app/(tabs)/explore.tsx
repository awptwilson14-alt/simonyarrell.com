import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
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

import { TrendCard } from "@/components/TrendCard";
import { TRENDS } from "@/constants/data";
import { CELEBS } from "@/constants/celebrities";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");
const CELEB_CARD_W = 130;

type Tab = "trends" | "celebrities";

export default function ExploreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("trends");
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topPad }]}>
        <View style={styles.headerContent}>
          <Text style={[styles.screenTitle, { color: colors.foreground }]}>Explore</Text>
          <View style={[styles.tabBar, { borderColor: colors.border }]}>
            {(["trends", "celebrities"] as Tab[]).map((tab) => (
              <Pressable
                key={tab}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveTab(tab);
                }}
                style={[
                  styles.tabItem,
                  { backgroundColor: activeTab === tab ? colors.gold : "transparent" },
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: activeTab === tab ? "#080808" : colors.mutedForeground },
                  ]}
                >
                  {tab === "trends" ? "TRENDS" : "CELEBRITIES"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 100 + (Platform.OS === "web" ? 34 : insets.bottom) },
        ]}
      >
        {/* ══════════════════ TRENDS TAB ══════════════════ */}
        {activeTab === "trends" && (
          <View style={styles.trendsGrid}>
            {TRENDS.map((trend, i) => (
              <View key={trend.id} style={i % 2 === 0 ? styles.trendLeft : styles.trendRight}>
                <TrendCard
                  trend={trend}
                  onPress={() => router.push("/(tabs)/style")}
                  size={i < 2 ? "large" : "small"}
                />
              </View>
            ))}
          </View>
        )}

        {/* ══════════════════ CELEBRITIES TAB ══════════════════ */}
        {activeTab === "celebrities" && (
          <View style={styles.celebSection}>
            {/* Section header */}
            <View style={styles.celebHeader}>
              <Text style={[styles.celebHeaderTitle, { color: colors.foreground }]}>
                Style Icons
              </Text>
              <Text style={[styles.celebHeaderSub, { color: colors.mutedForeground }]}>
                Tap a celebrity to explore their signature style and generate looks inspired by them
              </Text>
            </View>

            {/* "View All" CTA */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push("/celebrity");
              }}
              style={[styles.viewAllBtn, { borderColor: colors.gold }]}
            >
              <Feather name="users" size={13} color={colors.gold} />
              <Text style={[styles.viewAllText, { color: colors.gold }]}>
                BROWSE ALL {CELEBS.length} ICONS
              </Text>
              <Feather name="arrow-right" size={13} color={colors.gold} />
            </Pressable>

            {/* Horizontal scroll preview */}
            <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>
              FEATURED ICONS
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.celebRow}
            >
              {CELEBS.map((celeb) => (
                <Pressable
                  key={celeb.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push(`/celebrity/${celeb.id}`);
                  }}
                  style={({ pressed }) => [
                    styles.celebThumb,
                    { opacity: pressed ? 0.82 : 1 },
                  ]}
                >
                  {/* Photo */}
                  <View style={[styles.celebPhotoWrapper, { backgroundColor: colors.secondary }]}>
                    <Image
                      source={celeb.image}
                      style={styles.celebPhoto}
                      contentFit="cover"
                      transition={300}
                    />
                    <LinearGradient
                      colors={["transparent", "rgba(11,11,12,0.82)"]}
                      style={StyleSheet.absoluteFill}
                    />
                    {/* Name overlay */}
                    <View style={styles.celebNameOverlay}>
                      <Text style={styles.celebNameText} numberOfLines={1}>
                        {celeb.name.split(" ")[0]}
                      </Text>
                      <Text style={[styles.celebStyleText, { color: celeb.accentColor }]} numberOfLines={1}>
                        {celeb.vibes[0]}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>

            {/* All celebs list */}
            <Text style={[styles.rowLabel, { color: colors.mutedForeground, marginTop: 4 }]}>
              ALL STYLE ICONS
            </Text>
            {CELEBS.map((celeb) => (
              <Pressable
                key={celeb.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push(`/celebrity/${celeb.id}`);
                }}
                style={({ pressed }) => [
                  styles.listCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                {/* Thumbnail */}
                <View style={[styles.listThumb, { backgroundColor: colors.secondary }]}>
                  <Image
                    source={celeb.image}
                    style={styles.listThumbImg}
                    contentFit="cover"
                    transition={250}
                  />
                </View>

                {/* Info */}
                <View style={styles.listInfo}>
                  <Text style={[styles.listName, { color: colors.foreground }]}>
                    {celeb.name}
                  </Text>
                  <Text style={[styles.listStyle, { color: celeb.accentColor }]}>
                    {celeb.style}
                  </Text>
                  <View style={styles.listVibes}>
                    {celeb.vibes.slice(0, 2).map((v) => (
                      <View
                        key={v}
                        style={[styles.listVibePill, { borderColor: colors.border }]}
                      >
                        <Text style={[styles.listVibeText, { color: colors.mutedForeground }]}>
                          {v}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Arrow */}
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 0 },
  headerContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 16,
  },
  screenTitle: {
    fontSize: 28,
    fontFamily: "PlayfairDisplay_700Bold",
    letterSpacing: -0.3,
    paddingTop: 16,
  },
  tabBar: {
    flexDirection: "row",
    borderWidth: 0.5,
    borderRadius: 2,
    overflow: "hidden",
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  tabText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
  },
  content: {
    padding: 20,
    gap: 12,
  },
  trendsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  trendLeft: { width: "48%" },
  trendRight: { width: "48%" },

  /* ── Celebrities ── */
  celebSection: { gap: 16 },
  celebHeader: { gap: 6 },
  celebHeaderTitle: {
    fontSize: 24,
    fontFamily: "PlayfairDisplay_700Bold",
  },
  celebHeaderSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 0.5,
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 13,
    justifyContent: "center",
  },
  viewAllText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
    flex: 1,
    textAlign: "center",
  },
  rowLabel: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2,
    marginBottom: -4,
  },
  celebRow: {
    gap: 10,
    paddingBottom: 4,
  },
  celebThumb: {
    width: CELEB_CARD_W,
  },
  celebPhotoWrapper: {
    width: CELEB_CARD_W,
    height: 170,
    borderRadius: 4,
    overflow: "hidden",
    position: "relative",
  },
  celebPhoto: {
    width: "100%",
    height: "100%",
  },
  celebNameOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    gap: 2,
  },
  celebNameText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#F5F5F0",
    letterSpacing: 0.2,
  },
  celebStyleText: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.8,
  },
  listCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 4,
    borderWidth: 0.5,
    gap: 14,
  },
  listThumb: {
    width: 58,
    height: 58,
    borderRadius: 4,
    overflow: "hidden",
    flexShrink: 0,
  },
  listThumbImg: {
    width: "100%",
    height: "100%",
  },
  listInfo: {
    flex: 1,
    gap: 3,
  },
  listName: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
  listStyle: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1,
  },
  listVibes: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 3,
  },
  listVibePill: {
    borderWidth: 0.5,
    borderRadius: 2,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  listVibeText: {
    fontSize: 8,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.8,
  },
});
