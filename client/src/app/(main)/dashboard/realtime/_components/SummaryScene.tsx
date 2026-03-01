import { RealtimeDashboardData } from "@/types/realtime";

interface SummarySceneProps {
    data: RealtimeDashboardData;
}

export default function SummaryScene({ data }: SummarySceneProps) {
    const { summary, leaderboard, workstation_statuses } = data;

    const bestWorker = leaderboard[0] || null;
    const activeWorkstations = workstation_statuses.filter((w) => w.has_active_session).length;
    const idleWorkstations = workstation_statuses.filter((w) => !w.has_active_session).length;

    const performanceColor =
        summary.avg_performance === null
            ? "text-muted"
            : summary.avg_performance >= 100
                ? "text-success"
                : summary.avg_performance >= 75
                    ? "text-secondary"
                    : "text-error";

    return (
        <div className="flex flex-col gap-6 h-full">
            <div className="flex items-center gap-4">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted whitespace-nowrap">
                    Today's Summary
                </h2>
                <div className="h-px bg-border flex-1" />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Active Sessions */}
                <div className="border border-border bg-background p-6 flex flex-col gap-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted">Active Now</p>
                    <p className="text-5xl font-black text-text">{summary.active_sessions_count}</p>
                    <p className="text-xs text-muted">sessions running</p>
                </div>

                {/* Completed Today */}
                <div className="border border-border bg-background p-6 flex flex-col gap-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted">Completed</p>
                    <p className="text-5xl font-black text-text">{summary.completed_today}</p>
                    <p className="text-xs text-muted">sessions today</p>
                </div>

                {/* Avg Performance */}
                <div className={`border bg-background p-6 flex flex-col gap-2 ${summary.avg_performance === null
                        ? "border-border"
                        : summary.avg_performance >= 100
                            ? "border-success"
                            : summary.avg_performance >= 75
                                ? "border-secondary"
                                : "border-error"
                    }`}>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted">Avg Performance</p>
                    <p className={`text-5xl font-black ${performanceColor}`}>
                        {summary.avg_performance !== null ? `${summary.avg_performance}%` : "—"}
                    </p>
                    <p className="text-xs text-muted">across all sessions</p>
                </div>

                {/* Workstations */}
                <div className="border border-border bg-background p-6 flex flex-col gap-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted">Workstations</p>
                    <p className="text-5xl font-black text-text">{activeWorkstations}</p>
                    <p className="text-xs text-muted">{idleWorkstations} idle</p>
                </div>
            </div>

            {/* Best Worker Spotlight */}
            {bestWorker && (
                <div className="border border-success bg-success/5 p-6 flex items-center gap-6">
                    <div className="w-12 h-12 bg-success flex items-center justify-center shrink-0">
                        <span className="text-background text-lg font-black">
                            {bestWorker.worker_name.charAt(0)}
                        </span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                            Top Performer Today
                        </p>
                        <p className="text-2xl font-black text-success">{bestWorker.worker_name}</p>
                    </div>
                    <div className="ml-auto text-right">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted">Performance</p>
                        <p className="text-4xl font-black text-success">
                            {bestWorker.avg_performance !== null ? `${bestWorker.avg_performance}%` : "—"}
                        </p>
                    </div>
                </div>
            )}

            {/* Workstation Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {workstation_statuses.map((w) => (
                    <div
                        key={w.id}
                        className={`border p-3 flex flex-col gap-1 ${w.has_active_session ? "border-success bg-success/5" : "border-border bg-surface"
                            }`}
                    >
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted truncate">
                            {w.name}
                        </p>
                        <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${w.has_active_session ? "bg-success animate-pulse" : "bg-border"
                                }`} />
                            <p className={`text-xs font-semibold uppercase tracking-widest ${w.has_active_session ? "text-success" : "text-muted"
                                }`}>
                                {w.has_active_session ? "Active" : "Idle"}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}