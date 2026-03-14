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
                    placement="bottom-right"
                    toastProps={{
                        variant: "solid",
                        radius: "none",
                        classNames: {
                            base: "bg-black border border-neutral-800",
                            title: "text-white text-xs font-semibold uppercase tracking-widest",
                            description: "text-neutral-400 text-xs",
                            closeButton: "text-neutral-400 hover:text-white",
                        },
                    }}
                />
                {children}
            </HeroUIProvider>
        </QueryClientProvider>
    );
}