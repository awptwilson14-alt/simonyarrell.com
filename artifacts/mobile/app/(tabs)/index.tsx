import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useRef } from "react";
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { LookCard } from "@/components/LookCard";
import { TrendCard } from "@/components/TrendCard";
import { SectionHeader } from "@/components/SectionHeader";
import { LOOKS, TRENDS } from "@/constants/data";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");
const HEADER_HEIGHT = 70;

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userProfile } = useApp();

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const quickActions = [
    { label: "AI Stylist", icon: "zap" as const, route: "/(tabs)/style" as const },
    { label: "Celebrities", icon: "star" as const, route: "/(tabs)/explore" as const },
    { label: "Trends", icon: "trending-up" as const, route: "/(tabs)/explore" as const },
    { label: "My Closet", icon: "shopping-bag" as const, route: "/(tabs)/closet" as const },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: 100 + (Platform.OS === "web" ? 34 : insets.bottom) }]}
      >
        {/* Hero */}
        <View style={[styles.hero, { paddingTop: topPad + HEADER_HEIGHT }]}>
          <Image
            source={require("../../assets/images/hero_banner.png")}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["transparent", "rgba(8,8,8,0.5)", "#080808"]}
            style={styles.heroGradient}
          />
          <View style={styles.heroContent}>
            <Text style={styles.heroEyebrow}>TODAY'S EDIT</Text>
            <Text style={styles.heroTitle}>Côte d'Azur{"\n"}Evening</Text>
            <Pressable
              style={styles.heroBtn}
              onPress={() => router.push({ pathname: "/look/[id]", params: { id: "l1" } })}
            >
              <Text style={styles.heroBtnText}>VIEW LOOK</Text>
            </Pressable>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {quickActions.map((action) => (
            <Pressable
              key={action.label}
              onPress={() => router.push(action.route)}
              style={({ pressed }) => [
                styles.quickAction,
                { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name={action.icon} size={20} color={colors.gold} />
              <Text style={[styles.quickActionLabel, { color: colors.foreground }]}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Trending Looks */}
        <View style={styles.section}>
          <SectionHeader
            title="Trending Looks"
            subtitle="Curated for you"
            onSeeAll={() => router.push("/(tabs)/explore")}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList}>
            {LOOKS.map((look) => (
              <LookCard key={look.id} look={look} />
            ))}
          </ScrollView>
        </View>

        {/* Trending Styles */}
        <View style={styles.section}>
          <SectionHeader
            title="Trending Now"
            subtitle="What the world is wearing"
            onSeeAll={() => router.push("/(tabs)/explore")}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList}>
            {TRENDS.slice(0, 4).map((trend) => (
              <TrendCard
                key={trend.id}
                trend={trend}
                onPress={() => router.push("/(tabs)/explore")}
              />
            ))}
          </ScrollView>
        </View>

        {/* For You */}
        <View style={styles.section}>
          <SectionHeader title="For You" subtitle={`Based on ${userProfile.favoriteStyles.length > 0 ? userProfile.favoriteStyles[0] : "your taste"}`} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList}>
            {[...LOOKS].reverse().map((look) => (
              <LookCard key={look.id} look={look} />
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Floating Header */}
      <View
        style={[
          styles.header,
          { paddingTop: topPad, backgroundColor: "transparent" },
        ]}
        pointerEvents="box-none"
      >
        <View style={[styles.headerInner]} pointerEvents="box-none">
          <Text style={[styles.logo, { color: colors.gold }]}>MAISON SIMON</Text>
          <Pressable onPress={() => router.push("/(tabs)/profile")}>
            <View style={[styles.avatar, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="user" size={16} color={colors.gold} />
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: 0 },
  hero: {
    height: 520,
    position: "relative",
    marginBottom: 24,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    position: "absolute",
    bottom: 32,
    left: 24,
    right: 24,
    gap: 12,
  },
  heroEyebrow: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(201,168,76,0.9)",
    letterSpacing: 3,
  },
  heroTitle: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: "#F5F5F0",
    letterSpacing: -0.5,
    lineHeight: 42,
  },
  heroBtn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.8)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 4,
  },
  heroBtnText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#C9A84C",
    letterSpacing: 2,
  },
  quickActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 36,
  },
  quickAction: {
    flex: 1,
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 2,
    borderWidth: 0.5,
  },
  quickActionLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  section: {
    marginBottom: 36,
    gap: 0,
  },
  hList: {
    paddingHorizontal: 20,
    paddingRight: 8,
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
  logo: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    letterSpacing: 4,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
  },
});
