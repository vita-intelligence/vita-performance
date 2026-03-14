"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import ProtectedNav from "@/components/shared/nav/ProtectedNav";
import SubscriptionBanner from "@/components/shared/SubscriptionBanner";

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    const isFullscreen = pathname === "/dashboard/realtime";

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.replace("/login");
        }
    }, [isAuthenticated, isLoading]);

    if (isLoading) return null;

    if (isFullscreen) {
        return (
            <div className="min-h-screen bg-background overflow-hidden">
                {children}
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-background overflow-hidden">
            <ProtectedNav />
            <div className="flex-1 flex flex-col overflow-hidden">
                <SubscriptionBanner />
                <div className="flex-1 overflow-y-auto pb-16 md:pb-0">
                    {children}
                </div>
            </div>
        </div>
    );
}