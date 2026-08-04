"use client";

import { useEffect, useState } from "react";
import {
    Award,
    Loader2,
    Minus,
    Plus,
    Sparkles,
    TrendingDown,
    TrendingUp,
} from "lucide-react";
import { personalKioskService } from "@/services/personal-kiosk.service";
import {
    ReputationTier,
    WorkerReputationEventLite,
    WorkerReputationPayload,
} from "@/types/worker";

interface ReputationPageProps {
    token: string;
    workerId: number;
    workerName: string;
}

/**
 * Full-page reputation view — hero with tier + progress-to-next,
 * event timeline with per-row delta chips. Score is a computed
 * projection of events; workers can't edit it, so this screen is
 * read-only end to end.
 */
export default function ReputationPage({
    token,
    workerId,
    workerName,
}: ReputationPageProps) {
    const [data, setData] = useState<WorkerReputationPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        personalKioskService
            .getReputation(token, workerId)
            .then((res) => {
                if (!cancelled) {
                    setData(res);
                    setError(null);
                }
            })
            .catch((err) => {
                if (!cancelled) setError(getMsg(err));
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [token, workerId]);

    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
            <SectionIntro
                title="Reputation"
                subtitle={`${workerName}'s trust score over time`}
            />

            {loading && (
                <div className="flex items-center justify-center gap-2 rounded-3xl border border-border bg-surface p-16 text-sm text-muted">
                    <Loader2 className="size-4 animate-spin" />
                    Loading reputation…
                </div>
            )}

            {error && !loading && (
                <div className="rounded-3xl border border-danger/40 bg-danger/5 p-6 text-sm text-danger">
                    Couldn’t load reputation: {error}
                </div>
            )}

            {data && !loading && !error && (
                <>
                    <ReputationHero data={data} />
                    <TierLadder tier={data.tier} />
                    <EventsCard events={data.recent_events} />
                </>
            )}
        </div>
    );
}

/* ================================================================== */

function SectionIntro({
    title,
    subtitle,
}: {
    title: string;
    subtitle: string;
}) {
    return (
        <div>
            <h1 className="text-2xl font-black text-text">{title}</h1>
            <p className="mt-0.5 text-xs text-muted">{subtitle}</p>
        </div>
    );
}

function ReputationHero({ data }: { data: WorkerReputationPayload }) {
    const gradient = TIER_GRADIENT[data.tier];
    const tierMin = TIER_MIN[data.tier];
    const tierMax = data.next_tier ? TIER_MIN[data.next_tier] : SCORE_MAX;
    const range = Math.max(1, tierMax - tierMin);
    const filled = Math.min(1, Math.max(0, (data.score - tierMin) / range));
    const pct = Math.round(filled * 100);

    return (
        <div
            className={`relative overflow-hidden rounded-3xl border border-border p-6 text-white shadow-xl ${gradient}`}
        >
            <div className="absolute -right-10 -top-12 size-56 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-16 -left-14 size-72 rounded-full bg-black/10 blur-3xl" />

            <div className="relative flex items-center gap-4">
                <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
                    <Award className="size-8" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
                        Current tier
                    </p>
                    <p className="mt-0.5 text-3xl font-black capitalize">
                        {TIER_LABEL[data.tier]}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
                        Score
                    </p>
                    <p className="mt-0.5 text-4xl font-black tabular-nums">
                        {data.score}
                    </p>
                </div>
            </div>

            <div className="relative mt-6">
                <div className="flex items-baseline justify-between text-xs text-white/85">
                    <span className="font-semibold uppercase tracking-wider text-white/70">
                        Progress
                    </span>
                    {data.next_tier ? (
                        <span>
                            <span className="font-black tabular-nums">
                                {data.points_to_next}
                            </span>{" "}
                            pts to{" "}
                            <span className="font-bold capitalize">
                                {TIER_LABEL[data.next_tier]}
                            </span>
                        </span>
                    ) : (
                        <span className="font-semibold">Top tier reached</span>
                    )}
                </div>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/20">
                    <div
                        className="h-full rounded-full bg-white/85 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                    />
                </div>
                <div className="mt-1 flex justify-between text-[10px] font-semibold text-white/70">
                    <span>{tierMin}</span>
                    <span>{tierMax}</span>
                </div>
            </div>
        </div>
    );
}

