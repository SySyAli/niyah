import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance } from "react-native";
import { type Theme } from "../constants/colors";

interface ThemeStore {
  theme: Theme;
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

// Use the device's current color scheme as the initial default so the very
// first render already has the right color before AsyncStorage finishes loading.
const deviceTheme = (Appearance.getColorScheme() as Theme) ?? "dark";

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: deviceTheme,
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),
      toggleTheme: () =>
        set({ theme: get().theme === "dark" ? "light" : "dark" }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "niyah-theme",
      storage: createJSONStorage(() => AsyncStorage),
      // Mark hydration complete so layouts can wait for the persisted value
      // before committing native appearance props to UITabBar.
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
