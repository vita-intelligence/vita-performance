"use client";

import { useState, useMemo, Fragment } from "react";
import { WorkSession } from "@/types/session";
import { useSettings } from "@/hooks/useSettings";
import { formatDate, formatTime } from "@/lib/utils/date.utils";
import WorkerTags from "@/components/shared/WorkerTags";
import SessionFormsDrawer from "@/components/shared/SessionFormsDrawer";
import SessionDetailsDrawer from "./SessionDetailsDrawer";

interface SessionTableProps {
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

export default function SessionTable({ sessions, onEdit }: SessionTableProps) {
    const { settings } = useSettings();
    const [formsSessionId, setFormsSessionId] = useState<number | null>(null);
    const [detailsSession, setDetailsSession] = useState<WorkSession | null>(null);

    const handleEdit = (session: WorkSession) => {
        setDetailsSession(null);
        onEdit(session);
    };

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
            <div className="hidden md:block border border-border">
                <table className="w-full text-sm table-fixed">
                    <thead>
                        <tr className="border-b border-border bg-surface">
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted w-[22%]">Worker</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted w-[22%]">Workstation</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted w-[20%]">Performance</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted w-[18%]">Time</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted w-[18%]">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {groupedSessions.map((group, groupIndex) => (
                            <Fragment key={group.dateKey}>
                                {/* Day separator */}
                                <tr>
                                    <td colSpan={5} className={`px-4 py-2 bg-surface ${groupIndex > 0 ? "border-t-2 border-border" : ""}`}>
                                        <span className="text-xs font-semibold uppercase tracking-widest text-muted">
                                            {getDateLabel(group.dateKey, settings)}
                                        </span>
                                    </td>
                                </tr>

                                {group.sessions.map((session, index) => {
                                    const timePerUnit = formatTimePerUnit(session);
                                    return (
                                        <tr
                                            key={session.id}
                                            onClick={() => setDetailsSession(session)}
                                            className={`border-b border-border hover:bg-surface transition-colors cursor-pointer ${index % 2 === 0 ? "bg-background" : "bg-surface/50"}`}
                                        >
                                            <td className="px-4 py-3 align-top">
                                                <WorkerTags workers={session.workers ?? []} />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-text truncate" title={session.workstation_name}>
                                                        {session.workstation_name}
                                                    </span>
                                                    {timePerUnit && (
                                                        <span className="text-xs text-muted">
                                                            {timePerUnit}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {session.performance_percentage !== null ? (
                                                    <span className={`text-xs font-semibold px-2 py-1 ${session.performance_percentage >= 100
                                                        ? "text-success"
                                                        : session.performance_percentage >= 75
                                                            ? "text-secondary"
                                                            : "text-error"
                                                        }`}>
                                                        {session.performance_percentage}%
                                                    </span>
                                                ) : "—"}
                                            </td>
                                            <td className="px-4 py-3 text-muted truncate">
                                                {formatTime(session.start_time, settings)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs font-semibold uppercase tracking-widest px-2 py-1 border whitespace-nowrap ${session.status === "verified"
                                                    ? "border-success text-success"
                                                    : "border-warning text-warning"
                                                    }`}>
                                                    {session.status === "verified" ? "Verified" : "QC Pending"}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            <SessionFormsDrawer
                sessionId={formsSessionId}
                onClose={() => setFormsSessionId(null)}
            />

            <SessionDetailsDrawer
                session={detailsSession}
                onClose={() => setDetailsSession(null)}
                onEdit={handleEdit}
                onViewForms={(id) => setFormsSessionId(id)}
            />
        </>
    );
}
