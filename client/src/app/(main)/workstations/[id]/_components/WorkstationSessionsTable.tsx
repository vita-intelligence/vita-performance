"use client";

import { useState } from "react";
import { WorkstationStatsSession } from "@/types/workstation";
import { useSettings } from "@/hooks/useSettings";
import { formatDate } from "@/lib/utils/date.utils";
import WorkstationSessionDetailsDrawer from "./WorkstationSessionDetailsDrawer";

interface WorkstationSessionsTableProps {
    sessions: WorkstationStatsSession[];
}

export default function WorkstationSessionsTable({ sessions }: WorkstationSessionsTableProps) {
    const { settings } = useSettings();
    const [detailsSession, setDetailsSession] = useState<WorkstationStatsSession | null>(null);

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted whitespace-nowrap">
                    Recent Sessions
                </h2>
                <div className="h-px bg-border flex-1" />
            </div>

            {!sessions.length ? (
                <div className="flex items-center justify-center py-12 border border-dashed border-border">
                    <p className="text-muted text-xs uppercase tracking-widest">No sessions</p>
                </div>
            ) : (
                <div className="border border-border overflow-hidden">
                    <table className="w-full text-sm table-fixed">
                        <thead>
                            <tr className="border-b border-border bg-surface">
                                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted w-[20%]">Date</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted w-[25%]">Workers</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted w-[20%]">Item</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted w-[15%]">Performance</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted w-[20%]">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sessions.map((session, index) => (
                                <tr
                                    key={session.id}
                                    onClick={() => setDetailsSession(session)}
                                    className={`border-b border-border hover:bg-surface transition-colors cursor-pointer ${index % 2 === 0 ? "bg-background" : "bg-surface/50"
                                        }`}
                                >
                                    <td className="px-4 py-3 text-muted truncate">
                                        {formatDate(session.date, settings)}
                                    </td>
                                    <td className="px-4 py-3 text-text truncate" title={session.worker_names.join(", ")}>
                                        {session.worker_names.join(", ")}
                                    </td>
                                    <td className="px-4 py-3 text-muted truncate">{session.item_name || "—"}</td>
                                    <td className="px-4 py-3">
                                        {session.performance_percentage !== null ? (
                                            <span className={`text-xs font-semibold ${session.performance_percentage >= 100
                                                ? "text-success"
                                                : session.performance_percentage >= 75
                                                    ? "text-secondary"
                                                    : "text-error"
                                                }`}>
                                                {session.performance_percentage}%
                                            </span>
                                        ) : "—"}
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
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <WorkstationSessionDetailsDrawer
                session={detailsSession}
                onClose={() => setDetailsSession(null)}
            />
        </div>
    );
}
