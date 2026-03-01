# Styling System

This document explains how theming and styling works and how to add or edit styles.

---

## Overview

Styling is based on **Tailwind CSS v4** with a **CSS variable theming system**. This means:

- All colors are defined as CSS variables inside `@theme {}` in `globals.css`
- Tailwind automatically generates utility classes from those variables
- Switching themes at runtime swaps CSS variables via `data-theme` on `<html>`
- There is no `tailwind.config.ts` — Tailwind v4 is CSS-first

---

## File Structure

```
src/
├── app/
│   └── globals.css         # @theme tokens + dark theme overrides + base styles
├── config/
│   └── themes.ts           # Theme definitions used by the runtime theme switcher
hero.ts                     # HeroUI plugin registration (project root)
```

---

## How It Works

### 1. Token Definitions (`src/app/globals.css`)

Tokens are defined inside `@theme {}` — Tailwind v4 reads these and generates utility classes automatically:

```css
@theme {
  --color-primary: #6c63ff;
  --color-background: #ffffff;
  --color-text: #1a1a1a;
}
```

Dark theme overrides are scoped to `[data-theme="dark"]`:

```css
[data-theme="dark"] {
  --color-background: #0f0f0f;
  --color-text: #f9f9f9;
}
```

### 2. Tailwind Classes

Tailwind automatically generates classes from `@theme` tokens. No config file needed:

```tsx
<div className="bg-background text-text border-border" />
```

### 3. Runtime Theme Switching (`src/config/themes.ts`)

The `themes.ts` file defines all theme values used by the runtime switcher to apply CSS variables programmatically:

```ts
import { themes, ThemeName } from "@/config/themes";

export const applyTheme = (theme: ThemeName) => {
  const selected = themes[theme];
  const root = document.documentElement;
  Object.entries(selected.colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
  });
};
```

### 4. Root Layout (`src/app/layout.tsx`)

The default theme is set on the `<html>` element:

```tsx
<html lang="en" data-theme="default">
```

---

## Available Tokens

### Colors

| Token                | Tailwind Class                   | Usage               |
| -------------------- | -------------------------------- | ------------------- |
| `--color-primary`    | `bg-primary`, `text-primary`     | Brand color, CTAs   |
| `--color-secondary`  | `bg-secondary`, `text-secondary` | Accents             |
| `--color-background` | `bg-background`                  | Page background     |
| `--color-surface`    | `bg-surface`                     | Cards, panels       |
| `--color-text`       | `text-text`, `bg-text`           | Body text           |
| `--color-muted`      | `text-muted`                     | Placeholders, hints |
| `--color-border`     | `border-border`                  | Borders, dividers   |
| `--color-error`      | `text-error`, `bg-error`         | Error states        |
| `--color-success`    | `text-success`, `bg-success`     | Success states      |

---

## How to Edit an Existing Color

Open `src/app/globals.css` and update the value inside `@theme {}`:

```css
@theme {
  --color-primary: #ff6584; /* changed from #6C63FF */
}
```

If the color differs per theme, also update `[data-theme="dark"]` below and sync the value in `src/config/themes.ts`.

---

## How to Add a New Color Token

### Step 1 — Add it to `@theme {}` in `globals.css`

```css
@theme {
  --color-warning: #f59e0b;
}
```

### Step 2 — Add the dark theme override if needed

```css
[data-theme="dark"] {
  --color-warning: #fbbf24;
}
```

### Step 3 — Add it to all themes in `src/config/themes.ts`

```ts
default: {
  colors: {
    warning: "#F59E0B",
  }
},
dark: {
  colors: {
    warning: "#FBBF24",
  }
}
```

Always add to **every theme** to avoid broken styles when switching.

### Step 4 — Use it with Tailwind classes

```tsx
<p className="text-warning">This is a warning</p>
<div className="bg-warning">Warning banner</div>
```

---

## How to Add a New Theme

### Step 1 — Add theme overrides to `globals.css`

```css
[data-theme="ocean"] {
  --color-primary: #0ea5e9;
  --color-secondary: #06b6d4;
  --color-background: #f0f9ff;
  --color-surface: #e0f2fe;
  --color-text: #0c4a6e;
  --color-muted: #7dd3fc;
  --color-border: #bae6fd;
  --color-error: #ef4444;
  --color-success: #22c55e;
}
```

Make sure **every token** is defined — missing tokens will fall back to the `@theme` defaults.

### Step 2 — Add it to `src/config/themes.ts`

```ts
export const themes = {
  default: { ... },
  dark: { ... },
  ocean: {
    colors: {
      primary: "#0EA5E9",
      secondary: "#06B6D4",
      background: "#F0F9FF",
      surface: "#E0F2FE",
      text: "#0C4A6E",
      muted: "#7DD3FC",
      border: "#BAE6FD",
      error: "#EF4444",
      success: "#22C55E",
    },
    fonts: {
      sans: ["Inter", "sans-serif"],
      heading: ["Cal Sans", "sans-serif"],
    },
  },
} as const;

export type ThemeName = keyof typeof themes; // "default" | "dark" | "ocean"
```

### Step 3 — Switch to it

Manually for testing:

```tsx
<html lang="en" data-theme="ocean">
```

Or programmatically via the theme switcher:

```ts
document.documentElement.setAttribute("data-theme", "ocean");
```

---

## Rules to Follow

- **Never hardcode colors** in components. Always use a token like `text-primary` instead of `text-[#6C63FF]`
- **Never use** `text-[--color-primary]` syntax — just use `text-primary` since tokens are registered in `@theme`
- **Always define every token** when adding a new theme — missing variables fall back to `@theme` defaults
- **Keep `globals.css` and `themes.ts` in sync** — if you change a color in one, change it in the other
- **Use semantic token names** (`bg-surface`, not `bg-gray-100`) so themes remain meaningful across the app
