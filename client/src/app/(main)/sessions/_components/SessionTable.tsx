"use client";

import { useState } from "react";
import { WorkSession } from "@/types/session";
import { useSessions } from "@/hooks/useSessions";
import { useSettings } from "@/hooks/useSettings";
import { formatDateTime } from "@/lib/utils/date.utils";
import { formatNumber } from "@/lib/utils/number.utils";
import WorkerTags from "@/components/shared/WorkerTags";
import SessionFormsDrawer from "@/components/shared/SessionFormsDrawer";
import { ClipboardList } from "lucide-react";

interface SessionTableProps {
    sessions: WorkSession[];
    onEdit: (session: WorkSession) => void;
}

export default function SessionTable({ sessions, onEdit }: SessionTableProps) {
    const { deleteSession, isDeleting } = useSessions();
    const { settings } = useSettings();
    const [formsSessionId, setFormsSessionId] = useState<number | null>(null);

    return (
        <>
            <div className="hidden md:block border border-border overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                    <thead>
                        <tr className="border-b border-border bg-surface">
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Worker</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Workstation</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Item</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Duration</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Qty / Rejected</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Performance</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Date</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Status</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sessions.map((session, index) => (
                            <tr
                                key={session.id}
                                className={`border-b border-border hover:bg-surface transition-colors ${index % 2 === 0 ? "bg-background" : "bg-surface/50"}`}
                            >
                                <td className="px-4 py-3">
                                    <WorkerTags workers={session.workers ?? []} />
                                </td>
                                <td className="px-4 py-3 text-muted whitespace-nowrap">{session.workstation_name}</td>
                                <td className="px-4 py-3 text-muted max-w-[160px] truncate" title={session.item_name || undefined}>{session.item_name || "—"}</td>
                                <td className="px-4 py-3 text-text whitespace-nowrap">
                                    {session.duration_hours ? `${session.duration_hours}h` : "—"}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-text whitespace-nowrap">
                                            {session.quantity_produced
                                                ? formatNumber(Number(session.quantity_produced), settings)
                                                : "—"
                                            }
                                        </span>
                                        {session.quantity_rejected !== null && session.quantity_rejected !== undefined && (
                                            <span className="text-xs text-error whitespace-nowrap">
                                                -{formatNumber(Number(session.quantity_rejected), settings)} rejected
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
                                <td className="px-4 py-3 text-muted whitespace-nowrap">
                                    {formatDateTime(session.start_time, settings)}
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`text-xs font-semibold uppercase tracking-widest px-2 py-1 border whitespace-nowrap ${session.status === "verified"
                                        ? "border-success text-success"
                                        : "border-warning text-warning"
                                        }`}>
                                        {session.status === "verified" ? "Verified" : "QC Pending"}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3 whitespace-nowrap">
                                        <button
                                            onClick={() => setFormsSessionId(session.id)}
                                            className="text-muted hover:text-text transition-colors"
                                            title="View Forms"
                                        >
                                            <ClipboardList size={14} />
                                        </button>
                                        <button
                                            onClick={() => onEdit(session)}
                                            className="text-xs font-semibold uppercase tracking-widest text-muted hover:text-text transition-colors"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => deleteSession(session.id)}
                                            disabled={isDeleting}
                                            className="text-xs font-semibold uppercase tracking-widest text-muted hover:text-error transition-colors disabled:opacity-50"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <SessionFormsDrawer
                sessionId={formsSessionId}
                onClose={() => setFormsSessionId(null)}
            />
        </>
    );
}
