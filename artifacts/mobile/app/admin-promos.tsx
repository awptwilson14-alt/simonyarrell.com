/**
 * Promo Codes (Admin) — owner-only screen to CREATE and MODIFY promo codes
 * that work for every customer (server-backed via /api/promo/codes).
 *
 * Gated by a private admin key: the owner sets an `ADMIN_PROMO_KEY` secret on
 * the server and types it here once (stored on this device only). The 4
 * built-in launch codes are shown read-only for reference; custom codes have
 * full create / edit / activate / delete.
 */
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GoldButton } from "@/components/GoldButton";
import { useEntitlements } from "@/context/EntitlementsContext";
import { OrnamentRule } from "@/components/OrnamentRule";
import { useColors } from "@/hooks/useColors";
import { safeBack } from "@/lib/nav";
import { PROMO_CODES } from "@/lib/promoCodes";
import {
  PromoAdminError,
  clearAdminKey,
  createPromoCode,
  deletePromoCode,
  listPromoCodes,
  loadAdminKey,
  saveAdminKey,
  updatePromoCode,
  type PromoInput,
  type PromoKind,
  type PromoRecord,
} from "@/lib/promoAdmin";
import { TIER_DEFINITIONS, type TierId } from "@/lib/tiers";

const GRANTABLE_TIERS: TierId[] = ["premium", "pro", "vip", "diamond"];
const TEST_TIERS: TierId[] = ["basic", "premium", "pro", "vip", "diamond"];

function effectSummary(
  kind: PromoKind,
  percent: number | undefined,
  tier: TierId | undefined,
): string {
  if (kind === "percent_off") return `${percent ?? 0}% off membership`;
  return `Grants ${tier ? TIER_DEFINITIONS[tier].name : "—"} tier`;
}

