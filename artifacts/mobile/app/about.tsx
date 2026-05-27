import { LinearGradient } from "expo-linear-gradient";
import { safeBack } from "../lib/nav";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { BrandWordmark } from "@/components/BrandWordmark";
import { TitleRule } from "@/components/TitleRule";
import { useColors } from "@/hooks/useColors";
import { openExternalUrl } from "@/lib/openExternal";

const WEBSITE_URL = "https://Simonyarrell.com";
const WEBSITE_LABEL = "Simonyarrell.com";
const CONTACT_EMAIL = "fashion@simonyarrell.com";

/**
 * About / Brand screen — introduced May 2026 with the Simon Yarrell
 * rebrand. Mirrors the editorial layout of the privacy / membership
 * / partners screens (BrandWordmark header → stacked-monogram hero →
 * TitleRule flourish → tagline → contact cards). All copy and links
 * come directly from the brand sheet supplied by the user.
 */
export default function AboutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 56 : insets.top;

  const openLink = (url: string) => {
    // openExternalUrl handles web popup-blocker fallback (sync window.open →
    // location.assign) and routes to Linking.openURL on native. The previous
    // `canOpenURL` gate was always-true for http(s) on web and provided no
    // real value, so dropping it removes the async-microtask delay that was
    // also at risk of tripping web popup blockers.
    try {
      openExternalUrl(url);
    } catch {
      Alert.alert("Unable to open", url);
    }
  };

  return (
    <View style={[s.screen, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["rgba(198,167,94,0.08)", "transparent", "rgba(198,167,94,0.04)"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Header */}
      <View style={[s.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => safeBack()} hitSlop={12} style={[s.backBtn, { borderColor: colors.border }]}>
          <Feather name="arrow-left" size={16} color={colors.foreground} />
        </Pressable>
        <BrandWordmark />
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 48 }]}
      >
        {/* Brand hero — composed lockup: gold SY monogram (transparent
            PNG, floats on the surface) + white SIMON YARRELL caps +
            two-line gold tagline. Mirrors the user's brand mockup. No
            decorative flourish, no card background. */}
        <View style={s.brandSheet}>
          <BrandWordmark variant="stacked" height={110} />
        </View>

        {/* Fashion house headline (matches the brand landing page). */}
        <View style={s.headlineBlock}>
          <Text style={[s.eyebrow, { color: colors.gold }]}>THE FASHION HOUSE</Text>
          <Text style={[s.headline, { color: colors.foreground }]}>
            Simon Yarrell&apos;s{"\n"}Fashion house.
          </Text>
          <TitleRule width={44} style={{ marginTop: 4 }} />
          <Text style={[s.headlineSub, { color: colors.mutedForeground }]}>
            Your personal AI stylist. Curated looks, premium brands, endless inspiration.
          </Text>
        </View>

        {/* Contact cards — Website + Email. */}
        <View style={s.contactGrid}>
          <Pressable
            onPress={() => openLink(WEBSITE_URL)}
            style={({ pressed }) => [
              s.contactCard,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={[s.contactIconBox, { borderColor: `${colors.gold}55`, backgroundColor: `${colors.gold}14` }]}>
              <Feather name="globe" size={15} color={colors.gold} />
            </View>
            <Text style={[s.contactLabel, { color: colors.gold }]}>WEBSITE</Text>
            <Text style={[s.contactValue, { color: colors.foreground }]} numberOfLines={1}>
              {WEBSITE_LABEL}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => openLink(`mailto:${CONTACT_EMAIL}`)}
            style={({ pressed }) => [
              s.contactCard,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={[s.contactIconBox, { borderColor: `${colors.gold}55`, backgroundColor: `${colors.gold}14` }]}>
              <Feather name="mail" size={15} color={colors.gold} />
            </View>
            <Text style={[s.contactLabel, { color: colors.gold }]}>EMAIL</Text>
            <Text style={[s.contactValue, { color: colors.foreground }]} numberOfLines={1}>
              {CONTACT_EMAIL}
            </Text>
          </Pressable>
        </View>

        {/* Footer */}
        <View style={[s.footer, { borderTopColor: colors.border }]}>
          <Text style={[s.footerText, { color: colors.mutedForeground }]}>
            © 2026 Simon Yarrell Fashion, Inc.{"\n"}All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 0.5,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
  },

  content: {
    paddingHorizontal: 22,
    paddingTop: 28,
  },

  brandSheet: {
    alignItems: "center",
    paddingVertical: 18,
    marginBottom: 18,
  },
  tagline: {
    marginTop: 18,
    fontFamily: "PlayfairDisplay_400Regular",
    fontStyle: "italic",
    fontSize: 14,
    letterSpacing: 0.3,
    textAlign: "center",
  },

  headlineBlock: {
    marginBottom: 28,
  },
  eyebrow: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 3.2,
    marginBottom: 12,
  },
  headline: {
    fontSize: 32,
    fontFamily: "PlayfairDisplay_700Bold",
    lineHeight: 38,
    letterSpacing: -0.3,
  },
  headlineSub: {
    marginTop: 14,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
  },

  contactGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 32,
  },
  contactCard: {
    flex: 1,
    borderWidth: 0.5,
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: "flex-start",
  },
  contactIconBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  contactLabel: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2.4,
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.2,
  },

  footer: {
    paddingTop: 18,
    borderTopWidth: 0.5,
    alignItems: "center",
  },
  footerText: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    letterSpacing: 1.2,
    lineHeight: 16,
    textAlign: "center",
  },
});