function TierLadder({ tier }: { tier: ReputationTier }) {
    const tiers: ReputationTier[] = [
        "poor",
        "fair",
        "good",
        "very_good",
        "excellent",
    ];
    return (
        <div className="rounded-3xl border border-border bg-surface p-5">
            <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-text">
                Tier ladder
            </h2>
            <div className="grid grid-cols-5 gap-2">
                {tiers.map((t) => {
                    const active = t === tier;
                    const passed = tiers.indexOf(t) <= tiers.indexOf(tier);
                    return (
                        <div
                            key={t}
                            className={`flex flex-col items-center gap-1 rounded-2xl border-2 p-2 text-center transition-colors ${
                                active
                                    ? "border-primary bg-primary/10"
                                    : passed
                                      ? "border-border bg-background"
                                      : "border-dashed border-border bg-background opacity-50"
                            }`}
                        >
                            <div
                                className={`flex size-8 items-center justify-center rounded-full text-white ${TIER_BADGE[t]}`}
                            >
                                <Sparkles className="size-4" />
                            </div>
                            <p
                                className={`text-[10px] font-bold uppercase tracking-wider ${
                                    active ? "text-primary" : "text-muted"
                                }`}
                            >
                                {TIER_LABEL[t]}
                            </p>
                            <p className="text-[10px] tabular-nums text-muted">
                                {TIER_MIN[t]}+
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function EventsCard({ events }: { events: WorkerReputationEventLite[] }) {
    return (
        <div className="rounded-3xl border border-border bg-surface p-5">
            <div className="mb-3">
                <h2 className="text-sm font-black uppercase tracking-widest text-text">
                    Recent activity
                </h2>
                <p className="text-xs text-muted">
                    Every rise and fall — the score is a projection of
                    these events.
                </p>
            </div>

            {events.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-background p-10 text-center text-muted">
                    <Award className="size-8 opacity-50" />
                    <p className="text-sm font-semibold text-text">
                        No reputation events yet
                    </p>
                    <p className="text-xs">
                        Events will appear as sessions complete and
                        reviewers act.
                    </p>
                </div>
            ) : (
                <ol className="relative space-y-3 pl-6">
                    <span className="absolute left-2 top-2 bottom-2 w-px bg-border" />
                    {events.map((ev) => (
                        <EventRow key={ev.id} event={ev} />
                    ))}
                </ol>
            )}
        </div>
    );
}

function EventRow({ event }: { event: WorkerReputationEventLite }) {
    const positive = event.score_delta >= 0;
    const dotClass = positive
        ? "bg-emerald-500 ring-emerald-500/30"
        : "bg-rose-500 ring-rose-500/30";
    const chipClass = positive
        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
        : "bg-rose-500/15 text-rose-600 dark:text-rose-400";
    const Icon = positive ? Plus : Minus;
    const trend = positive ? TrendingUp : TrendingDown;
    const TrendIcon = trend;

    return (
        <li className="relative rounded-2xl border border-border bg-background p-4">
            <span
                className={`absolute -left-[26px] top-4 flex size-4 items-center justify-center rounded-full ring-4 ${dotClass}`}
            />
            <div className="flex items-start gap-3">
                <div className={`shrink-0 rounded-xl p-2 ${chipClass}`}>
                    <TrendIcon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-text">
                            {event.reason || eventTypeLabel(event.event_type)}
                        </p>
                        <span
                            className={`shrink-0 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-black tabular-nums ${chipClass}`}
                        >
                            <Icon className="size-3" />
                            {Math.abs(event.score_delta)}
                        </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted">
                        {event.session_workstation && (
                            <span>{event.session_workstation}</span>
                        )}
                        {event.author_name && (
                            <>
                                <span>·</span>
                                <span>by {event.author_name}</span>
                            </>
                        )}
                        <span>·</span>
                        <span>{whenLabel(event.created_at)}</span>
                    </div>
                </div>
            </div>
        </li>
    );
}

/* ================================================================== */
/*                            Utilities                                */
/* ================================================================== */

// Kept in lock-step with `workers/models/worker.py::reputation_tier`.
// Score is clamped 300–850 server-side; excellent is the top cap.
const TIER_MIN: Record<ReputationTier, number> = {
    poor: 300,
    fair: 580,
    good: 670,
    very_good: 740,
    excellent: 800,
};

const SCORE_MAX = 850;

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

const TIER_BADGE: Record<ReputationTier, string> = {
    poor: "bg-rose-500",
    fair: "bg-amber-500",
    good: "bg-sky-500",
    very_good: "bg-violet-500",
    excellent: "bg-emerald-500",
};

function eventTypeLabel(t: string): string {
    return t
        .replace(/_/g, " ")
        .replace(/^auto perf/, "Auto")
        .replace(/^manual/, "Manual");
}

function whenLabel(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getMsg(err: unknown): string {
    if (err instanceof Error) return err.message;
    return "Unknown error.";
}
