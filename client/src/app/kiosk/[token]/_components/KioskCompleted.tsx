"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@heroui/react";
import { CheckCircle2 } from "lucide-react";
import gsap from "gsap";
import { KioskCompletedSession } from "@/types/kiosk";

interface KioskCompletedProps {
    session: KioskCompletedSession;
    onDone: () => void;
}

const AUTO_DISMISS_MS = 8000;

export default function KioskCompleted({ session, onDone }: KioskCompletedProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const checkRef = useRef<HTMLDivElement>(null);
    const perfRef = useRef<HTMLParagraphElement>(null);
    const [secondsLeft, setSecondsLeft] = useState(Math.ceil(AUTO_DISMISS_MS / 1000));

    useEffect(() => {
        const tl = gsap.timeline();
        tl.fromTo(containerRef.current,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }
        );
        tl.fromTo(checkRef.current,
            { scale: 0, rotate: -90 },
            { scale: 1, rotate: 0, duration: 0.5, ease: "back.out(1.8)" },
            "-=0.2"
        );
        if (perfRef.current && session.performance_percentage !== null) {
            const target = session.performance_percentage;
            const obj = { val: 0 };
            tl.to(obj, {
                val: target,
                duration: 1.2,
                ease: "power2.out",
                onUpdate: () => {
                    if (perfRef.current) perfRef.current.textContent = `${obj.val.toFixed(0)}%`;
                },
            }, "-=0.1");
        }
    }, [session.performance_percentage]);

    useEffect(() => {
        const timer = setTimeout(onDone, AUTO_DISMISS_MS);
        const interval = setInterval(() => {
            setSecondsLeft((s) => Math.max(0, s - 1));
        }, 1000);
        return () => {
            clearTimeout(timer);
            clearInterval(interval);
        };
    }, [onDone]);

    const perf = session.performance_percentage;
    const perfColor = perf === null
        ? "text-muted"
        : perf >= 100
            ? "text-success"
            : perf >= 75
                ? "text-secondary"
                : "text-error";

    return (
        <div ref={containerRef} className="flex flex-col h-full bg-background">
            <div className="flex-1 flex flex-col items-center justify-center gap-6 sm:gap-10 p-6">
                <div ref={checkRef} className="text-success">
                    <CheckCircle2 size={96} strokeWidth={1.5} />
                </div>

                <div className="flex flex-col items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted">Session Completed</p>
                    <p className="text-2xl sm:text-4xl font-black text-text uppercase text-center">
                        {session.worker_name}
                    </p>
                </div>

                <div className="flex flex-col items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted">Performance</p>
                    {perf !== null ? (
                        <p ref={perfRef} className={`font-mono text-6xl sm:text-8xl font-black tracking-widest ${perfColor}`}>
                            0%
                        </p>
                    ) : (
                        <p className="font-mono text-6xl sm:text-8xl font-black tracking-widest text-muted">
                            —
                        </p>
                    )}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 pt-4">
                    {session.duration_hours !== null && (
                        <div className="flex flex-col items-center gap-1">
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Duration</p>
                            <p className="text-xl sm:text-2xl font-black text-text">{session.duration_hours}h</p>
                        </div>
                    )}
                    {session.quantity_produced !== null && (
                        <div className="flex flex-col items-center gap-1">
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Quantity</p>
                            <p className="text-xl sm:text-2xl font-black text-text">
                                {session.quantity_produced} {session.uom || "units"}
                            </p>
                        </div>
                    )}
                    {session.item_name && (
                        <div className="flex flex-col items-center gap-1">
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Item</p>
                            <p className="text-xl sm:text-2xl font-black text-text uppercase">{session.item_name}</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-4 border-t border-border shrink-0">
                <Button
                    onPress={onDone}
                    className="w-full h-12 sm:h-14 bg-text text-background text-sm font-black uppercase tracking-widest hover:opacity-80 rounded-none"
                >
                    Done ({secondsLeft})
                </Button>
            </div>
        </div>
    );
}