export default function AdminPromosScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 16 : insets.top;

  const [adminKey, setAdminKey] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  const [codes, setCodes] = useState<PromoRecord[]>([]);
  const [listError, setListError] = useState<string | null>(null);

  // Create / edit form.
  const [editingId, setEditingId] = useState<number | null>(null);
  const [fCode, setFCode] = useState("");
  const [fKind, setFKind] = useState<PromoKind>("percent_off");
  const [fPercent, setFPercent] = useState("20");
  const [fTier, setFTier] = useState<TierId>("diamond");
  const [fLabel, setFLabel] = useState("");
  const [fActive, setFActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formMsg, setFormMsg] = useState<string | null>(null);

  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  // Tier test mode — switch this device onto any tier for admin test runs.
  const { tier, applyTierOverride, promoCode, clearPromo } = useEntitlements();
  const testModeActive = promoCode?.startsWith("ADMINTEST-") ?? false;
  const [switchingTier, setSwitchingTier] = useState<TierId | null>(null);
  const onTestTier = async (t: TierId) => {
    if (switchingTier) return;
    Haptics.selectionAsync();
    setSwitchingTier(t);
    try {
      await applyTierOverride(t);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setSwitchingTier(null);
    }
  };

  const refresh = async (key: string) => {
    const rows = await listPromoCodes(key);
    setCodes(rows);
    setListError(null);
  };

  // Try the saved key on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await loadAdminKey();
      if (cancelled) return;
      if (!saved) return;
      setAdminKey(saved);
      try {
        await refresh(saved);
        if (!cancelled) setAuthed(true);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof PromoAdminError && err.status === 401) {
          await clearAdminKey();
          setAdminKey(null);
          setAuthError("Saved key was rejected. Enter it again.");
        } else if (err instanceof PromoAdminError && err.status === 503) {
          setAuthError(
            "Promo admin is not configured yet. Set the ADMIN_PROMO_KEY secret on the server first.",
          );
        } else {
          setAuthError("Couldn't reach the server. Try again.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onUnlock = async () => {
    const key = keyInput.trim();
    if (!key || unlocking) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setUnlocking(true);
    setAuthError(null);
    try {
      await refresh(key);
      await saveAdminKey(key);
      setAdminKey(key);
      setAuthed(true);
      setKeyInput("");
    } catch (err) {
      if (err instanceof PromoAdminError && err.status === 401) {
        setAuthError("That key is incorrect.");
      } else if (err instanceof PromoAdminError && err.status === 503) {
        setAuthError(
          "Promo admin is not configured. Set the ADMIN_PROMO_KEY secret on the server first.",
        );
      } else {
        setAuthError("Couldn't reach the server. Try again.");
      }
    } finally {
      setUnlocking(false);
    }
  };

  const onLock = async () => {
    await clearAdminKey();
    setAdminKey(null);
    setAuthed(false);
    setCodes([]);
  };

  const resetForm = () => {
    setEditingId(null);
    setFCode("");
    setFKind("percent_off");
    setFPercent("20");
    setFTier("diamond");
    setFLabel("");
    setFActive(true);
    setFormMsg(null);
  };

  const startEdit = (rec: PromoRecord) => {
    Haptics.selectionAsync();
    setEditingId(rec.id);
    setFCode(rec.code);
    setFKind(rec.kind);
    setFPercent(String(rec.percent ?? 20));
    setFTier(rec.tier ?? "diamond");
    setFLabel(rec.label);
    setFActive(rec.active);
    setFormMsg(null);
  };

  const onSave = async () => {
    if (!adminKey || saving) return;
    const code = fCode.trim();
    const label = fLabel.trim();
    if (!code) {
      setFormMsg("Enter a code.");
      return;
    }
    if (!label) {
      setFormMsg("Enter a short description.");
      return;
    }
    const percentNum = Number(fPercent);
    if (fKind === "percent_off" && (!Number.isFinite(percentNum) || percentNum < 1 || percentNum > 100)) {
      setFormMsg("Discount must be between 1 and 100.");
      return;
    }
    const input: PromoInput = {
      code,
      kind: fKind,
      label,
      active: fActive,
      percent: fKind === "percent_off" ? percentNum : undefined,
      tier: fKind === "grant_tier" ? fTier : undefined,
    };
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    setFormMsg(null);
    try {
      if (editingId != null) {
        await updatePromoCode(adminKey, editingId, input);
      } else {
        await createPromoCode(adminKey, input);
      }
      await refresh(adminKey);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      resetForm();
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (err instanceof PromoAdminError) setFormMsg(err.message);
      else setFormMsg("Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const onToggleActive = async (rec: PromoRecord) => {
    if (!adminKey) return;
    Haptics.selectionAsync();
    try {
      await updatePromoCode(adminKey, rec.id, { active: !rec.active });
      await refresh(adminKey);
    } catch {
      setListError("Couldn't update that code.");
    }
  };

  const onDelete = async (rec: PromoRecord) => {
    if (!adminKey) return;
    if (pendingDelete !== rec.id) {
      setPendingDelete(rec.id);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    try {
      await deletePromoCode(adminKey, rec.id);
      setPendingDelete(null);
      await refresh(adminKey);
    } catch {
      setListError("Couldn't delete that code.");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 16, paddingBottom: 64 + insets.bottom },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => safeBack()}
            hitSlop={12}
            style={[styles.iconBtn, { borderColor: colors.border }]}
          >
            <Feather name="chevron-left" size={18} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.eyebrow, { color: colors.gold }]}>PROMO CODES</Text>
          <View style={{ width: 32 }} />
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>
          Manage{"\n"}Promo Codes
        </Text>

        {!authed ? (
          <>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              This area is protected. Enter your admin key to create or edit codes.
              Set the key by adding an <Text style={{ color: colors.gold }}>ADMIN_PROMO_KEY</Text> secret
              on the server, then type the same value here once.
            </Text>
            <OrnamentRule style={{ marginVertical: 22 }} />
            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Admin key</Text>
            <TextInput
              value={keyInput}
              onChangeText={(t) => {
                setKeyInput(t);
                if (authError) setAuthError(null);
              }}
              placeholder="Your private admin key"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              onSubmitEditing={onUnlock}
              style={[
                styles.input,
                { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card },
              ]}
            />
            {authError && (
              <Text style={[styles.errorText, { color: "#E07A7A" }]}>{authError}</Text>
            )}
            <GoldButton
              label={unlocking ? "CHECKING…" : "UNLOCK"}
              onPress={onUnlock}
              disabled={unlocking || keyInput.trim().length === 0}
              style={{ marginTop: 22 }}
            />
          </>
        ) : (
          <>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Codes you create here work for every customer. Percent-off codes restyle the
              in-app prices; grant codes hand the customer a complimentary tier.
            </Text>

            {/* ── Tier test mode (this device only) ── */}
            <OrnamentRule style={{ marginVertical: 22 }} />
            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
              Test tiers on this device
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground, marginTop: 6 }]}>
              Switch this device to any membership tier to do a test run of its features.
              Only affects you — customers are untouched. Note: entering test mode replaces
              any promo code active on this device.
            </Text>
            <View style={styles.tierRow}>
              {TEST_TIERS.map((t) => {
                const active = tier === t;
                return (
                  <Pressable
                    key={t}
                    disabled={switchingTier !== null}
                    onPress={() => onTestTier(t)}
                    style={[
                      styles.tierChip,
                      {
                        borderColor: active ? colors.gold : colors.border,
                        backgroundColor: active ? "rgba(198,167,94,0.12)" : "transparent",
                        opacity: switchingTier !== null && switchingTier !== t ? 0.5 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.tierLabel, { color: active ? colors.gold : colors.foreground }]}>
                      {switchingTier === t ? "…" : TIER_DEFINITIONS[t].name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[styles.codeLabel, { color: colors.mutedForeground, marginTop: 8 }]}>
              {testModeActive
                ? `Test mode ON — running as ${TIER_DEFINITIONS[tier].name}`
                : `Test mode off — your real tier is ${TIER_DEFINITIONS[tier].name}`}
            </Text>
            {testModeActive && (
              <Pressable
                onPress={async () => {
                  Haptics.selectionAsync();
                  await clearPromo();
                }}
                hitSlop={8}
                style={{ marginTop: 10, alignSelf: "flex-start" }}
              >
                <Text style={[styles.codeActionText, { color: colors.gold }]}>
                  End test mode (restore my real membership)
                </Text>
              </Pressable>
            )}

            {/* ── Create / edit form ── */}
            <OrnamentRule style={{ marginVertical: 22 }} />
            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
              {editingId != null ? "Edit code" : "New code"}
            </Text>

            <TextInput
              value={fCode}
              onChangeText={setFCode}
              placeholder="CODE (e.g. SUMMER25)"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="characters"
              autoCorrect={false}
              style={[
                styles.input,
                { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card },
              ]}
            />

            <View style={styles.kindRow}>
              {(["percent_off", "grant_tier"] as PromoKind[]).map((k) => {
                const active = fKind === k;
                return (
                  <Pressable
                    key={k}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setFKind(k);
                    }}
                    style={[
                      styles.kindChip,
                      {
                        borderColor: active ? colors.gold : colors.border,
                        backgroundColor: active ? "rgba(198,167,94,0.12)" : "transparent",
                      },
                    ]}
                  >
                    <Text style={[styles.kindLabel, { color: active ? colors.gold : colors.foreground }]}>
                      {k === "percent_off" ? "Percent off" : "Grant tier"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {fKind === "percent_off" ? (
              <TextInput
                value={fPercent}
                onChangeText={(t) => setFPercent(t.replace(/[^0-9]/g, ""))}
                placeholder="Discount %"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="number-pad"
                style={[
                  styles.input,
                  { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card },
                ]}
              />
            ) : (
              <View style={styles.tierRow}>
                {GRANTABLE_TIERS.map((t) => {
                  const active = fTier === t;
                  return (
                    <Pressable
                      key={t}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setFTier(t);
                      }}
                      style={[
                        styles.tierChip,
                        {
                          borderColor: active ? colors.gold : colors.border,
                          backgroundColor: active ? "rgba(198,167,94,0.12)" : "transparent",
                        },
                      ]}
                    >
                      <Text style={[styles.tierLabel, { color: active ? colors.gold : colors.foreground }]}>
                        {TIER_DEFINITIONS[t].name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <TextInput
              value={fLabel}
              onChangeText={setFLabel}
              placeholder="Short description shown to the customer"
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.input,
                { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card, marginTop: 12 },
              ]}
            />

            <View style={[styles.activeRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Text style={[styles.rowTitle, { color: colors.foreground }]}>Active</Text>
              <Switch
                value={fActive}
                onValueChange={(v) => {
                  Haptics.selectionAsync();
                  setFActive(v);
                }}
                trackColor={{ false: "#3a3a3a", true: colors.gold }}
                thumbColor={fActive ? "#0B0B0C" : "#888"}
              />
            </View>

            {formMsg && <Text style={[styles.errorText, { color: "#E07A7A" }]}>{formMsg}</Text>}

            <View style={styles.formBtns}>
              <GoldButton
                label={saving ? "SAVING…" : editingId != null ? "SAVE CHANGES" : "CREATE CODE"}
                onPress={onSave}
                disabled={saving}
                style={{ flex: 1 }}
              />
              {editingId != null && (
                <Pressable onPress={resetForm} style={[styles.cancelBtn, { borderColor: colors.border }]}>
                  <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
                </Pressable>
              )}
            </View>

            {/* ── Your codes ── */}
            <OrnamentRule style={{ marginVertical: 24 }} />
            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Your codes</Text>
            {listError && <Text style={[styles.errorText, { color: "#E07A7A" }]}>{listError}</Text>}
            {codes.length === 0 ? (
              <Text style={[styles.empty, { color: colors.mutedForeground }]}>
                No custom codes yet. Create one above.
              </Text>
            ) : (
              codes.map((rec) => (
                <View
                  key={rec.id}
                  style={[styles.codeCard, { borderColor: colors.border, backgroundColor: colors.card }]}
                >
                  <View style={styles.codeCardTop}>
                    <Text style={[styles.codeName, { color: colors.gold, opacity: rec.active ? 1 : 0.5 }]}>
                      {rec.code}
                    </Text>
                    <Switch
                      value={rec.active}
                      onValueChange={() => onToggleActive(rec)}
                      trackColor={{ false: "#3a3a3a", true: colors.gold }}
                      thumbColor={rec.active ? "#0B0B0C" : "#888"}
                    />
                  </View>
                  <Text style={[styles.codeEffect, { color: colors.foreground }]}>
                    {effectSummary(rec.kind, rec.percent, rec.tier)}
                  </Text>
                  <Text style={[styles.codeLabel, { color: colors.mutedForeground }]}>{rec.label}</Text>
                  <View style={styles.codeActions}>
                    <Pressable onPress={() => startEdit(rec)} hitSlop={8} style={styles.codeAction}>
                      <Feather name="edit-2" size={13} color={colors.mutedForeground} />
                      <Text style={[styles.codeActionText, { color: colors.mutedForeground }]}>Edit</Text>
                    </Pressable>
                    <Pressable onPress={() => onDelete(rec)} hitSlop={8} style={styles.codeAction}>
                      <Feather name="trash-2" size={13} color="#E07A7A" />
                      <Text style={[styles.codeActionText, { color: "#E07A7A" }]}>
                        {pendingDelete === rec.id ? "Tap to confirm" : "Delete"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}

            {/* ── Built-in codes (read-only) ── */}
            <OrnamentRule style={{ marginVertical: 24 }} />
            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Built-in codes</Text>
            <Text style={[styles.builtinNote, { color: colors.mutedForeground }]}>
              These ship with the app and always work offline. They can't be edited here.
            </Text>
            {PROMO_CODES.map((p) => (
              <View
                key={p.code}
                style={[styles.builtinCard, { borderColor: colors.border }]}
              >
                <Text style={[styles.builtinCode, { color: colors.foreground }]}>{p.code}</Text>
                <Text style={[styles.codeLabel, { color: colors.mutedForeground }]}>{p.label}</Text>
              </View>
            ))}

            <Pressable onPress={onLock} style={styles.lockBtn}>
              <Feather name="lock" size={13} color={colors.mutedForeground} />
              <Text style={[styles.lockText, { color: colors.mutedForeground }]}>Lock this device</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: { fontSize: 10, letterSpacing: 2.2, fontWeight: "600" },
  title: { fontSize: 32, lineHeight: 36, fontWeight: "300", marginTop: 8 },
  subtitle: { fontSize: 13, lineHeight: 19, marginTop: 12 },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.8,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 12,
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  errorText: { fontSize: 12, lineHeight: 16, marginTop: 10 },
  kindRow: { flexDirection: "row", gap: 8, marginTop: 12, marginBottom: 12 },
  kindChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
  },
  kindLabel: { fontSize: 12, letterSpacing: 0.3, fontWeight: "600" },
  tierRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tierChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tierLabel: { fontSize: 12, letterSpacing: 0.3 },
  activeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 12,
  },
  rowTitle: { fontSize: 14, fontWeight: "600" },
  formBtns: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 20 },
  cancelBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  cancelText: { fontSize: 13, letterSpacing: 0.3 },
  empty: { fontSize: 13, lineHeight: 19, fontStyle: "italic" },
  codeCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  codeCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  codeName: { fontSize: 16, fontWeight: "700", letterSpacing: 1.5 },
  codeEffect: { fontSize: 13, fontWeight: "600", marginTop: 8 },
  codeLabel: { fontSize: 12, lineHeight: 16, marginTop: 4 },
  codeActions: { flexDirection: "row", gap: 20, marginTop: 14 },
  codeAction: { flexDirection: "row", alignItems: "center", gap: 6 },
  codeActionText: { fontSize: 12, letterSpacing: 0.3 },
  builtinNote: { fontSize: 12, lineHeight: 16, marginTop: -4, marginBottom: 12, fontStyle: "italic" },
  builtinCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  builtinCode: { fontSize: 14, fontWeight: "700", letterSpacing: 1.2 },
  lockBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 28,
    paddingVertical: 10,
  },
  lockText: { fontSize: 12, letterSpacing: 0.3 },
});
