import * as Haptics from "expo-haptics";
import { safeBack } from "../lib/nav";
import { LinearGradient } from "@/lib/safeWebShims";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Linking,
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

import { BrandWordmark } from "@/components/BrandWordmark";
import { TitleRule } from "@/components/TitleRule";
import { useColors } from "@/hooks/useColors";

const CONTACT_EMAIL = "fashion@simonyarrell.com";

const PERKS = [
  {
    icon: "users" as const,
    title: "Affluent Audience",
    body: "Reach style-conscious users spending $500–$6,000+ per look, actively shopping luxury and premium fashion.",
  },
  {
    icon: "trending-up" as const,
    title: "Performance-Based",
    body: "Earn commission on every sale referred through Simon Yarrell. Transparent tracking, monthly payouts.",
  },
  {
    icon: "zap" as const,
    title: "AI-Curated Placement",
    body: "Your products appear in AI-generated looks matched to users by style, occasion, gender, and budget.",
  },
  {
    icon: "camera" as const,
    title: "Virtual Try-On",
    body: "Qualified partners get featured in the Virtual Try-On experience — the highest-visibility placement in the app.",
  },
  {
    icon: "bar-chart-2" as const,
    title: "Real-Time Analytics",
    body: "Access click-through rates, saves, and purchase conversions for every product placement.",
  },
  {
    icon: "shield" as const,
    title: "Brand Safety",
    body: "Only brands that align with our luxury and premium aesthetic are accepted. Your brand is in good company.",
  },
];

const TIERS = [
  {
    name: "SIGNATURE",
    range: "Independent & Emerging",
    color: "#8B8B8B",
    features: ["Product catalog listing", "AI-curated look placement", "Monthly performance report", "Dedicated partner email"],
  },
  {
    name: "MAISON",
    range: "Premium & Luxury",
    color: "#C6A75E",
    featured: true,
    features: ["Everything in Signature", "Virtual Try-On placement", "Featured brand section", "Co-branded content", "Priority support"],
  },
  {
    name: "COUTURE",
    range: "Ultra Luxury & Flagship",
    color: "#E8D5A3",
    features: ["Everything in Maison", "Exclusive editorial features", "Homepage takeover slots", "Campaign collaboration", "Dedicated account manager"],
  },
];

