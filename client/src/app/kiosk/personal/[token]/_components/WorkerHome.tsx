"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/react";
import {
    ClipboardList,
    Clock,
    ExternalLink,
    Factory,
    Gauge,
    History as HistoryIcon,
    LogIn,
    LogOut,
    Radio,
    Sparkles,
    TrendingUp,
} from "lucide-react";
import { personalKioskService } from "@/services/personal-kiosk.service";
import { RndBadge } from "@/components/RndBadge";
import {
    ReputationTier,
    Worker,
    WorkerLiveSession,
    WorkerShift,
} from "@/types/worker";
import ClockConfirmModal from "./ClockConfirmModal";

interface WorkerHomeProps {
    token: string;
    worker: Worker;
    shift: WorkerShift | null;
    isClocking: boolean;
    onClockIn: () => void;
    onClockOut: () => void;
    onOpenPerformance: () => void;
    onOpenReputation: () => void;
    onOpenStations: () => void;
    onOpenStation: (workstationId: number) => void;
    onOpenHistory: () => void;
    onOpenJobs: () => void;
    /** Optional live reputation snapshot for the hero — parent may
     *  omit and we still render happily from the roster payload. */
    liveScore?: number;
    liveTier?: ReputationTier;
}

/**
 * Post-PIN hub. Deliberately splits identity ("this is me") from
 * clock-in ("I'm now on shift") so a worker can peek at their own
 * stats without committing to a shift. Clocking in / out is an
 * explicit button — never implicit on login.
 *
 * Layout: hero identity strip, shift-status card with primary CTA,
 * three big navigation tiles. Everything else lives on sub-screens.
 */
export default function WorkerHome({
    token,
    worker,
    shift,
    isClocking,
    onClockIn,
    onClockOut,
    onOpenPerformance,
    onOpenReputation,
    onOpenStations,
    onOpenStation,
    onOpenHistory,
    onOpenJobs,
    liveScore,
    liveTier,
}: WorkerHomeProps) {
    const score = liveScore ?? worker.reputation_score;
    const tier = liveTier ?? worker.reputation_tier;
    const gradient = TIER_GRADIENT[tier];

    // Confirm modal — prevents misclick on Clock In / Clock Out. The
    // buttons in the card open this dialog; only the modal's own
    // Clock In / Clock Out button actually fires the API.
    const [confirmMode, setConfirmMode] = useState<"in" | "out" | null>(null);
    const [nowMsForModal, setNowMsForModal] = useState(() => Date.now());
    useEffect(() => {
        if (confirmMode !== "out" || !shift) return;
        const id = setInterval(() => setNowMsForModal(Date.now()), 1000);
        return () => clearInterval(id);
    }, [confirmMode, shift]);

    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
            <HeroIdentity
                worker={worker}
                score={score}
                tier={tier}
                gradient={gradient}
            />

            <ShiftStatusCard
                shift={shift}
                isClocking={isClocking}
                onClockIn={() => setConfirmMode("in")}
                onClockOut={() => setConfirmMode("out")}
            />

            <ClockConfirmModal
                mode={confirmMode ?? "in"}
                workerName={worker.full_name}
                open={confirmMode !== null}
                isBusy={isClocking}
                elapsed={
                    confirmMode === "out" && shift
                        ? formatElapsed(nowMsForModal, shift.clocked_in_at)
                        : undefined
                }
                onCancel={() => {
                    if (!isClocking) setConfirmMode(null);
                }}
                onConfirm={() => {
                    if (confirmMode === "in") onClockIn();
                    else if (confirmMode === "out") onClockOut();
                    setConfirmMode(null);
                }}
            />

            <LiveSessionCard
                token={token}
                workerId={worker.id}
                onOpenStation={onOpenStation}
            />

            <div>
                <p className="mb-3 text-[11px] font-black uppercase tracking-widest text-muted">
                    Explore
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    <NavTile
                        title="Jobs"
                        subtitle={
                            shift
                                ? "MOs running right now"
                                : "Clock in to unlock"
                        }
                        icon={<ClipboardList className="size-6" />}
                        accent="jobs"
                        disabled={!shift}
                        onClick={onOpenJobs}
                    />
                    <NavTile
                        title="Stations"
                        subtitle={
                            shift
                                ? "Pick a station to start work"
                                : "Clock in to unlock"
                        }
                        icon={<Factory className="size-6" />}
                        accent="stations"
                        disabled={!shift}
                        onClick={onOpenStations}
                    />
                    <NavTile
                        title="Performance"
                        subtitle="14-day trend & recent sessions"
                        icon={<Gauge className="size-6" />}
                        accent="performance"
                        onClick={onOpenPerformance}
                    />
                    <NavTile
                        title="Reputation"
                        subtitle={`${score} pts — ${TIER_LABEL[tier]}`}
                        icon={<TrendingUp className="size-6" />}
                        accent="reputation"
                        onClick={onOpenReputation}
                    />
                    <NavTile
                        title="History"
                        subtitle="Shifts & sessions timeline"
                        icon={<HistoryIcon className="size-6" />}
                        accent="history"
                        onClick={onOpenHistory}
                    />
                </div>
            </div>
        </div>
    );
}

