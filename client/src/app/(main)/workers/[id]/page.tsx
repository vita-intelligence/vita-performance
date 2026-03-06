"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useWorkerStats } from "@/hooks/useWorkerStats";
import { RangeKey } from "@/constants/filters.constants";
import RangeSelector from "@/app/(main)/dashboard/leaderboard/_components/RangeSelector";
import WorkerStatsHeader from "./_components/WorkerStatsHeader";
import WorkerSummaryStats from "./_components/WorkerSummaryStats";
import WorkerPerformanceChart from "./_components/WorkerPerformanceChart";
import WorkerSessionsTable from "./_components/WorkerSessionsTable";

export default function WorkerStatsPage() {
    const { id } = useParams();
    const [range, setRange] = useState<RangeKey>("month");
    const { stats, isLoading } = useWorkerStats(Number(id), range);

    if (isLoading) {
        return (
            <main className="bg-background px-4 py-12 sm:px-8 lg:px-16">
                <div className="flex items-center justify-center py-20">
                    <p className="text-muted text-xs uppercase tracking-widest">Loading...</p>
                </div>
            </main>
        );
    }

    if (!stats) {
        return (
            <main className="bg-background px-4 py-12 sm:px-8 lg:px-16">
                <div className="flex items-center justify-center py-20">
                    <p className="text-muted text-xs uppercase tracking-widest">Worker not found.</p>
                </div>
            </main>
        );
    }

    return (
        <main className="bg-background px-4 py-12 sm:px-8 lg:px-16">
            <div className="max-w-6xl mx-auto flex flex-col gap-10">
                <WorkerStatsHeader stats={stats} />
                <RangeSelector value={range} onChange={(r) => setRange(r as RangeKey)} />
                <WorkerSummaryStats summary={stats.summary} />
                <WorkerPerformanceChart chart={stats.chart} grouping={stats.grouping} />
                <WorkerSessionsTable sessions={stats.sessions} />
            </div>
        </main>
    );
}