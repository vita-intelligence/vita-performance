import { DashboardOverview } from "@/types/dashboard";
import { useSettings } from "@/hooks/useSettings";
import { formatCurrency } from "@/lib/utils/number.utils";
import { formatDate, formatTime } from "@/lib/utils/date.utils";
import Link from "next/link";

interface RecentSessionsProps {
    overview: DashboardOverview;
}

export default function RecentSessions({ overview }: RecentSessionsProps) {
    const { settings } = useSettings();

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
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-surface">
                                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Worker</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Workstation</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Duration</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Performance</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Wage Cost</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {overview.recent_sessions.map((session, index) => (
                                    <tr
                                        key={session.id}
                                        className={`border-b border-border hover:bg-surface transition-colors ${index % 2 === 0 ? "bg-background" : "bg-surface/50"}`}
                                    >
                                        <td className="px-4 py-3 font-medium text-text">{session.worker_names.join(", ")}</td>
                                        <td className="px-4 py-3 text-muted">{session.workstation_name}</td>
                                        <td className="px-4 py-3 text-text">
                                            {session.duration_hours ? `${session.duration_hours}h` : "—"}
                                        </td>
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
                                        <td className="px-4 py-3 text-text">
                                            {session.wage_cost ? formatCurrency(session.wage_cost, settings) : "—"}
                                        </td>
                                        <td className="px-4 py-3 text-muted">
                                            {formatDate(session.start_time, settings)} {formatTime(session.start_time, settings)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="flex flex-col gap-3 md:hidden">
                        {overview.recent_sessions.map((session) => (
                            <div key={session.id} className="border border-border bg-background p-4 flex flex-col gap-3">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex flex-col gap-1">
                                        <p className="font-semibold text-text text-sm">{session.worker_names.join(", ")}</p>
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
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}