import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Currency, Language, Timezone } from "@/types/meta";

interface MetaStore {
  currencies: Currency[];
  languages: Language[];
  timezones: Timezone[];
  setCurrencies: (currencies: Currency[]) => void;
  setLanguages: (languages: Language[]) => void;
  setTimezones: (timezones: Timezone[]) => void;
  clearMeta: () => void;
}

export const useMetaStore = create<MetaStore>()(
  persist(
    (set) => ({
      currencies: [],
      languages: [],
      timezones: [],
      setCurrencies: (currencies) => set({ currencies }),
      setLanguages: (languages) => set({ languages }),
      setTimezones: (timezones) => set({ timezones }),
      clearMeta: () => set({ currencies: [], languages: [], timezones: [] }),
    }),
    {
      name: "meta-storage",
    }
  )
);