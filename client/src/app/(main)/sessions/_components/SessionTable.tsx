"use client";

import { useState } from "react";
import { WorkSession } from "@/types/session";
import { useSettings } from "@/hooks/useSettings";
import { formatDateTime } from "@/lib/utils/date.utils";
import WorkerTags from "@/components/shared/WorkerTags";
import SessionFormsDrawer from "@/components/shared/SessionFormsDrawer";
import SessionDetailsDrawer from "./SessionDetailsDrawer";

interface SessionTableProps {
    sessions: WorkSession[];
    onEdit: (session: WorkSession) => void;
}

export default function SessionTable({ sessions, onEdit }: SessionTableProps) {
    const { settings } = useSettings();
    const [formsSessionId, setFormsSessionId] = useState<number | null>(null);
    const [detailsSession, setDetailsSession] = useState<WorkSession | null>(null);

    const handleEdit = (session: WorkSession) => {
        setDetailsSession(null);
        onEdit(session);
    };

    return (
        <>
            <div className="hidden md:block border border-border">
                <table className="w-full text-sm table-fixed">
                    <thead>
                        <tr className="border-b border-border bg-surface">
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted w-[24%]">Worker</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted w-[26%]">Item</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted w-[14%]">Performance</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted w-[18%]">Date</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted w-[18%]">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sessions.map((session, index) => (
                            <tr
                                key={session.id}
                                onClick={() => setDetailsSession(session)}
                                className={`border-b border-border hover:bg-surface transition-colors cursor-pointer ${index % 2 === 0 ? "bg-background" : "bg-surface/50"}`}
                            >
                                <td className="px-4 py-3 align-top">
                                    <WorkerTags workers={session.workers ?? []} />
                                </td>
                                <td className="px-4 py-3 text-muted truncate" title={session.item_name || undefined}>
                                    {session.item_name || "—"}
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
                            </tr>
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
