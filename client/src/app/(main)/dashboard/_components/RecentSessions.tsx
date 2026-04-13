"use client";

import { useState } from "react";
import { DashboardOverview } from "@/types/dashboard";
import { useSettings } from "@/hooks/useSettings";
import { formatCurrency } from "@/lib/utils/number.utils";
import { formatDate, formatTime } from "@/lib/utils/date.utils";
import Link from "next/link";
import RecentSessionDetailsDrawer from "./RecentSessionDetailsDrawer";

type RecentSession = DashboardOverview["recent_sessions"][number];

interface RecentSessionsProps {
    overview: DashboardOverview;
}

export default function RecentSessions({ overview }: RecentSessionsProps) {
    const { settings } = useSettings();
    const [detailsSession, setDetailsSession] = useState<RecentSession | null>(null);

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-muted whitespace-nowrap">
                        Recent Sessions
                    </h2>
                    <div className="h-px bg-border flex-1" />
                </div>
                <Link
                    href="/sessions"
                    className="text-xs font-semibold uppercase tracking-widest text-muted hover:text-text transition-colors shrink-0"
                >
                    View All
                </Link>
            </div>

            {!overview.recent_sessions.length ? (
                <div className="flex items-center justify-center py-12 border border-dashed border-border">
                    <p className="text-muted text-sm uppercase tracking-widest">No sessions yet</p>
                </div>
            ) : (
                <>
                    {/* Desktop Table */}
                    <div className="hidden md:block border border-border overflow-hidden">
                        <table className="w-full text-sm table-fixed">
                            <thead>
                                <tr className="border-b border-border bg-surface">
                                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted w-[25%]">Worker</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted w-[25%]">Workstation</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted w-[15%]">Performance</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted w-[20%]">Date</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted w-[15%]">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {overview.recent_sessions.map((session, index) => (
                                    <tr
                                        key={session.id}
                                        onClick={() => setDetailsSession(session)}
                                        className={`border-b border-border hover:bg-surface transition-colors cursor-pointer ${index % 2 === 0 ? "bg-background" : "bg-surface/50"}`}
                                    >
                                        <td className="px-4 py-3 font-medium text-text truncate">{session.worker_names.join(", ")}</td>
                                        <td className="px-4 py-3 text-muted truncate">{session.workstation_name}</td>
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
                                        <td className="px-4 py-3 text-muted truncate">
                                            {formatDate(session.start_time, settings)} {formatTime(session.start_time, settings)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs font-semibold uppercase tracking-widest px-2 py-1 border whitespace-nowrap ${session.status === "verified"
                                                ? "border-success text-success"
                                                : session.status === "completed"
                                                    ? "border-warning text-warning"
                                                    : "border-border text-muted"
                                                }`}>
                                                {session.status === "verified" ? "Verified" : session.status === "completed" ? "QC Pending" : session.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="flex flex-col gap-3 md:hidden">
                        {overview.recent_sessions.map((session) => (
                            <button
                                key={session.id}
                                onClick={() => setDetailsSession(session)}
                                className="border border-border bg-background p-4 flex flex-col gap-3 text-left hover:bg-surface transition-colors"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex flex-col gap-1">
                                        <p className="font-semibold text-text text-sm">{session.worker_names.join(", ")}</p>
                                        <p className="text-xs text-muted">{session.workstation_name}</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className={`text-xs font-semibold uppercase tracking-widest px-2 py-1 border ${session.status === "verified"
                                            ? "border-success text-success"
                                            : session.status === "completed"
                                                ? "border-warning text-warning"
                                                : "border-border text-muted"
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
                                <div className="grid grid-cols-2 gap-2 border-t border-border pt-3">
                                    <div className="flex flex-col gap-1">
                                        <p className="text-xs font-semibold uppercase tracking-widest text-muted">Duration</p>
                                        <p className="text-sm text-text">{session.duration_hours ? `${session.duration_hours}h` : "—"}</p>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <p className="text-xs font-semibold uppercase tracking-widest text-muted">Wage Cost</p>
                                        <p className="text-sm text-text">{session.wage_cost ? formatCurrency(session.wage_cost, settings) : "—"}</p>
                                    </div>
                                    <div className="flex flex-col gap-1 col-span-2">
                                        <p className="text-xs font-semibold uppercase tracking-widest text-muted">Date</p>
                                        <p className="text-sm text-text">
                                            {formatDate(session.start_time, settings)} {formatTime(session.start_time, settings)}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </>
            )}

            <RecentSessionDetailsDrawer
                session={detailsSession}
                onClose={() => setDetailsSession(null)}
            />
        </div>
    );
}
