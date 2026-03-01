"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { Radio } from "lucide-react";

export default function DashboardHeader() {
    const ref = useRef<HTMLDivElement>(null);
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        gsap.fromTo(ref.current,
            { opacity: 0, y: -20 },
            { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }
        );
    }, []);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    };

    return (
        <div ref={ref} className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-black text-text">
                    {getGreeting()}, {user?.username}.
                </h1>
                <p className="text-muted text-sm hidden sm:block">Here's what's happening today.</p>
            </div>
            <Button
                onPress={() => router.push("/dashboard/realtime")}
                variant="bordered"
                className="rounded-none border-text text-text text-xs font-semibold uppercase tracking-widest px-4 sm:px-6 shrink-0 group transition-all hover:bg-text hover:text-background"
            >
                <span className="flex items-center gap-2">
                    <span className="relative flex items-center justify-center">
                        <Radio size={14} className="shrink-0 group-hover:opacity-0 transition-opacity" />
                        <span className="absolute w-2 h-2 rounded-full bg-current opacity-0 group-hover:opacity-100 animate-ping transition-opacity" />
                        <span className="absolute w-2 h-2 rounded-full bg-current opacity-0 group-hover:opacity-100 transition-opacity" />
                    </span>
                    <span className="sm:hidden">Live</span>
                    <span className="hidden sm:inline">Live Dashboard</span>
                </span>
            </Button>
        </div>
    );
}