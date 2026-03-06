"use client";

import { useState } from "react";
import { WorkSession } from "@/types/session";
import { useSessions } from "@/hooks/useSessions";
import { useSettings } from "@/hooks/useSettings";
import { formatDate } from "@/lib/utils/date.utils";
import { formatCurrency, formatNumber } from "@/lib/utils/number.utils";
import WorkerTags from "@/components/shared/WorkerTags";

interface SessionCardsProps {
    sessions: WorkSession[];
    onEdit: (session: WorkSession) => void;
}

export default function SessionCards({ sessions, onEdit }: SessionCardsProps) {
    const { deleteSession, isDeleting } = useSessions();
    const { settings } = useSettings();

    return (
        <div className="flex flex-col gap-4 md:hidden">
            {sessions.map((session) => (
                <div key={session.id} className="border border-border bg-background p-4 flex flex-col gap-4">

                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex flex-col gap-1">
                            <WorkerTags workers={session.workers} />
                            <p className="text-xs text-muted">{session.workstation_name}</p>
                        </div>
                        {session.performance_percentage !== null && (
                            <span className={`text-xs font-semibold px-2 py-1 border shrink-0 ${session.performance_percentage >= 100
                                ? "border-success text-success"
                                : session.performance_percentage >= 75
                                    ? "border-secondary text-secondary"
                                    : "border-error text-error"
                                }`}>
                                {session.performance_percentage}%
                            </span>
                        )}
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
                        <div className="flex flex-col gap-1">
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Duration</p>
                            <p className="text-sm text-text">
                                {session.duration_hours ? `${session.duration_hours}h` : "—"}
                            </p>
                        </div>
                        <div className="flex flex-col gap-1">
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Quantity</p>
                            <p className="text-sm text-text">
                                {session.quantity_produced
                                    ? formatNumber(Number(session.quantity_produced), settings)
                                    : "—"
                                }
                            </p>
                        </div>
                        <div className="flex flex-col gap-1">
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Wage Cost</p>
                            <p className="text-sm text-text">
                                {session.wage_cost
                                    ? formatCurrency(session.wage_cost, settings)
                                    : "—"
                                }
                            </p>
                        </div>
                        <div className="flex flex-col gap-1">
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Date</p>
                            <p className="text-sm text-text">
                                {formatDate(session.start_time, settings)}
                            </p>
                        </div>
                        {session.notes && (
                            <div className="flex flex-col gap-1 col-span-2">
                                <p className="text-xs font-semibold uppercase tracking-widest text-muted">Notes</p>
                                <p className="text-sm text-text">{session.notes}</p>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 border-t border-border pt-4">
                        <button
                            onClick={() => onEdit(session)}
                            className="flex-1 text-xs font-semibold uppercase tracking-widest text-muted hover:text-text transition-colors py-2 border border-border hover:border-text"
                        >
                            Edit
                        </button>
                        <button
                            onClick={() => deleteSession(session.id)}
                            disabled={isDeleting}
                            className="flex-1 text-xs font-semibold uppercase tracking-widest text-muted hover:text-error transition-colors py-2 border border-border hover:border-error disabled:opacity-50"
                        >
                            Delete
                        </button>
                    </div>

                </div>
            ))}
        </div>
    );
}