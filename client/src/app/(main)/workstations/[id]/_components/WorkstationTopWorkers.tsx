"use client";

import Link from "next/link";
import { WorkstationTopWorker } from "@/types/workstation";
import { useSettings } from "@/hooks/useSettings";
import { formatNumber } from "@/lib/utils/number.utils";

interface WorkstationTopWorkersProps {
    workers: WorkstationTopWorker[];
}

export default function WorkstationTopWorkers({ workers }: WorkstationTopWorkersProps) {
    const { settings } = useSettings();

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted whitespace-nowrap">
                    Top Workers
                </h2>
                <div className="h-px bg-border flex-1" />
            </div>

            {!workers.length ? (
                <div className="flex items-center justify-center py-12 border border-dashed border-border">
                    <p className="text-muted text-xs uppercase tracking-widest">No worker data</p>
                </div>
            ) : (
                <div className="border border-border divide-y divide-border">
                    {workers.map((worker, index) => (
                        <Link
                            key={worker.id}
                            href={`/workers/${worker.id}`}
                            className="flex items-center gap-4 px-4 py-3 hover:bg-surface transition-colors"
                        >
                            <span className="text-xs font-black text-muted w-6 text-center shrink-0">
                                {index + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-text truncate">{worker.name}</p>
                                <p className="text-xs text-muted">
                                    {worker.sessions_count} sessions &middot; {formatNumber(worker.total_quantity, settings)} units &middot; {worker.total_hours}h
                                </p>
                            </div>
                            <div className="shrink-0">
                                {worker.avg_performance !== null ? (
                                    <span className={`text-xs font-semibold px-2 py-1 border ${worker.avg_performance >= 100
                                        ? "border-success text-success"
                                        : worker.avg_performance >= 75
                                            ? "border-secondary text-secondary"
                                            : "border-error text-error"
                                        }`}>
                                        {worker.avg_performance}%
                                    </span>
                                ) : (
                                    <span className="text-xs text-muted">—</span>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
