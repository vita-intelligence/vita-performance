"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { WorkerLeaderboardEntry } from "@/types/worker";

interface LeaderboardRowProps {
    entry: WorkerLeaderboardEntry;
    rank: number;
    delay: number;
}

export default function LeaderboardRow({ entry, rank, delay }: LeaderboardRowProps) {
    const barRef = useRef<HTMLDivElement>(null);
    const rowRef = useRef<HTMLDivElement>(null);

    const performance = entry.avg_performance ?? 0;
    const barWidth = Math.min(performance, 100);

    const perfColor =
        performance >= 100 ? "bg-success" :
            performance >= 75 ? "bg-secondary" :
                "bg-error";

    const perfTextColor =
        performance >= 100 ? "text-success" :
            performance >= 75 ? "text-secondary" :
                "text-error";

    useEffect(() => {
        // Row slide in
        gsap.fromTo(rowRef.current,
            { opacity: 0, x: -20 },
            { opacity: 1, x: 0, duration: 0.4, delay, ease: "power3.out" }
        );

        // Bar animate
        gsap.fromTo(barRef.current,
            { width: "0%" },
            { width: `${barWidth}%`, duration: 0.8, delay: delay + 0.2, ease: "power3.out" }
        );
    }, [delay, barWidth]);

    return (
        <div ref={rowRef} className="flex flex-col gap-2 py-5 border-b border-border last:border-0">
            <div className="flex items-center justify-between gap-4">
                {/* Rank + Name */}
                <div className="flex items-center gap-4">
                    <span className={`text-xs font-black uppercase tracking-widest w-6 shrink-0 ${rank === 1 ? "text-success" : "text-muted"
                        }`}>
                        #{rank}
                    </span>
                    <p className={`font-black text-sm uppercase tracking-wide ${rank === 1 ? "text-success" : "text-text"
                        }`}>
                        {entry.name}
                    </p>
                </div>

                {/* Right side: sessions + performance */}
                <div className="flex items-center gap-6 shrink-0">
                    <span className="text-xs text-muted uppercase tracking-widest hidden sm:block">
                        {entry.sessions_count} {entry.sessions_count === 1 ? "session" : "sessions"}
                    </span>
                    <span className={`text-2xl font-black tabular-nums ${entry.avg_performance === null ? "text-muted" : perfTextColor
                        }`}>
                        {entry.avg_performance !== null ? `${entry.avg_performance}%` : "—"}
                    </span>
                </div>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-4">
                <div className="w-6 shrink-0" /> {/* spacer for rank alignment */}
                <div className="flex-1 h-0.5 bg-border">
                    <div
                        ref={barRef}
                        className={`h-full ${perfColor}`}
                        style={{ width: 0 }}
                    />
                </div>
            </div>
        </div>
    );
}