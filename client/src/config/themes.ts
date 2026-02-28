export const themes = {
  default: {
    colors: {
      primary: "#6C63FF",
      secondary: "#F5A623",
      background: "#FFFFFF",
      surface: "#F9F9F9",
      text: "#1A1A1A",
      muted: "#6B7280",
      border: "#E5E7EB",
      error: "#EF4444",
      success: "#22C55E",
    },
    fonts: {
      sans: ["Inter", "sans-serif"],
      heading: ["Cal Sans", "sans-serif"],
    },
  },
  dark: {
    colors: {
      primary: "#6C63FF",
      secondary: "#F5A623",
      background: "#0F0F0F",
      surface: "#1A1A1A",
      text: "#F9F9F9",
      muted: "#9CA3AF",
      border: "#2E2E2E",
      error: "#EF4444",
      success: "#22C55E",
    },
    fonts: {
      sans: ["Inter", "sans-serif"],
      heading: ["Cal Sans", "sans-serif"],
    },
  },
} as const;

export type ThemeName = keyof typeof themes;