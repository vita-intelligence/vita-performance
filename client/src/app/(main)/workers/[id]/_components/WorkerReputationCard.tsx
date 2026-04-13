"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { WorkerStats } from "@/types/worker";
import CreditScoreGauge from "@/components/ui/CreditScoreGauge";
import WorkerReputationHistory from "./WorkerReputationHistory";

interface WorkerReputationCardProps {
    stats: WorkerStats;
}

export default function WorkerReputationCard({ stats }: WorkerReputationCardProps) {
    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted whitespace-nowrap">
                    Reputation Score
                </h2>
                <div className="h-px bg-border flex-1" />
                <Link
                    href={`/reputation?worker=${stats.worker.id}`}
                    className="flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-muted hover:text-text transition-colors whitespace-nowrap"
                >
                    Full Timeline
                    <ArrowRight size={12} />
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 border border-border p-6">
                <div className="flex items-center justify-center">
                    <CreditScoreGauge
                        score={stats.worker.reputation_score}
                        tier={stats.worker.reputation_tier}
                        size="lg"
                    />
                </div>
                <div className="flex flex-col gap-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                        Recent Events
                    </p>
                    <WorkerReputationHistory events={stats.reputation_history} />
                </div>
            </div>
        </div>
    );
}
