import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import {
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

type PolicySection = {
  title: string;
  icon: string;
  body: string;
};

const SECTIONS: PolicySection[] = [
  {
    title: "Information We Collect",
    icon: "database",
    body: "Maison Simon collects only what is necessary to personalise your experience. This includes your style preferences, saved looks, and closet items — all stored locally on your device by default. If you choose to create an account in a future update, only your profile name and preferences will be stored.\n\nWe do not collect names, email addresses, phone numbers, or any payment information.",
  },
  {
    title: "Camera & Live Try-On",
    icon: "camera",
    body: "The Virtual Try-On feature accesses your camera to display outfits overlaid on your live camera feed. Your camera feed is processed entirely on-device in real time.\n\nWe do not record, capture, transmit, or store your camera feed or any images from the Try-On session. Nothing leaves your device.",
  },
  {
    title: "How We Use Your Data",
    icon: "sliders",
    body: "Your style preferences and saved items are used solely to personalise recommendations within the app. We do not sell, rent, or share your personal data with third parties for marketing purposes.\n\nAggregate, anonymised analytics may be used to improve app performance and style recommendations.",
  },
  {
    title: "Third-Party Services",
    icon: "link",
    body: "Outfit images and product references may link to third-party retailers (e.g. Gucci, Loro Piana, The Row). When you follow a purchase link, you leave Maison Simon and are subject to that retailer's own privacy policy.\n\nWe are not responsible for the privacy practices of third-party websites or services.",
  },
  {
    title: "Data Retention & Deletion",
    icon: "trash-2",
    body: "All preference data is stored locally on your device. You can delete all app data at any time by uninstalling the application. There is no server-side copy of your personal data.\n\nIn future versions that offer cloud sync or accounts, you will always have the right to request full deletion of your data.",
  },
  {
    title: "Children's Privacy",
    icon: "shield",
    body: "Maison Simon is intended for users aged 13 and above. We do not knowingly collect personal information from children under 13. If you believe a child has provided personal information through our app, please contact us immediately.",
  },
  {
    title: "Changes to This Policy",
    icon: "edit-3",
    body: "We may update this Privacy Policy from time to time. When we do, we will revise the effective date below and notify you within the app. Continued use of Maison Simon after any changes constitutes your acceptance of the updated policy.",
  },
  {
    title: "Contact Us",
    icon: "mail",
    body: "If you have any questions or concerns about this Privacy Policy or how your data is handled, please reach out:\n\nprivacy@maisonsimonfashion.app\n\nMaison Simon Fashion, Inc.\nNew York, NY",
  },
];

export default function PrivacyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 56 : insets.top;

  return (
    <View style={[s.screen, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["rgba(198,167,94,0.06)", "transparent", "rgba(198,167,94,0.03)"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Header */}
      <View style={[s.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={[s.backBtn, { borderColor: colors.border }]}>
          <Feather name="arrow-left" size={16} color={colors.foreground} />
        </Pressable>
        <BrandWordmark />
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* Hero */}
        <View style={s.hero}>
          <Text style={[s.eyebrow, { color: colors.gold }]}>LEGAL</Text>
          <Text style={[s.title, { color: colors.foreground }]}>Privacy{"\n"}Policy</Text>
          {/* Shared TitleRule atom (batch 120) — same flourish as the
              membership and partners heroes. 40px matches the 44px Playfair. */}
          <TitleRule width={40} style={{ marginTop: 2 }} />
          <Text style={[s.effectiveDate, { color: colors.mutedForeground }]}>
            Effective date: May 19, 2026
          </Text>
        </View>

        {/* Intro */}
        <View style={[s.intro, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="lock" size={18} color={colors.gold} style={{ marginBottom: 2 }} />
          <Text style={[s.introText, { color: colors.mutedForeground }]}>
            Your privacy is fundamental to Maison Simon. This policy explains what information we collect, how we use it, and the choices available to you. We keep this simple — luxury should never come at the cost of your privacy.
          </Text>
        </View>

        {/* Sections */}
        {SECTIONS.map((section, i) => (
          <View key={i} style={[s.section, { borderColor: colors.border }]}>
            <View style={s.sectionHeader}>
              <View style={[s.sectionIconBox, { backgroundColor: `${colors.gold}18`, borderColor: `${colors.gold}40` }]}>
                <Feather name={section.icon as any} size={14} color={colors.gold} />
              </View>
              <Text style={[s.sectionTitle, { color: colors.foreground }]}>{section.title}</Text>
            </View>
            <Text style={[s.sectionBody, { color: colors.mutedForeground }]}>{section.body}</Text>
          </View>
        ))}

        {/* Footer */}
        <View style={[s.footer, { borderTopColor: colors.border }]}>
          <Text style={[s.footerText, { color: colors.mutedForeground }]}>
            © 2026 Maison Simon Fashion, Inc.{"\n"}All rights reserved.
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
    paddingHorizontal: 24,
    gap: 20,
    paddingTop: 32,
  },

  hero: { gap: 10, marginBottom: 4 },
  eyebrow: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 3,
  },
  title: {
    fontSize: 44,
    fontFamily: "PlayfairDisplay_700Bold",
    letterSpacing: -0.5,
    lineHeight: 50,
  },
  effectiveDate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.3,
    marginTop: 4,
  },

  intro: {
    borderWidth: 0.5,
    borderRadius: 2,
    padding: 18,
    gap: 10,
  },
  introText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    letterSpacing: 0.15,
  },

  section: {
    borderWidth: 0.5,
    borderRadius: 2,
    padding: 18,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sectionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 2,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
    flex: 1,
  },
  sectionBody: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
    letterSpacing: 0.15,
  },

  footer: {
    borderTopWidth: 0.5,
    paddingTop: 20,
    alignItems: "center",
  },
  footerText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
    letterSpacing: 0.3,
  },
});
