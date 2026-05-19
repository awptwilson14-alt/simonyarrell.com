import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { Look, Product } from "@/constants/data";

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
}

const DEFAULT_PROFILE: UserProfile = {
  name: "",
  gender: "Women",
  size: "M",
  budget: "$500–$1500",
  favoriteStyles: [],
  onboardingComplete: false,
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [savedLooks, setSavedLooks] = useState<Look[]>([]);
  const [savedProducts, setSavedProducts] = useState<Product[]>([]);
  const [closetItems, setClosetItems] = useState<ClosetItem[]>([]);
  const [savedCelebrityIds, setSavedCelebrityIds] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_PROFILE);

  useEffect(() => {
    loadPersistedData();
  }, []);

  const loadPersistedData = async () => {
    try {
      const [looks, products, closet, celebs, profile] = await Promise.all([
        AsyncStorage.getItem("savedLooks"),
        AsyncStorage.getItem("savedProducts"),
        AsyncStorage.getItem("closetItems"),
        AsyncStorage.getItem("savedCelebrityIds"),
        AsyncStorage.getItem("userProfile"),
      ]);
      if (looks) setSavedLooks(JSON.parse(looks));
      if (products) setSavedProducts(JSON.parse(products));
      if (closet) setClosetItems(JSON.parse(closet));
      if (celebs) setSavedCelebrityIds(JSON.parse(celebs));
      if (profile) setUserProfile(JSON.parse(profile));
    } catch {}
  };

  const saveLook = useCallback((look: Look) => {
    setSavedLooks((prev) => {
      const updated = prev.some((l) => l.id === look.id) ? prev : [look, ...prev];
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
