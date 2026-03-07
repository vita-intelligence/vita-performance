import { WorkerStatsSession } from "@/types/worker";
import { useSettings } from "@/hooks/useSettings";
import { formatCurrency, formatNumber } from "@/lib/utils/number.utils";
import { formatDate } from "@/lib/utils/date.utils";

interface WorkerSessionsTableProps {
    sessions: WorkerStatsSession[];
}

export default function WorkerSessionsTable({ sessions }: WorkerSessionsTableProps) {
    const { settings } = useSettings();

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
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-surface">
                                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Date</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Workstation</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Item</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Duration</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Quantity</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Performance</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Wage Cost</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Workers</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sessions.map((session, index) => (
                                <tr
                                    key={session.id}
                                    className={`border-b border-border hover:bg-surface transition-colors ${index % 2 === 0 ? "bg-background" : "bg-surface/50"
                                        }`}
                                >
                                    <td className="px-4 py-3 text-muted">
                                        {formatDate(session.date, settings)}
                                    </td>
                                    <td className="px-4 py-3 text-text font-medium">
                                        {session.workstation_name}
                                    </td>
                                    <td className="px-4 py-3 text-muted">{session.item_name || "—"}</td>
                                    <td className="px-4 py-3 text-text">
                                        {session.duration_hours ? `${session.duration_hours}h` : "—"}
                                    </td>
                                    <td className="px-4 py-3 text-text">
                                        {session.quantity_produced
                                            ? formatNumber(session.quantity_produced, settings)
                                            : "—"
                                        }
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
                                        {session.wage_cost
                                            ? formatCurrency(session.wage_cost, settings)
                                            : "—"
                                        }
                                    </td>
                                    <td className="px-4 py-3 text-muted text-xs">
                                        {session.worker_count > 1
                                            ? `${session.worker_count} workers`
                                            : "Solo"
                                        }
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}