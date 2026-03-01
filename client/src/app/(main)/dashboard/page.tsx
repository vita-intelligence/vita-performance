"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { useDashboard } from "@/hooks/useDashboard";
import DashboardHeader from "./_components/DashboardHeader";
import OverviewStats from "./_components/OverviewStats";
import TodayStats from "./_components/TodayStats";
import RecentSessions from "./_components/RecentSessions";

export default function DashboardPage() {
    const { overview, isLoading } = useDashboard();
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isLoading && overview) {
            gsap.fromTo(contentRef.current,
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.6, delay: 0.15, ease: "power3.out" }
            );
        }
    }, [isLoading, overview]);

    return (
        <main className="bg-background px-4 py-12 sm:px-8 lg:px-16">
            <div className="max-w-7xl mx-auto flex flex-col gap-10">
                <DashboardHeader />

                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <p className="text-muted text-sm uppercase tracking-widest">Loading...</p>
                    </div>
                ) : !overview ? (
                    <div className="flex items-center justify-center py-20">
                        <p className="text-muted text-sm uppercase tracking-widest">Failed to load dashboard.</p>
                    </div>
                ) : (
                    <div ref={contentRef} className="flex flex-col gap-10">
                        <OverviewStats overview={overview} />
                        <TodayStats overview={overview} />
                        <RecentSessions overview={overview} />
                    </div>
                )}
            </div>
        </main>
    );
}