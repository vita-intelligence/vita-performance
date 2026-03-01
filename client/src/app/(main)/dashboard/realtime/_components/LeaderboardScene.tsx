import { LeaderboardEntry } from "@/types/realtime";

interface LeaderboardSceneProps {
    leaderboard: LeaderboardEntry[];
}

export default function LeaderboardScene({ leaderboard }: LeaderboardSceneProps) {
    return (
        <div className="flex flex-col gap-6 h-full">
            <div className="flex items-center gap-4">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted whitespace-nowrap">
                    Performance Leaderboard
                </h2>
                <div className="h-px bg-border flex-1" />
                <span className="text-xs font-semibold uppercase tracking-widest text-muted">Today</span>
            </div>

            {!leaderboard.length ? (
                <div className="flex-1 flex items-center justify-center border border-dashed border-border">
                    <p className="text-muted text-sm uppercase tracking-widest">No data yet</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {leaderboard.map((entry, index) => (
                        <div
                            key={entry.worker_id}
                            className={`flex items-center gap-4 p-4 border transition-colors ${index === 0
                                    ? "border-success bg-success/5"
                                    : "border-border bg-background"
                                }`}
                        >
                            {/* Rank */}
                            <div className={`w-8 h-8 flex items-center justify-center shrink-0 font-black text-sm ${index === 0
                                    ? "bg-success text-background"
                                    : index === 1
                                        ? "bg-text text-background"
                                        : index === 2
                                            ? "bg-muted text-background"
                                            : "bg-surface text-muted"
                                }`}>
                                {index + 1}
                            </div>

                            {/* Name */}
                            <p className={`flex-1 font-semibold text-sm truncate ${index === 0 ? "text-success" : "text-text"
                                }`}>
                                {entry.worker_name}
                            </p>

                            {/* Sessions */}
                            <p className="text-xs text-muted uppercase tracking-widest shrink-0">
                                {entry.sessions_count} {entry.sessions_count === 1 ? "session" : "sessions"}
                            </p>

                            {/* Performance */}
                            <div className={`text-right shrink-0 min-w-16 ${entry.avg_performance === null
                                    ? "text-muted"
                                    : entry.avg_performance >= 100
                                        ? "text-success"
                                        : entry.avg_performance >= 75
                                            ? "text-secondary"
                                            : "text-error"
                                }`}>
                                <p className="text-2xl font-black">
                                    {entry.avg_performance !== null ? `${entry.avg_performance}%` : "—"}
                                </p>
                            </div>

                            {/* Performance Bar */}
                            {entry.avg_performance !== null && (
                                <div className="w-24 h-1 bg-border shrink-0">
                                    <div
                                        className={`h-full transition-all duration-500 ${entry.avg_performance >= 100
                                                ? "bg-success"
                                                : entry.avg_performance >= 75
                                                    ? "bg-secondary"
                                                    : "bg-error"
                                            }`}
                                        style={{ width: `${Math.min(entry.avg_performance, 100)}%` }}
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}