"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { HeroUIProvider, ToastProvider } from "@heroui/react";
import { useEffect } from "react";
import queryClient from "@/lib/queryClient";
import { useThemeStore } from "@/lib/stores";
import { themes } from "@/config/themes";

function ThemeInitializer() {
    const { theme } = useThemeStore();

    useEffect(() => {
        const root = document.documentElement;
        Object.entries(themes[theme].colors).forEach(([key, value]) => {
            root.style.setProperty(`--color-${key}`, value);
        });
    }, [theme]);

    return null;
}

interface AppProvidersProps {
    children: React.ReactNode;
}

export default function AppProviders({ children }: AppProvidersProps) {
    return (
        <QueryClientProvider client={queryClient}>
            <HeroUIProvider>
                <ThemeInitializer />
                <ToastProvider
                    // top-center stays reachable on iOS Safari — the
                    // browser toolbar eats the bottom-right corner and
                    // pushes the close button off-screen on mobile.
                    placement="top-center"
                    toastProps={{
                        variant: "solid",
                        radius: "none",
                        timeout: 5000,
                        shouldShowTimeoutProgress: true,
                        classNames: {
                            // pr padding leaves room for the close
                            // button so it never overlaps the text.
                            base: "bg-black border border-neutral-800 pr-12",
                            title: "text-white text-xs font-semibold uppercase tracking-widest",
                            description: "text-neutral-400 text-xs",
                            // Bigger tap target on mobile — a size-4
                            // icon in a size-9 button is comfortable
                            // for finger taps and stays legible.
                            closeButton:
                                "opacity-100 absolute right-2 top-2 flex size-9 items-center justify-center rounded-full text-neutral-300 hover:bg-white/10 hover:text-white active:scale-95 transition-colors",
                        },
                    }}
                />
                {children}
            </HeroUIProvider>
        </QueryClientProvider>
    );
}