"use client";

import { WorkSession } from "@/types/session";
import SessionTimer from "./SessionTimer";

interface ActiveSessionCardProps {
    session: WorkSession;
    onStop: (session: WorkSession) => void;
}

export default function ActiveSessionCard({ session, onStop }: ActiveSessionCardProps) {
    return (
        <div className="border border-border bg-background p-6 flex flex-col gap-6">

            {/* Timer */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted">Running Time</p>
                    <SessionTimer startTime={session.start_time} />
                </div>
                <div className="w-2 h-2 rounded-full bg-success animate-pulse shrink-0" />
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                <div className="flex flex-col gap-1">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted">Worker</p>
                    <p className="text-sm font-medium text-text">{session.worker_name}</p>
                </div>
                <div className="flex flex-col gap-1">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted">Workstation</p>
                    <p className="text-sm font-medium text-text">{session.workstation_name}</p>
                </div>
                <div className="flex flex-col gap-1">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted">Started At</p>
                    <p className="text-sm text-text">
                        {new Date(session.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                </div>
            </div>

            {/* Stop Button */}
            <button
                onClick={() => onStop(session)}
                className="w-full py-3 border border-error text-error text-xs font-semibold uppercase tracking-widest hover:bg-error hover:text-background transition-colors"
            >
                Stop Session
            </button>

        </div>
    );
}