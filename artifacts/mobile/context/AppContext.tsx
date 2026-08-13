import AsyncStorage from "@react-native-async-storage/async-storage";
import { loadAffiliateConfig } from "@/lib/affiliateSettings";
import { hydrateAffiliatePartnerships } from "@/lib/affiliateLinkService";
import { initShownLooks } from "@/lib/shownLooks";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { Look, LOOKS, Product } from "@/constants/data";
import {
  applyLove,
  applyNotForMe,
  EMPTY_FEEDBACK,
  type NotForMeReason,
  type StyleFeedback,
} from "@/lib/feedback";

export interface ClosetItem {
  id: string;
  name: string;
  category: string;
  color: string;
  brand: string;
  addedAt: string;
}

export interface UserProfile {
  name: string;
  gender: string;
  size: string;
  budget: string;
  favoriteStyles: string[];
  // Season the user is currently dressing for. Drives a soft season filter
  // at outfit-pool construction so a Summer profile won't surface wool coats
  // and a Winter profile won't surface linen tanks. "All Season" disables
  // the filter. Defaults to "All Season" so legacy profiles keep working.
  season: string;
  onboardingComplete: boolean;
}

interface AppContextType {
  savedLooks: Look[];
  savedProducts: Product[];
  closetItems: ClosetItem[];
  savedCelebrityIds: string[];
  userProfile: UserProfile;
  saveLook: (look: Look) => void;
  unsaveLook: (id: string) => void;
  isLookSaved: (id: string) => boolean;
  saveProduct: (product: Product) => void;
  unsaveProduct: (id: string) => void;
  isProductSaved: (id: string) => boolean;
  addClosetItem: (item: Omit<ClosetItem, "id" | "addedAt">) => void;
  removeClosetItem: (id: string) => void;
  toggleCelebrity: (id: string) => void;
  isCelebritySaved: (id: string) => boolean;
  updateProfile: (updates: Partial<UserProfile>) => void;
  completeOnboarding: (profile: Partial<UserProfile>) => void;
  registerGeneratedLooks: (looks: Look[]) => void;
  findLook: (id: string) => Look | undefined;
  // Love This / Not For Me preference learning (soft generation biases).
  styleFeedback: StyleFeedback;
  loveLook: (look: Look) => void;
  rejectLook: (look: Look, reason: NotForMeReason) => void;
  lookFeedbackGiven: (id: string) => "love" | "reject" | undefined;
}

