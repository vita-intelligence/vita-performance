"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkerLeaderboard } from "@/hooks/useWorkerLeaderboard";
import RangeSelector from "./_components/RangeSelector";
import LeaderboardList from "./_components/LeaderboardList";
import { RangeKey } from "@/constants/filters.constants";
import { BreadcrumbItem, Breadcrumbs } from "@heroui/react";

export default function WorkerLeaderboardPage() {
    const router = useRouter();
    const [range, setRange] = useState<RangeKey>("today");
    const { leaderboard, isLoading } = useWorkerLeaderboard(range);

    const results = leaderboard?.results ?? [];

    return (
        <main className="bg-background px-4 py-12 sm:px-8 lg:px-16">
            <div className="max-w-3xl mx-auto flex flex-col gap-10">

                {/* Header */}
                <div className="flex flex-col gap-3">
                    <Breadcrumbs>
                        <BreadcrumbItem href="/dashboard">Dashboard</BreadcrumbItem>
                        <BreadcrumbItem>Leaderboard</BreadcrumbItem>
                    </Breadcrumbs>
                    <div className="flex flex-col gap-1">
                        <h1 className="text-3xl font-black text-text uppercase tracking-tight">
                            Leaderboard
                        </h1>
                        <p className="text-muted text-sm">Ranked by average performance</p>
                    </div>
                </div>

                <RangeSelector value={range} onChange={setRange} />

                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <p className="text-muted text-xs uppercase tracking-widest">Loading...</p>
                    </div>
                ) : (
                    <LeaderboardList results={results} />
                )}

            </div>
        </main>
    );
}