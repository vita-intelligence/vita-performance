"use client";

import { useState, useMemo } from "react";
import { WorkSession } from "@/types/session";
import { useSessions } from "@/hooks/useSessions";
import { useSettings } from "@/hooks/useSettings";
import { formatDate, formatTime } from "@/lib/utils/date.utils";
import { formatCurrency, formatNumber } from "@/lib/utils/number.utils";
import WorkerTags from "@/components/shared/WorkerTags";
import SessionFormsDrawer from "@/components/shared/SessionFormsDrawer";
import { ClipboardList } from "lucide-react";

interface SessionCardsProps {
    sessions: WorkSession[];
    onEdit: (session: WorkSession) => void;
}

function getDateKey(dateStr: string): string {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDateLabel(dateKey: string, settings: Parameters<typeof formatDate>[1]): string {
    const today = new Date();
    const todayKey = getDateKey(today.toISOString());

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = getDateKey(yesterday.toISOString());

    if (dateKey === todayKey) return "Today";
    if (dateKey === yesterdayKey) return "Yesterday";

    return formatDate(dateKey, settings);
}

function formatTimePerUnit(session: WorkSession): string | null {
    if (!session.duration_hours || !session.quantity_produced || session.quantity_produced === 0) return null;
    const totalMinutes = session.duration_hours * 60;
    const minutesPerUnit = totalMinutes / session.quantity_produced;

    if (minutesPerUnit < 1) {
        const secondsPerUnit = minutesPerUnit * 60;
        return `${secondsPerUnit.toFixed(1)}s/unit`;
    }
    return `${minutesPerUnit.toFixed(1)}min/unit`;
}

export default function SessionCards({ sessions, onEdit }: SessionCardsProps) {
    const { deleteSession, isDeleting } = useSessions();
    const { settings } = useSettings();
    const [formsSessionId, setFormsSessionId] = useState<number | null>(null);

    const groupedSessions = useMemo(() => {
        const groups: { dateKey: string; sessions: WorkSession[] }[] = [];
        let currentKey = "";

        for (const session of sessions) {
            const key = getDateKey(session.start_time);
            if (key !== currentKey) {
                currentKey = key;
                groups.push({ dateKey: key, sessions: [session] });
            } else {
                groups[groups.length - 1].sessions.push(session);
            }
        }

        return groups;
    }, [sessions]);

    return (
        <>
            <div className="flex flex-col gap-4 md:hidden">
                {groupedSessions.map((group, groupIndex) => (
                    <div key={group.dateKey} className="flex flex-col gap-4">
                        {/* Day separator */}
                        <div className={`flex items-center gap-3 ${groupIndex > 0 ? "mt-4 pt-4 border-t-2 border-border" : ""}`}>
                            <span className="text-xs font-semibold uppercase tracking-widest text-muted">
                                {getDateLabel(group.dateKey, settings)}
                            </span>
                            <div className="flex-1 border-t border-border" />
                        </div>

                        {group.sessions.map((session) => {
                            const timePerUnit = formatTimePerUnit(session);
                            return (
                                <div key={session.id} className="border border-border bg-background p-4 flex flex-col gap-4">

                                    {/* Header */}
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex flex-col gap-1">
                                            <WorkerTags workers={session.workers} />
                                            <p className="text-xs text-muted">{session.workstation_name}</p>
                                            {timePerUnit && (
                                                <p className="text-xs text-muted">{timePerUnit}</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className={`text-xs font-semibold uppercase tracking-widest px-2 py-1 border ${session.status === "verified"
                                                ? "border-success text-success"
                                                : "border-warning text-warning"
                                                }`}>
                                                {session.status === "verified" ? "Verified" : "QC Pending"}
                                            </span>
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
                                        {session.quantity_rejected !== null && session.quantity_rejected !== undefined && (
                                            <div className="flex flex-col gap-1">
                                                <p className="text-xs font-semibold uppercase tracking-widest text-muted">Rejected</p>
                                                <p className="text-sm text-error">
                                                    {formatNumber(Number(session.quantity_rejected), settings)}
                                                </p>
                                            </div>
                                        )}
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
                                            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Time</p>
                                            <p className="text-sm text-text">
                                                {formatTime(session.start_time, settings)}
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
                                            onClick={() => setFormsSessionId(session.id)}
                                            className="flex items-center justify-center gap-1.5 flex-1 text-xs font-semibold uppercase tracking-widest text-muted hover:text-text transition-colors py-2 border border-border hover:border-text"
                                        >
                                            <ClipboardList size={12} />
                                            Forms
                                        </button>
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
                            );
                        })}
                    </div>
                ))}
            </div>

            <SessionFormsDrawer
                sessionId={formsSessionId}
                onClose={() => setFormsSessionId(null)}
            />
        </>
    );
}