// Saved looks expire 7 days after they were saved, unless the user saves /
// updates them again (which refreshes the timestamp). Per the styling spec's
// saved-look rule. Enforced by pruning on every app load.
const SAVED_LOOK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const DEFAULT_PROFILE: UserProfile = {
  name: "",
  gender: "Women",
  size: "M",
  budget: "$500–$1500",
  favoriteStyles: [],
  season: "All Season",
  onboardingComplete: false,
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [savedLooks, setSavedLooks] = useState<Look[]>([]);
  const [savedProducts, setSavedProducts] = useState<Product[]>([]);
  const [closetItems, setClosetItems] = useState<ClosetItem[]>([]);
  const [savedCelebrityIds, setSavedCelebrityIds] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [generatedLooksMap, setGeneratedLooksMap] = useState<Record<string, Look>>({});
  const [styleFeedback, setStyleFeedback] = useState<StyleFeedback>(EMPTY_FEEDBACK);
  // Which looks the user already rated (love/reject) — drives button state.
  const [feedbackByLook, setFeedbackByLook] = useState<Record<string, "love" | "reject">>({});

  useEffect(() => {
    loadPersistedData();
    // Hydrate the in-app affiliate toggle (runtime override). Fire-and-
    // forget — until this resolves, `applyAffiliate()` is a strict no-op
    // (raw URLs), which is the safe default that closes the first-tap
    // race. Hydration failure is non-fatal and stays no-op.
    loadAffiliateConfig().catch(() => {});
    // Centralized affiliate resolver: cache + refresh the active partnership
    // list (Rakuten etc.) so click-time link resolution works offline.
    hydrateAffiliatePartnerships().catch(() => {});
    // Hydrate the persistent "already generated" look memory so a combination
    // that was produced in ANY prior session never regenerates. Fire-and-forget;
    // failure just means we start with an empty (in-session-only) memory.
    initShownLooks().catch(() => {});
  }, []);

  const loadPersistedData = async () => {
    try {
      const [looks, products, closet, celebs, profile, feedback, feedbackIds] = await Promise.all([
        AsyncStorage.getItem("savedLooks"),
        AsyncStorage.getItem("savedProducts"),
        AsyncStorage.getItem("closetItems"),
        AsyncStorage.getItem("savedCelebrityIds"),
        AsyncStorage.getItem("userProfile"),
        AsyncStorage.getItem("styleFeedback"),
        AsyncStorage.getItem("feedbackByLook"),
      ]);
      if (looks) {
        const now = Date.now();
        const parsed: Look[] = JSON.parse(looks);
        // Legacy entries saved before `savedAt` existed get stamped with "now"
        // so they inherit a fresh 7-day window rather than vanishing instantly;
        // everything past its 7-day TTL is dropped (expired).
        const kept = parsed
          .map((l) => (l.savedAt ? l : { ...l, savedAt: new Date(now).toISOString() }))
          .filter((l) => now - new Date(l.savedAt as string).getTime() < SAVED_LOOK_TTL_MS);
        setSavedLooks(kept);
        if (kept.length !== parsed.length || kept.some((l, i) => l !== parsed[i])) {
          AsyncStorage.setItem("savedLooks", JSON.stringify(kept));
        }
      }
      if (products) setSavedProducts(JSON.parse(products));
      if (closet) setClosetItems(JSON.parse(closet));
      if (celebs) setSavedCelebrityIds(JSON.parse(celebs));
      // Merge persisted profile over defaults so legacy profiles (saved
      // before a new field like `season` was added) inherit the default
      // for any missing key instead of becoming undefined.
      if (profile) setUserProfile({ ...DEFAULT_PROFILE, ...JSON.parse(profile) });
      // Hydration must never clobber a rating the user made while storage
      // was still loading — only apply persisted feedback when the in-memory
      // state is still pristine.
      if (feedback) {
        const loaded = { ...EMPTY_FEEDBACK, ...JSON.parse(feedback) };
        setStyleFeedback((cur) => (cur === EMPTY_FEEDBACK ? loaded : cur));
      }
      if (feedbackIds) {
        const loadedIds = JSON.parse(feedbackIds);
        setFeedbackByLook((cur) => (Object.keys(cur).length === 0 ? { ...loadedIds, ...cur } : { ...loadedIds, ...cur }));
      }
    } catch {}
  };

  // Love This / Not For Me — one rating per look; signals accumulate into
  // soft generation biases (see lib/feedback.ts).
  const loveLook = useCallback((look: Look) => {
    setFeedbackByLook((prev) => {
      if (prev[look.id]) return prev;
      const nextIds = { ...prev, [look.id]: "love" as const };
      AsyncStorage.setItem("feedbackByLook", JSON.stringify(nextIds));
      setStyleFeedback((fb) => {
        const next = applyLove(fb, look);
        AsyncStorage.setItem("styleFeedback", JSON.stringify(next));
        return next;
      });
      return nextIds;
    });
  }, []);

  const rejectLook = useCallback((look: Look, reason: NotForMeReason) => {
    setFeedbackByLook((prev) => {
      if (prev[look.id]) return prev;
      const nextIds = { ...prev, [look.id]: "reject" as const };
      AsyncStorage.setItem("feedbackByLook", JSON.stringify(nextIds));
      setStyleFeedback((fb) => {
        const next = applyNotForMe(fb, look, reason);
        AsyncStorage.setItem("styleFeedback", JSON.stringify(next));
        return next;
      });
      return nextIds;
    });
  }, []);

  const lookFeedbackGiven = useCallback(
    (id: string) => feedbackByLook[id],
    [feedbackByLook]
  );

  const saveLook = useCallback((look: Look) => {
    setSavedLooks((prev) => {
      // Stamp (or refresh) savedAt so re-saving an existing look resets its
      // 7-day expiry window, per the saved-look rule. Dedup by id and surface
      // the freshly-saved look at the front of the list.
      const stamped: Look = { ...look, savedAt: new Date().toISOString() };
      const updated = [stamped, ...prev.filter((l) => l.id !== look.id)];
      AsyncStorage.setItem("savedLooks", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const unsaveLook = useCallback((id: string) => {
    setSavedLooks((prev) => {
      const updated = prev.filter((l) => l.id !== id);
      AsyncStorage.setItem("savedLooks", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const isLookSaved = useCallback(
    (id: string) => savedLooks.some((l) => l.id === id),
    [savedLooks]
  );

  const saveProduct = useCallback((product: Product) => {
    setSavedProducts((prev) => {
      const updated = prev.some((p) => p.id === product.id) ? prev : [product, ...prev];
      AsyncStorage.setItem("savedProducts", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const unsaveProduct = useCallback((id: string) => {
    setSavedProducts((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      AsyncStorage.setItem("savedProducts", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const isProductSaved = useCallback(
    (id: string) => savedProducts.some((p) => p.id === id),
    [savedProducts]
  );

  const addClosetItem = useCallback((item: Omit<ClosetItem, "id" | "addedAt">) => {
    const newItem: ClosetItem = {
      ...item,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      addedAt: new Date().toISOString(),
    };
    setClosetItems((prev) => {
      const updated = [newItem, ...prev];
      AsyncStorage.setItem("closetItems", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeClosetItem = useCallback((id: string) => {
    setClosetItems((prev) => {
      const updated = prev.filter((i) => i.id !== id);
      AsyncStorage.setItem("closetItems", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const toggleCelebrity = useCallback((id: string) => {
    setSavedCelebrityIds((prev) => {
      const updated = prev.includes(id) ? prev.filter((c) => c !== id) : [id, ...prev];
      AsyncStorage.setItem("savedCelebrityIds", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const isCelebritySaved = useCallback(
    (id: string) => savedCelebrityIds.includes(id),
    [savedCelebrityIds]
  );

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setUserProfile((prev) => {
      const updated = { ...prev, ...updates };
      AsyncStorage.setItem("userProfile", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const completeOnboarding = useCallback((profile: Partial<UserProfile>) => {
    setUserProfile((prev) => {
      const updated = { ...prev, ...profile, onboardingComplete: true };
      AsyncStorage.setItem("userProfile", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const registerGeneratedLooks = useCallback((looks: Look[]) => {
    setGeneratedLooksMap((prev) => {
      const next = { ...prev };
      for (const look of looks) next[look.id] = look;
      return next;
    });
  }, []);

  const findLook = useCallback(
    (id: string): Look | undefined =>
      LOOKS.find((l) => l.id === id) ??
      generatedLooksMap[id] ??
      savedLooks.find((l) => l.id === id),
    [generatedLooksMap, savedLooks]
  );

  return (
    <AppContext.Provider
      value={{
        savedLooks,
        savedProducts,
        closetItems,
        savedCelebrityIds,
        userProfile,
        saveLook,
        unsaveLook,
        isLookSaved,
        saveProduct,
        unsaveProduct,
        isProductSaved,
        addClosetItem,
        removeClosetItem,
        toggleCelebrity,
        isCelebritySaved,
        updateProfile,
        completeOnboarding,
        registerGeneratedLooks,
        styleFeedback,
        loveLook,
        rejectLook,
        lookFeedbackGiven,
        findLook,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
