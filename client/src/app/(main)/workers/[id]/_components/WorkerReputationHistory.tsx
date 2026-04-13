"use client";

import { WorkerReputationEvent, ReputationEventType } from "@/types/worker";

interface WorkerReputationHistoryProps {
    events: WorkerReputationEvent[];
}

const EVENT_LABELS: Record<ReputationEventType, string> = {
    auto_perf_excellent: "Excellent performance",
    auto_perf_high: "High performance",
    auto_perf_low: "Low performance",
    auto_perf_very_low: "Very low performance",
    manual_positive: "Positive feedback",
    manual_negative: "Negative feedback",
};

function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "2-digit" }) +
        " " +
        d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export default function WorkerReputationHistory({ events }: WorkerReputationHistoryProps) {
    if (!events.length) {
        return (
            <div className="border border-dashed border-border p-6 flex items-center justify-center">
                <p className="text-xs uppercase tracking-widest text-muted">No reputation events yet</p>
            </div>
        );
    }

    return (
        <div className="border border-border flex flex-col divide-y divide-border max-h-96 overflow-y-auto">
            {events.map((event) => {
                const positive = event.score_delta > 0;
                return (
                    <div key={event.id} className="px-4 py-3 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between gap-3">
                            <span
                                className={`text-xs font-black uppercase tracking-widest px-2 py-0.5 border ${positive
                                    ? "border-success text-success"
                                    : "border-error text-error"
                                    }`}
                            >
                                {positive ? "+" : ""}
                                {event.score_delta}
                            </span>
                            <span className="text-xs uppercase tracking-widest text-muted shrink-0">
                                {formatDate(event.created_at)}
                            </span>
                        </div>
                        <p className="text-sm font-semibold text-text">
                            {EVENT_LABELS[event.event_type]}
                        </p>
                        {event.reason && (
                            <p className="text-xs text-muted whitespace-pre-wrap">{event.reason}</p>
                        )}
                        {(event.session_workstation || event.created_by) && (
                            <p className="text-[10px] uppercase tracking-widest text-muted">
                                {event.session_workstation && `at ${event.session_workstation}`}
                                {event.session_workstation && event.created_by && " · "}
                                {event.created_by && `by ${event.created_by}`}
                            </p>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
