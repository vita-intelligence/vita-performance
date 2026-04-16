"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useWorkstationStats } from "@/hooks/useWorkstationStats";
import { RangeKey } from "@/constants/filters.constants";
import RangeSelector from "@/app/(main)/dashboard/leaderboard/_components/RangeSelector";
import WorkstationStatsHeader from "./_components/WorkstationStatsHeader";
import WorkstationSummaryStats from "./_components/WorkstationSummaryStats";
import WorkstationPerformanceChart from "./_components/WorkstationPerformanceChart";
import WorkstationTopWorkers from "./_components/WorkstationTopWorkers";
import WorkstationItemsBreakdown from "./_components/WorkstationItemsBreakdown";
import WorkstationSessionsTable from "./_components/WorkstationSessionsTable";

export default function WorkstationStatsPage() {
    const { id } = useParams();
    const [range, setRange] = useState<RangeKey>("month");
    const { stats, isLoading } = useWorkstationStats(Number(id), range);

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
                    <p className="text-muted text-xs uppercase tracking-widest">Workstation not found.</p>
                </div>
            </main>
        );
    }

    return (
        <main className="bg-background px-4 py-12 sm:px-8 lg:px-16">
            <div className="max-w-6xl mx-auto flex flex-col gap-10">
                <WorkstationStatsHeader stats={stats} />
                <RangeSelector value={range} onChange={(r) => setRange(r as RangeKey)} />
                <WorkstationSummaryStats summary={stats.summary} />
                <WorkstationPerformanceChart chart={stats.chart} grouping={stats.grouping} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <WorkstationTopWorkers workers={stats.top_workers} />
                    <WorkstationItemsBreakdown items={stats.items_breakdown} />
                </div>
                <WorkstationSessionsTable sessions={stats.sessions} />
            </div>
        </main>
    );
}
