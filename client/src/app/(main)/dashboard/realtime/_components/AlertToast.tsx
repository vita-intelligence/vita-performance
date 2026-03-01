"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { RealtimeAlert } from "@/types/realtime";
import { getAlertMessage } from "@/config/alerts.config";

interface AlertToastProps {
    alerts: RealtimeAlert[];
}

export default function AlertToast({ alerts }: AlertToastProps) {
    const [queue, setQueue] = useState<RealtimeAlert[]>([]);
    const [current, setCurrent] = useState<RealtimeAlert | null>(null);
    const [progress, setProgress] = useState(100);
    const toastRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const seenRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (!alerts?.length) return;
        const newAlerts = alerts.filter((a) => {
            const key = a.id || `${a.code}_${JSON.stringify(a.data)}`;
            if (seenRef.current.has(key)) return false;
            seenRef.current.add(key);
            return true;
        });
        if (newAlerts.length) setQueue((prev) => [...prev, ...newAlerts]);
    }, [alerts]);

    useEffect(() => {
        if (current || !queue.length) return;
        const [next, ...rest] = queue;
        setQueue(rest);
        setCurrent(next);
        setProgress(100);
    }, [queue, current]);

    const dismiss = () => {
        if (!toastRef.current) return;
        if (timerRef.current) clearTimeout(timerRef.current);
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

        gsap.to(overlayRef.current, { opacity: 0, duration: 0.3 });
        gsap.to(toastRef.current, {
            scale: 0.8,
            opacity: 0,
            duration: 0.4,
            ease: "power3.in",
            onComplete: () => { setCurrent(null); },
        });
    };

    useEffect(() => {
        if (!current || !toastRef.current) return;

        // Flash overlay
        gsap.fromTo(overlayRef.current,
            { opacity: 0.6 },
            { opacity: 0.15, duration: 0.8, ease: "power2.out" }
        );

        // Pop in
        gsap.fromTo(toastRef.current,
            { scale: 0.5, opacity: 0, y: 40 },
            { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: "back.out(1.7)" }
        );

        // Warning shake
        if (current.type === "warning") {
            gsap.to(toastRef.current, {
                x: 10,
                duration: 0.05,
                repeat: 7,
                yoyo: true,
                ease: "power1.inOut",
                delay: 0.5,
                onComplete: () => { gsap.set(toastRef.current, { x: 0 }); },
            });
        }

        // Milestone glitch
        if (current.type === "milestone") {
            const glitch = () => {
                gsap.to(toastRef.current, {
                    skewX: 5,
                    duration: 0.05,
                    onComplete: () => {
                        gsap.to(toastRef.current, {
                            skewX: -3,
                            duration: 0.05,
                            onComplete: () => {
                                gsap.to(toastRef.current, { skewX: 0, duration: 0.05 });
                            },
                        });
                    },
                });
            };
            glitch();
            setTimeout(glitch, 300);
            setTimeout(glitch, 600);
        }

        // Progress bar countdown
        const DURATION = 8000;
        const INTERVAL = 50;
        let elapsed = 0;
        progressIntervalRef.current = setInterval(() => {
            elapsed += INTERVAL;
            setProgress(Math.max(0, 100 - (elapsed / DURATION) * 100));
        }, INTERVAL);

        timerRef.current = setTimeout(dismiss, DURATION);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        };
    }, [current]);

    if (!current) return null;

    const styles = {
        success: {
            border: "border-success",
            text: "text-success",
            progress: "bg-success",
            label: "ACHIEVEMENT",
        },
        milestone: {
            border: "border-text",
            text: "text-text",
            progress: "bg-text",
            label: "MILESTONE",
        },
        warning: {
            border: "border-error",
            text: "text-error",
            progress: "bg-error",
            label: "WARNING",
        },
        info: {
            border: "border-muted",
            text: "text-text",
            progress: "bg-muted",
            label: "UPDATE",
        },
    };

    const s = styles[current.type] || styles.info;

    return (
        <>
            {/* Backdrop flash */}
            <div
                ref={overlayRef}
                className="fixed inset-0 z-40 bg-background pointer-events-none"
            />

            {/* Toast */}
            <div
                ref={toastRef}
                onClick={dismiss}
                className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto cursor-pointer"
            >
                <div className={`relative border-4 ${s.border} bg-background w-full max-w-2xl mx-8`}>

                    {/* Label bar */}
                    <div className={`border-b-4 ${s.border} px-8 py-3 flex items-center justify-between`}>
                        <span className={`text-xs font-black uppercase tracking-[0.3em] ${s.text}`}>
                            {s.label}
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-widest text-muted">
                            tap to dismiss
                        </span>
                    </div>

                    {/* Message */}
                    <div className="px-8 py-10 flex items-center justify-center">
                        <p className={`text-4xl font-black uppercase tracking-wider text-center leading-tight ${s.text}`}>
                            {getAlertMessage(current.code, current.data)}
                        </p>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1 w-full bg-border">
                        <div
                            ref={progressRef}
                            className={`h-full ${s.progress} transition-none`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                </div>
            </div>
        </>
    );
}