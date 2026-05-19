import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { useSubscription } from "@/lib/revenuecat";
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

import { LookCard } from "@/components/LookCard";
import { ProductCard } from "@/components/ProductCard";
import { GoldButton } from "@/components/GoldButton";
import { MultiFilterChips } from "@/components/FilterChips";
import { STYLE_CATEGORIES, BUDGETS, GENDERS } from "@/constants/data";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { BrandWordmark } from "@/components/BrandWordmark";

type Section = "looks" | "products";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { savedLooks, savedProducts, closetItems, userProfile, updateProfile } = useApp();
  const { isSubscribed } = useSubscription();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [activeSection, setActiveSection] = useState<Section>("looks");
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(userProfile.name);
  const [editGender, setEditGender] = useState(userProfile.gender);
  const [editSize, setEditSize] = useState(userProfile.size ?? "M");
  const [editBudget, setEditBudget] = useState(userProfile.budget);
  const [editStyles, setEditStyles] = useState<string[]>(userProfile.favoriteStyles);
  const SIZES = ["S", "M", "L", "XL", "XXX", "XXXX"];

  const toggleStyle = (s: string) => {
    setEditStyles((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const saveEdits = () => {
    updateProfile({ name: editName, gender: editGender, size: editSize, budget: editBudget, favoriteStyles: editStyles });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEditing(false);
  };

  const initials = userProfile.name
    ? userProfile.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "MS";

  const stats = [
    { label: "LOOKS SAVED", value: savedLooks.length },
    { label: "ITEMS SAVED", value: savedProducts.length },
    { label: "IN CLOSET", value: closetItems.length },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 16, paddingBottom: 100 + (Platform.OS === "web" ? 34 : insets.bottom) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <BrandWordmark style={{ marginBottom: 20 }} />
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={[styles.avatar, { backgroundColor: colors.card, borderColor: colors.gold }]}>
            <Text style={[styles.avatarText, { color: colors.gold }]}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.name, { color: colors.foreground }]}>
              {userProfile.name || "Your Profile"}
            </Text>
            <Text style={[styles.styleTag, { color: colors.gold }]}>
              {userProfile.gender} · Size {userProfile.size ?? "M"} · {userProfile.budget}
            </Text>
            {userProfile.favoriteStyles.length > 0 && (
              <Text style={[styles.styleList, { color: colors.mutedForeground }]} numberOfLines={2}>
                {userProfile.favoriteStyles.join(", ")}
              </Text>
            )}
          </View>
          <Pressable
            onPress={() => setEditing(!editing)}
            style={[styles.editBtn, { borderColor: colors.border }]}
            hitSlop={8}
          >
            <Feather name={editing ? "x" : "edit-2"} size={14} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {/* Stats Row */}
        <View style={[styles.statsRow, { borderColor: colors.border }]}>
          {stats.map((stat, i) => (
            <View key={stat.label} style={[styles.statItem, i < stats.length - 1 && { borderRightWidth: 0.5, borderColor: colors.border }]}>
              <Text style={[styles.statValue, { color: colors.gold }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Membership Banner */}
        {isSubscribed ? (
          <Pressable
            onPress={() => router.push("/membership")}
            style={[styles.memberBanner, { backgroundColor: `${colors.gold}12`, borderColor: `${colors.gold}40` }]}
          >
            <Feather name="check-circle" size={16} color={colors.gold} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.memberBannerTitle, { color: colors.gold }]}>Member Active</Text>
              <Text style={[styles.memberBannerSub, { color: colors.mutedForeground }]}>Full access unlocked</Text>
            </View>
            <Feather name="chevron-right" size={14} color={colors.gold} />
          </Pressable>
        ) : (
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/membership"); }}
            style={[styles.memberBanner, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.memberIconBox, { backgroundColor: `${colors.gold}15` }]}>
              <Feather name="star" size={15} color={colors.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.memberBannerTitle, { color: colors.foreground }]}>Maison Simon Membership</Text>
              <Text style={[styles.memberBannerSub, { color: colors.mutedForeground }]}>From $2.99/mo · Unlock everything</Text>
            </View>
            <View style={[styles.memberCta, { backgroundColor: colors.gold }]}>
              <Text style={styles.memberCtaText}>JOIN</Text>
            </View>
          </Pressable>
        )}

        {/* Edit Form */}
        {editing && (
          <View style={[styles.editForm, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.editTitle, { color: colors.gold }]}>EDIT PROFILE</Text>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>NAME</Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder="Your name"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.textInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>STYLE PROFILE</Text>
            <View style={styles.genderRow}>
              {GENDERS.map((g) => (
                <Pressable
                  key={g}
                  onPress={() => { Haptics.selectionAsync(); setEditGender(g); }}
                  style={[styles.genderBtn, { borderColor: editGender === g ? colors.gold : colors.border, backgroundColor: editGender === g ? "rgba(201,168,76,0.1)" : "transparent" }]}
                >
                  <Text style={[styles.genderText, { color: editGender === g ? colors.gold : colors.mutedForeground }]}>{g}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>SIZE</Text>
            <View style={styles.sizeGrid}>
              {SIZES.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => { Haptics.selectionAsync(); setEditSize(s); }}
                  style={[styles.sizeBtn, { borderColor: editSize === s ? colors.gold : colors.border, backgroundColor: editSize === s ? "rgba(201,168,76,0.1)" : "transparent" }]}
                >
                  <Text style={[styles.sizeBtnText, { color: editSize === s ? colors.gold : colors.mutedForeground }]}>{s}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>FAVOURITE STYLES</Text>
            <MultiFilterChips options={STYLE_CATEGORIES} selected={editStyles} onToggle={toggleStyle} />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>BUDGET</Text>
            {BUDGETS.map((b) => (
              <Pressable
                key={b}
                onPress={() => { Haptics.selectionAsync(); setEditBudget(b); }}
                style={[styles.budgetRow, { borderColor: editBudget === b ? colors.gold : colors.border, backgroundColor: editBudget === b ? "rgba(201,168,76,0.06)" : "transparent" }]}
              >
                <View style={[styles.radio, { borderColor: editBudget === b ? colors.gold : colors.border }]}>
                  {editBudget === b && <View style={[styles.radioFill, { backgroundColor: colors.gold }]} />}
                </View>
                <Text style={[styles.budgetText, { color: colors.foreground }]}>{b}</Text>
              </Pressable>
            ))}

            <GoldButton label="Save Changes" onPress={saveEdits} />
          </View>
        )}

        {/* Saved Content Tabs */}
        <View style={[styles.sectionTabs, { borderColor: colors.border }]}>
          {(["looks", "products"] as Section[]).map((s) => (
            <Pressable
              key={s}
              onPress={() => setActiveSection(s)}
              style={[styles.sectionTab, { backgroundColor: activeSection === s ? colors.gold : "transparent" }]}
            >
              <Text style={[styles.sectionTabText, { color: activeSection === s ? "#080808" : colors.mutedForeground }]}>
                {s === "looks" ? "SAVED LOOKS" : "SAVED ITEMS"}
              </Text>
            </Pressable>
          ))}
        </View>

        {activeSection === "looks" && (
          savedLooks.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.savedList}>
              {savedLooks.map((look) => (
                <LookCard key={look.id} look={look} />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptySection}>
              <Feather name="heart" size={32} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No saved looks yet
              </Text>
              <GoldButton label="Discover Looks" onPress={() => router.push("/(tabs)")} variant="outline" small />
            </View>
          )
        )}

        {activeSection === "products" && (
          savedProducts.length > 0 ? (
            <View style={styles.productsGrid}>
              {savedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </View>
          ) : (
            <View style={styles.emptySection}>
              <Feather name="shopping-bag" size={32} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No saved items yet
              </Text>
              <GoldButton label="Browse Shop" onPress={() => router.push("/(tabs)/shop")} variant="outline" small />
            </View>
          )
        )}
        {/* Privacy footer */}
        <Pressable
          onPress={() => router.push("/privacy")}
          style={styles.privacyLink}
        >
          <Feather name="lock" size={12} color={colors.mutedForeground} />
          <Text style={[styles.privacyLinkText, { color: colors.mutedForeground }]}>Privacy Policy</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 24 },
  profileHeader: { flexDirection: "row", alignItems: "flex-start", gap: 16 },
  avatar: { width: 68, height: 68, borderRadius: 34, borderWidth: 1.5, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarText: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  profileInfo: { flex: 1, gap: 4, paddingTop: 4 },
  name: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  styleTag: { fontSize: 12, fontFamily: "Inter_500Medium", letterSpacing: 1 },
  styleList: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  editBtn: { borderWidth: 0.5, borderRadius: 20, padding: 8 },
  statsRow: { flexDirection: "row", borderWidth: 0.5, borderRadius: 2 },
  statItem: { flex: 1, alignItems: "center", paddingVertical: 18, gap: 4 },
  statValue: { fontSize: 24, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 1.5 },
  editForm: { borderWidth: 0.5, borderRadius: 2, padding: 18, gap: 14 },
  editTitle: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  fieldLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 2 },
  textInput: { borderWidth: 0.5, borderRadius: 2, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: "Inter_400Regular" },
  genderRow: { flexDirection: "row", gap: 10 },
  genderBtn: { flex: 1, borderWidth: 0.5, borderRadius: 2, paddingVertical: 12, alignItems: "center" },
  genderText: { fontSize: 12, fontFamily: "Inter_500Medium", letterSpacing: 0.5 },
  sizeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  sizeBtn: { width: "30%", borderWidth: 0.5, borderRadius: 2, paddingVertical: 14, alignItems: "center" },
  sizeBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  budgetRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderWidth: 0.5, borderRadius: 2 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  radioFill: { width: 9, height: 9, borderRadius: 4.5 },
  budgetText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  sectionTabs: { flexDirection: "row", borderWidth: 0.5, borderRadius: 2, overflow: "hidden" },
  sectionTab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  sectionTabText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.5 },
  savedList: { paddingRight: 8 },
  productsGrid: { gap: 12 },
  emptySection: { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  privacyLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 20,
  },
  privacyLinkText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.3,
  },
  memberBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 0.5,
    borderRadius: 2,
    padding: 14,
  },
  memberIconBox: {
    width: 34,
    height: 34,
    borderRadius: 2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  memberBannerTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
  memberBannerSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  memberCta: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 2,
  },
  memberCtaText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
    color: "#0B0B0C",
  },
});
