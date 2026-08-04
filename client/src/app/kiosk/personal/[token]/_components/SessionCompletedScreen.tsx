"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@heroui/react";
import {
    Award,
    CheckCircle2,
    Clock,
    Package,
    Sparkles,
    TrendingUp,
} from "lucide-react";
import gsap from "gsap";
import { StationSession } from "@/types/worker";

interface SessionCompletedScreenProps {
    session: StationSession;
    onDone: () => void;
}

const AUTO_DISMISS_MS = 8000;

/**
 * Post-stop celebration overlay for the in-app station panel.
 *
 * Same theme language as the rest of the personal kiosk — gradient
 * hero, rounded-3xl surfaces, emerald/teal accent — so a worker gets
 * a consistent visual language whether they're browsing stations or
 * finishing a session.
 */
export default function SessionCompletedScreen({
    session,
    onDone,
}: SessionCompletedScreenProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const heroRef = useRef<HTMLDivElement>(null);
    const checkRef = useRef<HTMLDivElement>(null);
    const perfRef = useRef<HTMLParagraphElement>(null);
    const statsRef = useRef<HTMLDivElement>(null);
    const [secondsLeft, setSecondsLeft] = useState(
        Math.ceil(AUTO_DISMISS_MS / 1000),
    );

    useEffect(() => {
        const tl = gsap.timeline();
        tl.fromTo(
            containerRef.current,
            { opacity: 0 },
            { opacity: 1, duration: 0.3, ease: "power2.out" },
        );
        tl.fromTo(
            heroRef.current,
            { opacity: 0, y: 40, scale: 0.94 },
            { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "power3.out" },
            "-=0.15",
        );
        tl.fromTo(
            checkRef.current,
            { scale: 0, rotate: -180 },
            { scale: 1, rotate: 0, duration: 0.6, ease: "back.out(2)" },
            "-=0.35",
        );
        if (perfRef.current && session.performance_percentage !== null) {
            const target = session.performance_percentage;
            const obj = { val: 0 };
            tl.to(
                obj,
                {
                    val: target,
                    duration: 1.4,
                    ease: "power2.out",
                    onUpdate: () => {
                        if (perfRef.current) {
                            perfRef.current.textContent = `${obj.val.toFixed(0)}%`;
                        }
                    },
                },
                "-=0.15",
            );
        }
        tl.fromTo(
            statsRef.current,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" },
            "-=0.5",
        );
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
    const perfTier =
        perf === null
            ? "none"
            : perf >= 100
              ? "great"
              : perf >= 75
                ? "good"
                : "low";

    // Map the hero gradient to how the worker performed so the moment
    // reads at a glance: strong emerald for hitting target, warm amber
    // for "close but not there", muted rose for a rough session.
    const heroGradient = {
        great: "from-emerald-500 via-teal-500 to-cyan-500",
        good: "from-amber-500 via-orange-500 to-rose-500",
        low: "from-rose-500 via-pink-500 to-fuchsia-500",
        none: "from-indigo-500 via-blue-500 to-sky-500",
    }[perfTier];

    const perfLabel = {
        great: "Nailed it",
        good: "Nearly there",
        low: "Room to grow",
        none: "Session done",
    }[perfTier];

    const perfNumberColor = {
        great: "text-emerald-400",
        good: "text-amber-300",
        low: "text-rose-300",
        none: "text-white/70",
    }[perfTier];

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background"
        >
            <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-6">
                {/* Hero — full-width gradient card matching StationHero's
                    silhouette so the flow feels continuous. */}
                <div
                    ref={heroRef}
                    className={`relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br ${heroGradient} p-8 text-white shadow-2xl`}
                >
                    <div className="absolute -right-10 -top-14 size-56 rounded-full bg-white/15 blur-3xl" />
                    <div className="absolute -left-8 -bottom-10 size-48 rounded-full bg-white/10 blur-3xl" />

                    <div className="relative flex flex-col items-center gap-5 text-center">
                        <div
                            ref={checkRef}
                            className="relative flex size-20 items-center justify-center rounded-3xl bg-white/20 backdrop-blur"
                        >
                            <CheckCircle2 className="size-12" strokeWidth={2} />
                            <span className="absolute -right-1 -top-1">
                                <Sparkles className="size-5 text-white/90" />
                            </span>
                        </div>

                        <div className="flex flex-col items-center gap-1">
                            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/80">
                                {perfLabel}
                            </p>
                            {session.worker_name && (
                                <p className="text-3xl font-black tracking-tight">
                                    {session.worker_name}
                                </p>
                            )}
                        </div>

                        {perf !== null ? (
                            <div className="flex flex-col items-center gap-1">
                                <p
                                    ref={perfRef}
                                    className={`font-mono text-7xl font-black leading-none tracking-tight ${perfNumberColor}`}
                                >
                                    0%
                                </p>
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/70">
                                    Performance
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-1">
                                <p className="font-mono text-6xl font-black leading-none tracking-tight text-white/60">
                                    —
                                </p>
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/70">
                                    No target set
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Stats — three flat cards that match the SopCard /
                    OperationDescriptionCard visual language. */}
                <div
                    ref={statsRef}
                    className="grid grid-cols-1 gap-3 sm:grid-cols-3"
                >
                    <StatCard
                        icon={<Clock className="size-5" />}
                        label="Duration"
                        value={
                            session.duration_hours !== null
                                ? `${session.duration_hours}h`
                                : "—"
                        }
                    />
                    <StatCard
                        icon={<TrendingUp className="size-5" />}
                        label="Quantity"
                        value={
                            session.quantity_produced !== null
                                ? `${session.quantity_produced}`
                                : "—"
                        }
                        sublabel={session.workstation_uom || undefined}
                    />
                    <StatCard
                        icon={<Package className="size-5" />}
                        label={session.item_name ? "Item" : "Task"}
                        value={
                            session.item_name ??
                            session.activity_label ??
                            "Generic session"
                        }
                        emphasise={!!session.item_name}
                    />
                </div>

                {session.workstation_name && (
                    <div className="flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted">
                        <Award className="size-3.5" />
                        {session.workstation_name}
                    </div>
                )}
            </div>

            {/* Sticky bottom bar with the countdown-primary action —
                mirrors FullscreenReader's action bar so the operator's
                thumb knows exactly where to land. */}
            <div className="sticky bottom-0 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur">
                <div className="mx-auto max-w-3xl">
                    <Button
                        color="primary"
                        size="lg"
                        onPress={onDone}
                        className="h-14 w-full text-base font-black"
                    >
                        Done · {secondsLeft}s
                    </Button>
                </div>
            </div>
        </div>
    );
}

function StatCard({
    icon,
    label,
    value,
    sublabel,
    emphasise,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    sublabel?: string;
    emphasise?: boolean;
}) {
    return (
        <div className="rounded-3xl border border-border bg-surface p-4">
            <div className="flex items-center gap-2 text-muted">
                <div className="flex size-8 items-center justify-center rounded-xl bg-background text-primary">
                    {icon}
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest">
                    {label}
                </p>
            </div>
            <p
                className={`mt-3 truncate font-black tabular-nums text-text ${
                    emphasise ? "text-lg" : "text-2xl"
                }`}
                title={value}
            >
                {value}
            </p>
            {sublabel && (
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted">
                    {sublabel}
                </p>
            )}
        </div>
    );
}
