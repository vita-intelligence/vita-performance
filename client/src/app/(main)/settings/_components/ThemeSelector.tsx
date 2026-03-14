"use client";

import { useThemeStore } from "@/lib/stores";
import { themes, ThemeName } from "@/config/themes";

export default function ThemeSelector() {
    const { theme, setTheme } = useThemeStore();

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted whitespace-nowrap">
                    Appearance
                </h2>
                <div className="h-px bg-border flex-1" />
            </div>
            <div className="flex gap-3 flex-wrap">
                {(Object.keys(themes) as ThemeName[]).map((key) => (
                    <button
                        key={key}
                        onClick={() => setTheme(key)}
                        className={`flex items-center gap-3 px-4 py-3 border transition-colors ${theme === key
                            ? "border-text text-text"
                            : "border-border text-muted hover:border-text hover:text-text"
                            }`}
                    >
                        {/* Color preview dots */}
                        <div className="flex gap-1">
                            {["background", "primary", "text"].map((token) => (
                                <div
                                    key={token}
                                    className="w-3 h-3 rounded-full border border-border"
                                    style={{ backgroundColor: themes[key].colors[token as keyof typeof themes.default.colors] }}
                                />
                            ))}
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-widest">
                            {themes[key].label}
                        </span>
                        {theme === key && (
                            <span className="text-xs font-semibold uppercase tracking-widest text-success">✓</span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}