export default function PartnersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 56 : insets.top;

  const [brandName, setBrandName] = useState("");
  const [website, setWebsite] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const openEmail = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSending(true);

    const subject = encodeURIComponent(
      `Affiliate Partnership Inquiry${brandName ? ` — ${brandName}` : ""}`
    );

    const body = encodeURIComponent(
      [
        `Hi Simon Yarrell,`,
        ``,
        `I'm reaching out about an affiliate partnership opportunity.`,
        ``,
        brandName ? `Brand: ${brandName}` : null,
        website ? `Website: ${website}` : null,
        message ? `\n${message}` : null,
        ``,
        `Looking forward to discussing how we can work together.`,
        ``,
        `Best,`,
        brandName ? brandName : ``,
      ]
        .filter((line) => line !== null)
        .join("\n")
    );

    const url = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        // mailto: — not a retailer link; no affiliate handling.
        await Linking.openURL(url);
      } else {
        Alert.alert(
          "No Email App Found",
          `Please email us directly at ${CONTACT_EMAIL}`,
          [{ text: "OK" }]
        );
      }
    } catch {
      Alert.alert("Could Not Open Email", `Please email us at ${CONTACT_EMAIL}`);
    } finally {
      setSending(false);
    }
  };

  const copyEmail = async () => {
    Haptics.selectionAsync();
    Alert.alert("Contact Email", CONTACT_EMAIL, [{ text: "OK" }]);
  };

  return (
    <View style={[s.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.content, { paddingTop: topPad + 8, paddingBottom: insets.bottom + 48 }]}
      >
        {/* Top bar */}
        <View style={s.topBar}>
          <BrandWordmark />
          <Pressable onPress={() => safeBack()} hitSlop={12} style={[s.backBtn, { borderColor: colors.border }]}>
            <Feather name="x" size={15} color={colors.foreground} />
          </Pressable>
        </View>

        {/* Hero */}
        <View style={s.hero}>
          <View style={[s.heroBadge, { borderColor: colors.gold }]}>
            <Feather name="link" size={10} color={colors.gold} />
            <Text style={[s.heroBadgeText, { color: colors.gold }]}>AFFILIATE PROGRAMME</Text>
          </View>
          <Text style={[s.heroTitle, { color: colors.foreground }]}>
            Partner with{"\n"}Simon Yarrell.
          </Text>
          {/* Shared TitleRule atom (batch 119). */}
          <TitleRule width={40} />
          <Text style={[s.heroSub, { color: colors.mutedForeground }]}>
            Join our affiliate network and put your brand in front of thousands of luxury fashion enthusiasts — precisely matched by style, occasion, and budget.
          </Text>
        </View>

        {/* Divider */}
        <View style={[s.divider, { backgroundColor: colors.border }]} />

        {/* Why partner */}
        <View style={s.section}>
          <Text style={[s.sectionLabel, { color: colors.gold }]}>WHY PARTNER WITH US</Text>
          <View style={s.perksGrid}>
            {PERKS.map((perk) => (
              <View key={perk.title} style={[s.perkCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[s.perkIcon, { backgroundColor: `${colors.gold}14` }]}>
                  <Feather name={perk.icon} size={16} color={colors.gold} />
                </View>
                <Text style={[s.perkTitle, { color: colors.foreground }]}>{perk.title}</Text>
                <Text style={[s.perkBody, { color: colors.mutedForeground }]}>{perk.body}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Divider */}
        <View style={[s.divider, { backgroundColor: colors.border }]} />

        {/* Partnership Tiers */}
        <View style={s.section}>
          <Text style={[s.sectionLabel, { color: colors.gold }]}>PARTNERSHIP TIERS</Text>
          {TIERS.map((tier) => (
            <View
              key={tier.name}
              style={[
                s.tierCard,
                { backgroundColor: colors.card, borderColor: tier.featured ? colors.gold : colors.border },
                tier.featured && s.tierCardFeatured,
              ]}
            >
              {tier.featured && (
                <View style={[s.tierFeaturedBadge, { backgroundColor: colors.gold }]}>
                  <Text style={s.tierFeaturedBadgeText}>MOST POPULAR</Text>
                </View>
              )}
              <View style={s.tierHeader}>
                <View style={[s.tierDot, { backgroundColor: tier.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.tierName, { color: tier.featured ? colors.gold : colors.foreground }]}>
                    {tier.name}
                  </Text>
                  <Text style={[s.tierRange, { color: colors.mutedForeground }]}>{tier.range}</Text>
                </View>
              </View>
              {tier.features.map((feat) => (
                <View key={feat} style={s.tierFeature}>
                  <Feather name="check" size={12} color={colors.gold} />
                  <Text style={[s.tierFeatureText, { color: colors.mutedForeground }]}>{feat}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Divider */}
        <View style={[s.divider, { backgroundColor: colors.border }]} />

        {/* Contact form */}
        <View style={s.section}>
          <Text style={[s.sectionLabel, { color: colors.gold }]}>GET IN TOUCH</Text>
          <Text style={[s.formIntro, { color: colors.mutedForeground }]}>
            Fill in your details and we'll open your email client with a pre-written inquiry ready to send to{" "}
            <Text style={{ color: colors.gold }}>{CONTACT_EMAIL}</Text>
          </Text>

          <View style={s.formFields}>
            <View style={s.formField}>
              <Text style={[s.formLabel, { color: colors.mutedForeground }]}>BRAND NAME</Text>
              <TextInput
                value={brandName}
                onChangeText={setBrandName}
                placeholder="e.g. The House of Nova"
                placeholderTextColor={colors.mutedForeground}
                style={[s.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
              />
            </View>

            <View style={s.formField}>
              <Text style={[s.formLabel, { color: colors.mutedForeground }]}>WEBSITE</Text>
              <TextInput
                value={website}
                onChangeText={setWebsite}
                placeholder="https://yourbrand.com"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                keyboardType="url"
                style={[s.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
              />
            </View>

            <View style={s.formField}>
              <Text style={[s.formLabel, { color: colors.mutedForeground }]}>MESSAGE (OPTIONAL)</Text>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Tell us about your brand, catalogue size, and which tier interests you..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                style={[
                  s.input,
                  s.inputMulti,
                  { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input },
                ]}
              />
            </View>
          </View>

          {/* CTA */}
          <Pressable
            onPress={openEmail}
            disabled={sending}
            style={({ pressed }) => [s.ctaBtn, { backgroundColor: colors.gold, opacity: pressed || sending ? 0.85 : 1 }]}
          >
            <Feather name="mail" size={15} color="#0B0B0C" />
            <Text style={s.ctaBtnText}>
              {sending ? "OPENING EMAIL..." : "SEND PARTNERSHIP INQUIRY"}
            </Text>
          </Pressable>

          {/* Direct email */}
          <Pressable onPress={copyEmail} style={s.directEmail}>
            <Feather name="at-sign" size={12} color={colors.mutedForeground} />
            <Text style={[s.directEmailText, { color: colors.mutedForeground }]}>
              Or write to us directly at{" "}
              <Text style={{ color: colors.gold }}>{CONTACT_EMAIL}</Text>
            </Text>
          </Pressable>
        </View>

        {/* Bottom note */}
        <View style={[s.bottomNote, { borderColor: colors.border }]}>
          <Feather name="clock" size={13} color={colors.mutedForeground} />
          <Text style={[s.bottomNoteText, { color: colors.mutedForeground }]}>
            We review all partnership inquiries within 48 hours and respond to every qualified brand.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 22, gap: 32 },

  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  backBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 0.5, alignItems: "center", justifyContent: "center" },

  hero: { gap: 14 },
  heroBadge: { flexDirection: "row", alignItems: "center", gap: 7, borderWidth: 0.5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, alignSelf: "flex-start" },
  heroBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  heroTitle: { fontSize: 40, fontFamily: "PlayfairDisplay_700Bold", lineHeight: 48, letterSpacing: -0.5 },
  heroSub: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 24 },

  divider: { height: 0.5, marginVertical: 4 },

  section: { gap: 20 },
  sectionLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 3 },

  // Perks
  perksGrid: { gap: 12 },
  perkCard: { borderWidth: 0.5, borderRadius: 2, padding: 16, gap: 10 },
  perkIcon: { width: 36, height: 36, borderRadius: 2, alignItems: "center", justifyContent: "center", alignSelf: "flex-start" },
  perkTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", letterSpacing: 0.2 },
  perkBody: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },

  // Tiers
  tierCard: { borderWidth: 0.5, borderRadius: 2, padding: 18, gap: 14, position: "relative", overflow: "hidden" },
  tierCardFeatured: { borderWidth: 1 },
  tierFeaturedBadge: { position: "absolute", top: 0, right: 0, paddingHorizontal: 10, paddingVertical: 5, borderBottomLeftRadius: 2 },
  tierFeaturedBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1.5, color: "#0B0B0C" },
  tierHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  tierDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  tierName: { fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  tierRange: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  tierFeature: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  tierFeatureText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, flex: 1 },

  // Form
  formIntro: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  formFields: { gap: 16 },
  formField: { gap: 8 },
  formLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 2 },
  input: { borderWidth: 0.5, borderRadius: 2, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, fontFamily: "Inter_400Regular" },
  inputMulti: { minHeight: 100, textAlignVertical: "top", paddingTop: 13 },

  ctaBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderRadius: 2 },
  ctaBtnText: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 2, color: "#0B0B0C" },

  directEmail: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 4 },
  directEmailText: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },

  bottomNote: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderTopWidth: 0.5, paddingTop: 20 },
  bottomNoteText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 19, flex: 1 },
});
