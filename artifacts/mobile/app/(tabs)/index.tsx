import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
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

import { LookCard } from "@/components/LookCard";
import { TrendCard } from "@/components/TrendCard";
import { SectionHeader } from "@/components/SectionHeader";
import { GoldButton } from "@/components/GoldButton";
import { LOOKS, TRENDS } from "@/constants/data";
import { pickStyleHero, pickLookHero } from "@/constants/heroImages";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");
const HEADER_HEIGHT = 64;

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userProfile } = useApp();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const heroFor = (key: string, seed?: string) => pickStyleHero(key, userProfile.gender, seed);
  const lookHero = (name: string, seed?: string) => pickLookHero(name, userProfile.gender, seed);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: 100 + (Platform.OS === "web" ? 34 : insets.bottom) }]}
      >
        {/* ── Hero ── */}
        <View style={[styles.hero, { paddingTop: topPad + HEADER_HEIGHT }]}>
          <Image
            source={require("../../assets/images/splash_hero.png")}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["rgba(11,11,12,0.3)", "transparent", "rgba(11,11,12,0.75)", "#0B0B0C"]}
            locations={[0, 0.3, 0.7, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroContent}>
            <Text style={styles.heroEyebrow}>AI CURATED LOOKS · INSPIRED BY ICONS</Text>
            <Text style={styles.heroHeadline}>Discover{"\n"}Your Signature{"\n"}Style</Text>
            <Text style={[styles.heroSub, { color: "rgba(245,245,240,0.65)" }]}>
              Made for you.
            </Text>
            <View style={styles.heroActions}>
              <GoldButton
                label="GET STYLED"
                onPress={() => router.push("/(tabs)/style")}
                style={{ alignSelf: "flex-start" }}
              />
              <Pressable
                onPress={() => { router.push("/tryon"); }}
                style={styles.tryOnHeroBtn}
              >
                <Feather name="camera" size={13} color="#C6A75E" />
                <Text style={styles.tryOnHeroBtnText}>TRY ON</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* ── Trending Looks ── */}
        <View style={styles.section}>
          <SectionHeader
            title="Trending Looks"
            onSeeAll={() => router.push("/(tabs)/explore")}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hList}
          >
            {LOOKS.map((look) => (
              <LookCard
                key={look.id}
                look={{ ...look, image: lookHero(look.name, look.id) ?? heroFor(look.style, look.id) ?? look.image }}
              />
            ))}
          </ScrollView>
        </View>

        {/* ── Feature Pills ── */}
        <View style={styles.featurePills}>
          {[
            { icon: "zap" as const, label: "AI Style\nCurator", route: "/(tabs)/style" as const },
            { icon: "star" as const, label: "Celebrity\nInspired", route: "/(tabs)/explore" as const },
            { icon: "layers" as const, label: "Closet\nIntelligence", route: "/(tabs)/closet" as const },
            { icon: "shopping-bag" as const, label: "Shop\nLuxury", route: "/(tabs)/shop" as const },
          ].map((item) => (
            <Pressable
              key={item.label}
              onPress={() => router.push(item.route)}
              style={({ pressed }) => [
                styles.featurePill,
                { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name={item.icon} size={22} color={colors.gold} />
              <Text style={[styles.featurePillLabel, { color: colors.foreground }]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── Trending Styles ── */}
        <View style={styles.section}>
          <SectionHeader
            title="Trending Now"
            subtitle="What the world is wearing"
            onSeeAll={() => router.push("/(tabs)/explore")}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hList}
          >
            {TRENDS.slice(0, 4).map((trend) => (
              <TrendCard
                key={trend.id}
                trend={{ ...trend, image: heroFor(trend.name, trend.id) ?? trend.image }}
                onPress={() => router.push("/(tabs)/explore")}
              />
            ))}
          </ScrollView>
        </View>

        {/* ── For You ── */}
        <View style={styles.section}>
          <SectionHeader
            title="For You"
            subtitle={userProfile.favoriteStyles.length > 0 ? userProfile.favoriteStyles.join(", ") : "Based on your taste"}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hList}
          >
            {[...LOOKS].reverse().map((look) => (
              <LookCard
                key={look.id}
                look={{ ...look, image: lookHero(look.name, `fy-${look.id}`) ?? heroFor(look.style, `fy-${look.id}`) ?? look.image }}
              />
            ))}
          </ScrollView>
        </View>

        {/* ── Brand Strip ── */}
        <View style={[styles.brandStrip, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
          {["GUCCI", "PRADA", "AMIRI", "BALENCIAGA", "SAINT LAURENT", "OFF-WHITE"].map((brand) => (
            <Text key={brand} style={[styles.brandName, { color: colors.mutedForeground }]}>
              {brand}
            </Text>
          ))}
        </View>
      </ScrollView>

      {/* ── Floating Header ── */}
      <View style={[styles.header, { paddingTop: topPad }]} pointerEvents="box-none">
        <View style={styles.headerInner} pointerEvents="box-none">
          <View style={styles.logoRow}>
            <Image
              source={require("../../assets/images/logo_ms.png")}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </View>
          <View style={styles.headerRight}>
            <Pressable onPress={() => {}} style={styles.headerIcon}>
              <Feather name="bell" size={18} color={colors.foreground} />
            </Pressable>
            <Pressable onPress={() => router.push("/(tabs)/profile")} style={styles.headerIcon}>
              <Feather name="user" size={18} color={colors.foreground} />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {},
  hero: {
    height: 580,
    position: "relative",
    marginBottom: 32,
    justifyContent: "flex-end",
  },
  heroImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  heroContent: {
    paddingHorizontal: 24,
    paddingBottom: 36,
    gap: 10,
  },
  heroEyebrow: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(198,167,94,0.85)",
    letterSpacing: 2.5,
  },
  heroHeadline: {
    fontSize: 42,
    fontFamily: "PlayfairDisplay_700Bold",
    color: "#F5F5F0",
    lineHeight: 50,
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 14,
    fontFamily: "PlayfairDisplay_400Regular",
    letterSpacing: 0.3,
  },
  heroActions: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 12 },
  tryOnHeroBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 2, borderWidth: 0.5, borderColor: "rgba(198,167,94,0.5)", backgroundColor: "rgba(198,167,94,0.08)" },
  tryOnHeroBtnText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 2, color: "#C6A75E" },
  section: { marginBottom: 36 },
  hList: { paddingHorizontal: 20, paddingRight: 8 },
  featurePills: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 36,
  },
  featurePill: {
    flex: 1,
    alignItems: "center",
    gap: 8,
    paddingVertical: 18,
    borderRadius: 4,
    borderWidth: 0.5,
  },
  featurePillLabel: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.3,
    textAlign: "center",
    lineHeight: 14,
  },
  brandStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 20,
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    marginBottom: 8,
  },
  brandName: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerInner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    height: HEADER_HEIGHT,
  },
  logoRow: { flexDirection: "row", alignItems: "center" },
  logoImg: { height: 32, width: 59 },
  headerRight: { flexDirection: "row", gap: 16, alignItems: "center" },
  headerIcon: { padding: 4 },
});