/* ================================================================== */
/*                           Sub-components                            */
/* ================================================================== */

function LiveSessionCard({
    token,
    workerId,
    onOpenStation,
}: {
    token: string;
    workerId: number;
    onOpenStation: (workstationId: number) => void;
}) {
    const [session, setSession] = useState<WorkerLiveSession | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [nowMs, setNowMs] = useState(() => Date.now());

    // Poll every 15s so the ticker feels alive without hammering the
    // BE. Also refresh whenever the tab becomes visible again so a
    // worker returning to the tablet doesn't see stale info.
    useEffect(() => {
        let cancelled = false;
        const fetchOnce = async () => {
            try {
                const res = await personalKioskService.getLiveStatus(
                    token,
                    workerId,
                );
                if (!cancelled) {
                    setSession(res.active_session);
                    setError(null);
                }
            } catch (err: unknown) {
                if (!cancelled)
                    setError(err instanceof Error ? err.message : "Load failed");
            }
        };
        void fetchOnce();
        const id = window.setInterval(fetchOnce, 15_000);
        const onVis = () => {
            if (document.visibilityState === "visible") void fetchOnce();
        };
        document.addEventListener("visibilitychange", onVis);
        return () => {
            cancelled = true;
            window.clearInterval(id);
            document.removeEventListener("visibilitychange", onVis);
        };
    }, [token, workerId]);

    // Local ticker so the elapsed clock counts up even between polls.
    useEffect(() => {
        if (!session) return;
        const id = setInterval(() => setNowMs(Date.now()), 1000);
        return () => clearInterval(id);
    }, [session]);

    if (error && !session) {
        // Silent-fail — a live-status hiccup shouldn't dominate the
        // hub. The error surfaces to Console for devs.
        return null;
    }
    if (!session) {
        return (
            <div className="rounded-3xl border border-dashed border-border bg-background p-4">
                <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-surface text-muted">
                        <Radio className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-black uppercase tracking-widest text-muted">
                            Live activity
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-text">
                            No session running right now.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const elapsed = formatElapsedShort(nowMs, session.started_at);

    return (
        <button
            type="button"
            onClick={() => {
                if (session.workstation_id != null)
                    onOpenStation(session.workstation_id);
            }}
            className="w-full text-left rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-cyan-500/10 p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.99]"
        >
            <div className="flex items-start gap-4">
                <div className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                    <Radio className="size-6" />
                    <span className="absolute -right-0.5 -top-0.5 flex size-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                        <span className="relative inline-flex size-3 rounded-full bg-emerald-500" />
                    </span>
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                        Now running · {elapsed}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                        <p className="text-lg font-black text-text truncate">
                            {session.workstation_name ?? "Unknown station"}
                        </p>
                        <RndBadge projectType={session.project_type} />
                    </div>
                    <p className="mt-0.5 text-sm text-muted truncate">
                        {session.task_label ?? "Live session"}
                    </p>
                </div>
                <span className="shrink-0 inline-flex items-center gap-1.5 rounded-2xl border-2 border-emerald-500/40 bg-background px-3 py-2 text-xs font-black text-emerald-600 dark:text-emerald-400">
                    Open
                    <ExternalLink className="size-3.5" />
                </span>
            </div>
        </button>
    );
}

function HeroIdentity({
    worker,
    score,
    tier,
    gradient,
}: {
    worker: Worker;
    score: number;
    tier: ReputationTier;
    gradient: string;
}) {
    const greeting = useGreeting();
    return (
        <div
            className={`relative overflow-hidden rounded-3xl border border-border p-6 text-white shadow-xl ${gradient}`}
        >
            <div className="absolute -right-8 -top-10 size-48 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-16 -left-10 size-56 rounded-full bg-black/10 blur-3xl" />

            <div className="relative flex items-center gap-4">
                <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl font-black backdrop-blur">
                    {initials(worker.full_name)}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
                        {greeting}
                    </p>
                    <p className="mt-0.5 truncate text-2xl font-black">
                        {worker.full_name}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-white/80">
                        {worker.group_name && (
                            <span className="rounded-full bg-white/15 px-2 py-0.5 font-semibold">
                                {worker.group_name}
                            </span>
                        )}
                        {worker.is_qa && (
                            <span className="rounded-full bg-white/15 px-2 py-0.5 font-semibold uppercase">
                                QA reviewer
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="relative mt-5 rounded-2xl bg-white/15 p-4 backdrop-blur">
                <div className="flex items-end justify-between gap-4">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">
                            Reputation
                        </p>
                        <p className="mt-1 text-3xl font-black tabular-nums">
                            {score}
                            <span className="ml-2 text-sm font-bold capitalize text-white/80">
                                {TIER_LABEL[tier]}
                            </span>
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">
                            {new Date().toLocaleDateString([], {
                                weekday: "short",
                            })}
                        </p>
                        <p className="mt-1 text-lg font-black tabular-nums">
                            {new Date().toLocaleDateString([], {
                                day: "numeric",
                                month: "short",
                            })}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ShiftStatusCard({
    shift,
    isClocking,
    onClockIn,
    onClockOut,
}: {
    shift: WorkerShift | null;
    isClocking: boolean;
    onClockIn: () => void;
    onClockOut: () => void;
}) {
    const [nowMs, setNowMs] = useState(() => Date.now());
    useEffect(() => {
        if (!shift) return;
        const id = setInterval(() => setNowMs(Date.now()), 1000);
        return () => clearInterval(id);
    }, [shift]);

    if (!shift) {
        return (
            <div className="rounded-3xl border border-dashed border-border bg-surface p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Sparkles className="size-6" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                                Not on shift
                            </p>
                            <p className="mt-0.5 text-base font-bold text-text">
                                Ready when you are.
                            </p>
                            <p className="mt-0.5 text-xs text-muted">
                                Clock in to link every session today to
                                this shift.
                            </p>
                        </div>
                    </div>
                    <Button
                        color="primary"
                        size="lg"
                        startContent={
                            !isClocking ? (
                                <LogIn className="size-5" />
                            ) : undefined
                        }
                        isLoading={isClocking}
                        onPress={onClockIn}
                        className="h-14 px-8 text-base font-bold"
                    >
                        Clock in
                    </Button>
                </div>
            </div>
        );
    }

    const elapsed = formatElapsed(nowMs, shift.clocked_in_at);
    const startedAt = new Date(shift.clocked_in_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });

    return (
        <div className="rounded-3xl border border-success/40 bg-success/5 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="relative flex size-12 items-center justify-center rounded-2xl bg-success/15 text-success">
                        <Clock className="size-6" />
                        <span className="absolute -right-0.5 -top-0.5 flex size-3">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                            <span className="relative inline-flex size-3 rounded-full bg-success" />
                        </span>
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-success">
                            On shift
                        </p>
                        <p className="mt-0.5 text-2xl font-black tabular-nums text-text">
                            {elapsed}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">
                            Clocked in at {startedAt}
                        </p>
                    </div>
                </div>
                <Button
                    color="danger"
                    variant="flat"
                    size="lg"
                    startContent={
                        !isClocking ? <LogOut className="size-5" /> : undefined
                    }
                    isLoading={isClocking}
                    onPress={onClockOut}
                    className="h-14 px-8 text-base font-bold"
                >
                    Clock out
                </Button>
            </div>
        </div>
    );
}

function NavTile({
    title,
    subtitle,
    icon,
    accent,
    onClick,
    disabled,
}: {
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    accent: "performance" | "reputation" | "stations" | "history" | "jobs";
    onClick: () => void;
    disabled?: boolean;
}) {
    const styles = {
        performance:
            "bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 hover:border-blue-500/50",
        reputation:
            "bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:border-amber-500/50",
        stations:
            "bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:border-emerald-500/50",
        history:
            "bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border-violet-500/30 text-violet-600 dark:text-violet-400 hover:border-violet-500/50",
        jobs:
            "bg-gradient-to-br from-rose-500/10 to-pink-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 hover:border-rose-500/50",
    }[accent];

    const iconBg = {
        performance: "bg-blue-500/15",
        reputation: "bg-amber-500/15",
        stations: "bg-emerald-500/15",
        history: "bg-violet-500/15",
        jobs: "bg-rose-500/15",
    }[accent];

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-disabled={disabled}
            className={`group flex min-h-32 flex-col items-start gap-3 rounded-3xl border-2 p-4 text-left transition-all sm:p-5 ${styles} ${
                disabled
                    ? "cursor-not-allowed opacity-40 grayscale hover:translate-y-0 hover:shadow-none"
                    : "hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.99]"
            }`}
        >
            <div
                className={`flex size-11 shrink-0 items-center justify-center rounded-2xl sm:size-12 ${iconBg}`}
            >
                {icon}
            </div>
            <div className="min-w-0 w-full">
                <p className="text-sm font-black text-text sm:text-base">
                    {title}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[11px] text-muted sm:text-xs">
                    {subtitle}
                </p>
            </div>
        </button>
    );
}

/* ================================================================== */
/*                            Utilities                                */
/* ================================================================== */

const TIER_LABEL: Record<ReputationTier, string> = {
    poor: "Poor",
    fair: "Fair",
    good: "Good",
    very_good: "Very good",
    excellent: "Excellent",
};

const TIER_GRADIENT: Record<ReputationTier, string> = {
    poor: "bg-gradient-to-br from-rose-600 via-red-500 to-orange-500",
    fair: "bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500",
    good: "bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-500",
    very_good: "bg-gradient-to-br from-violet-600 via-purple-500 to-fuchsia-500",
    excellent: "bg-gradient-to-br from-emerald-600 via-teal-500 to-cyan-500",
};

function useGreeting(): string {
    return useMemo(() => {
        const h = new Date().getHours();
        if (h < 5) return "Welcome back";
        if (h < 12) return "Good morning";
        if (h < 17) return "Good afternoon";
        if (h < 22) return "Good evening";
        return "Working late";
    }, []);
}

function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatElapsed(nowMs: number, clockedInIso: string): string {
    const startMs = new Date(clockedInIso).getTime();
    const seconds = Math.max(0, Math.floor((nowMs - startMs) / 1000));
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
        return `${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
    }
    return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function formatElapsedShort(nowMs: number, iso: string | null): string {
    if (!iso) return "just now";
    const startMs = new Date(iso).getTime();
    const seconds = Math.max(0, Math.floor((nowMs - startMs) / 1000));
    if (seconds < 60) return `${seconds}s`;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}
