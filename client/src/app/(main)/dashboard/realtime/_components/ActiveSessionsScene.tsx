import { RealtimeSession } from "@/types/realtime";
import SessionTimer from "@/app/(main)/sessions/active/_components/SessionTimer";

interface ActiveSessionsSceneProps {
    sessions: RealtimeSession[];
}

export default function ActiveSessionsScene({ sessions }: ActiveSessionsSceneProps) {
    return (
        <div className="flex flex-col gap-6 h-full">
            <div className="flex items-center gap-4">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted whitespace-nowrap">
                    Active Sessions
                </h2>
                <div className="h-px bg-border flex-1" />
                <span className="text-xs font-semibold uppercase tracking-widest text-muted">
                    {sessions.length} running
                </span>
            </div>

            {!sessions.length ? (
                <div className="flex-1 flex items-center justify-center border border-dashed border-border">
                    <p className="text-muted text-sm uppercase tracking-widest">No active sessions</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {sessions.map((session) => (
                        <div
                            key={session.id}
                            className="border border-border bg-background p-5 flex flex-col gap-4"
                        >
                            {/* Timer */}
                            <div className="flex items-center justify-between gap-2">
                                <SessionTimer startTime={session.start_time} />
                                <div className="w-2 h-2 rounded-full bg-success animate-pulse shrink-0" />
                            </div>

                            {/* Details */}
                            <div className="flex flex-col gap-2 border-t border-border pt-4">
                                <div className="flex flex-col gap-0.5">
                                    <p className="text-xs font-semibold uppercase tracking-widest text-muted">Worker</p>
                                    <p className="text-sm font-semibold text-text">{session.worker_name}</p>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <p className="text-xs font-semibold uppercase tracking-widest text-muted">Workstation</p>
                                    <p className="text-sm text-text">{session.workstation_name}</p>
                                </div>
                                {session.item_name && (
                                    <div className="flex flex-col gap-0.5">
                                        <p className="text-xs font-semibold uppercase tracking-widest text-muted">Item</p>
                                        <p className="text-sm text-text">{session.item_name}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}