"use client";

import { WorkSession } from "@/types/session";
import { useSessions } from "@/hooks/useSessions";
import { useSettings } from "@/hooks/useSettings";

interface SessionTableProps {
    sessions: WorkSession[];
    onEdit: (session: WorkSession) => void;
}

export default function SessionTable({ sessions, onEdit }: SessionTableProps) {
    const { deleteSession, isDeleting } = useSessions();
    const { settings } = useSettings();

    return (
        <div className="hidden md:block border border-border overflow-hidden">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-border bg-surface">
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Worker</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Workstation</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Duration</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Quantity</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Performance</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Wage Cost</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Date</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {sessions.map((session, index) => (
                        <tr
                            key={session.id}
                            className={`border-b border-border hover:bg-surface transition-colors ${index % 2 === 0 ? "bg-background" : "bg-surface/50"}`}
                        >
                            <td className="px-4 py-3 font-medium text-text">{session.worker_name}</td>
                            <td className="px-4 py-3 text-muted">{session.workstation_name}</td>
                            <td className="px-4 py-3 text-text">
                                {session.duration_hours ? `${session.duration_hours}h` : "—"}
                            </td>
                            <td className="px-4 py-3 text-text">
                                {session.quantity_produced
                                    ? Number(session.quantity_produced).toLocaleString()
                                    : "—"
                                }
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
                            <td className="px-4 py-3 text-text">
                                {session.wage_cost
                                    ? `${settings?.currency_symbol}${session.wage_cost.toFixed(2)}`
                                    : "—"
                                }
                            </td>
                            <td className="px-4 py-3 text-muted">
                                {new Date(session.start_time).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
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
    );
}