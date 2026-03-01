"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import ProtectedNav from "@/components/shared/nav/ProtectedNav";

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.replace("/login");
        }
    }, [isAuthenticated, isLoading]);

    if (isLoading) return null;

    return (
        <div className="flex h-screen bg-background overflow-hidden">
            <ProtectedNav />
            <div className="flex-1 overflow-y-auto pb-16 md:pb-0">
                {children}
            </div>
        </div>
    );
}