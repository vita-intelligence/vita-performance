"use client";

import Link from "next/link";
import { ReputationTimelineEvent, ReputationEventType } from "@/types/worker";
import { TrendingUp, TrendingDown, ThumbsUp, ThumbsDown, Activity } from "lucide-react";

const EVENT_LABELS: Record<ReputationEventType, string> = {
    auto_perf_excellent: "Excellent performance",
    auto_perf_high: "High performance",
    auto_perf_low: "Low performance",
    auto_perf_very_low: "Very low performance",
    manual_positive: "Positive feedback",
    manual_negative: "Negative feedback",
};

function eventIcon(type: ReputationEventType) {
    if (type === "manual_positive") return <ThumbsUp size={14} />;
    if (type === "manual_negative") return <ThumbsDown size={14} />;
    if (type === "auto_perf_excellent" || type === "auto_perf_high") return <TrendingUp size={14} />;
    if (type === "auto_perf_low" || type === "auto_perf_very_low") return <TrendingDown size={14} />;
    return <Activity size={14} />;
}

function formatDateTime(iso: string) {
    const d = new Date(iso);
    return (
        d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) +
        " · " +
        d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    );
}

interface ReputationEventRowProps {
    event: ReputationTimelineEvent;
    hideWorker?: boolean;
}

export default function ReputationEventRow({ event, hideWorker = false }: ReputationEventRowProps) {
    const positive = event.score_delta > 0;
    const isManual = event.event_type.startsWith("manual_");
    const sourceLabel = isManual
        ? event.created_by_name
            ? `by ${event.created_by_name}`
            : "by QC"
        : "automatic";

    return (
        <div className="border border-border bg-background hover:bg-surface transition-colors flex flex-col gap-2 p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <span
                        className={`flex items-center justify-center w-9 h-9 border ${positive
                            ? "border-success text-success"
                            : "border-error text-error"
                            }`}
                    >
                        {eventIcon(event.event_type)}
                    </span>
                    <div className="flex flex-col gap-0.5 min-w-0">
                        {hideWorker ? (
                            <p className="text-sm font-black uppercase tracking-wide text-text truncate">
                                {EVENT_LABELS[event.event_type]}
                            </p>
                        ) : (
                            <Link
                                href={`/reputation?worker=${event.worker_id}`}
                                className="text-sm font-black uppercase tracking-wide text-text hover:underline truncate"
                            >
                                {event.worker_name}
                            </Link>
                        )}
                        <p className="text-xs text-muted uppercase tracking-widest">
                            {hideWorker ? sourceLabel : `${EVENT_LABELS[event.event_type]} · ${sourceLabel}`}
                        </p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                    <span
                        className={`text-sm font-black uppercase tracking-widest px-2 py-0.5 border ${positive
                            ? "border-success text-success"
                            : "border-error text-error"
                            }`}
                    >
                        {positive ? "+" : ""}
                        {event.score_delta}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-muted">
                        {formatDateTime(event.created_at)}
                    </span>
                </div>
            </div>
            {event.reason && (
                <p className="text-sm text-text whitespace-pre-wrap pl-12">{event.reason}</p>
            )}
            {event.session_workstation && (
                <p className="text-[10px] uppercase tracking-widest text-muted pl-12">
                    at {event.session_workstation}
                    {event.session_id && ` · session #${event.session_id}`}
                </p>
            )}
        </div>
    );
}
