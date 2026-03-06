"use client";

import { WorkerLeaderboardEntry } from "@/types/worker";
import LeaderboardRow from "./LeaderboardRow";
import Link from "next/link";

interface LeaderboardListProps {
    results: WorkerLeaderboardEntry[];
}

export default function LeaderboardList({ results }: LeaderboardListProps) {
    if (!results.length) {
        return (
            <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border gap-2">
                <p className="text-muted text-sm uppercase tracking-widest">No data for this period</p>
                <Link
                    href="/sessions/new"
                    className="text-xs font-semibold uppercase tracking-widest text-text underline"
                >
                    Log a session
                </Link>
            </div>
        );
    }

    return (
        <div className="border border-border px-6">
            {results.map((entry, index) => (
                <LeaderboardRow
                    key={entry.id}
                    entry={entry}
                    rank={index + 1}
                    delay={index * 0.06}
                />
            ))}
        </div>
    );
}