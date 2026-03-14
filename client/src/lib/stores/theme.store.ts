import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ThemeName, themes } from "@/config/themes";

interface ThemeStore {
    theme: ThemeName;
    setTheme: (theme: ThemeName) => void;
}

export const useThemeStore = create<ThemeStore>()(
    persist(
        (set) => ({
            theme: "default",
            setTheme: (theme) => {
                set({ theme });
                const root = document.documentElement;
                Object.entries(themes[theme].colors).forEach(([key, value]) => {
                    root.style.setProperty(`--color-${key}`, value);
                });
            },
        }),
        { name: "vita-theme" }
    )
);