import { create } from "zustand";
import { persist } from "zustand/middleware";
import { UserSettings } from "@/types/settings";

interface SettingsStore {
  settings: UserSettings | null;
  setSettings: (settings: UserSettings | null) => void;
  clearSettings: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: null,
      setSettings: (settings) => set({ settings }),
      clearSettings: () => set({ settings: null }),
    }),
    {
      name: "settings-storage",
    }
  )
);