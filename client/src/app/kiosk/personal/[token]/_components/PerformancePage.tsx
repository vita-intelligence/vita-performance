"use client";

import { useEffect, useState } from "react";
import {
    Activity,
    Gauge,
    Loader2,
    Package,
    TrendingUp,
} from "lucide-react";
import { personalKioskService } from "@/services/personal-kiosk.service";
import {
    WorkerPerformancePayload,
    WorkerPerformanceRecentSession,
    WorkerPerformanceTrendPoint,
} from "@/types/worker";

interface PerformancePageProps {
    token: string;
    workerId: number;
    workerName: string;
}

/**
 * Full-page performance view — 14-day trend chart, headline summary,
 * recent sessions. Chart is a lightweight inline SVG so we don't drag
 * in a charting lib for a single view.
 */
export default function PerformancePage({
    token,
    workerId,
    workerName,
}: PerformancePageProps) {
    const [data, setData] = useState<WorkerPerformancePayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        personalKioskService
            .getPerformance(token, workerId)
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
                title="Performance"
                subtitle={`${workerName}'s last 14 days at a glance`}
            />

            {loading && (
                <div className="flex items-center justify-center gap-2 rounded-3xl border border-border bg-surface p-16 text-sm text-muted">
                    <Loader2 className="size-4 animate-spin" />
                    Crunching your numbers…
                </div>
            )}

            {error && !loading && (
                <div className="rounded-3xl border border-danger/40 bg-danger/5 p-6 text-sm text-danger">
                    Couldn’t load performance: {error}
                </div>
            )}

            {data && !loading && !error && (
                <>
                    <SummaryHero data={data} />
                    <TrendCard points={data.trend} />
                    <RecentSessionsCard sessions={data.recent_sessions} />
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

function SummaryHero({ data }: { data: WorkerPerformancePayload }) {
    const avg = data.summary.avg_performance;
    const tone = perfTone(avg);
    const gradient = {
        good: "from-emerald-500 via-teal-500 to-cyan-500",
        neutral: "from-sky-500 via-blue-500 to-indigo-500",
        warn: "from-amber-500 via-orange-500 to-red-500",
        bad: "from-rose-600 via-red-500 to-orange-500",
    }[tone];

    return (
        <div className="relative overflow-hidden rounded-3xl border border-border">
            <div
                className={`bg-gradient-to-br ${gradient} p-6 text-white`}
            >
                <div className="absolute -right-8 -top-10 size-48 rounded-full bg-white/10 blur-2xl" />
                <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
                    Average performance
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                    <p className="text-6xl font-black tabular-nums">
                        {avg !== null ? avg.toFixed(0) : "—"}
                    </p>
                    {avg !== null && (
                        <p className="text-2xl font-bold text-white/80">%</p>
                    )}
                </div>
                <p className="mt-1 text-sm font-semibold text-white/90">
                    {perfLabel(avg)}
                </p>
            </div>
            <div className="grid grid-cols-2 divide-x divide-border border-t border-border bg-surface">
                <StatCell
                    icon={<Activity className="size-4" />}
                    label="Sessions"
                    value={String(data.summary.sessions_count)}
                />
                <StatCell
                    icon={<Package className="size-4" />}
                    label="Units produced"
                    value={data.summary.total_quantity.toLocaleString()}
                />
            </div>
        </div>
    );
}

function StatCell({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="p-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
                {icon}
                {label}
            </div>
            <p className="mt-1 text-2xl font-black tabular-nums text-text">
                {value}
            </p>
        </div>
    );
}

function TrendCard({ points }: { points: WorkerPerformanceTrendPoint[] }) {
    const hasAny = points.some((p) => p.sessions_count > 0);
    return (
        <div className="rounded-3xl border border-border bg-surface p-5">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-black uppercase tracking-widest text-text">
                        Trend
                    </h2>
                    <p className="text-xs text-muted">
                        Daily average performance
                    </p>
                </div>
                <TrendingUp className="size-4 text-muted" />
            </div>

            {hasAny ? (
                <TrendChart points={points} />
            ) : (
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-background p-10 text-center text-muted">
                    <Gauge className="size-8 opacity-50" />
                    <p className="text-sm font-semibold text-text">
                        No sessions in the last 14 days
                    </p>
                    <p className="text-xs">
                        Once you clock time on a station, your trend
                        will appear here.
                    </p>
                </div>
            )}
        </div>
    );
}

/**
 * Compact vertical-bar chart. Bars are tinted by performance band
 * so a glance tells the story before the number does. Days with no
 * sessions render as a faint placeholder line.
 */
function TrendChart({ points }: { points: WorkerPerformanceTrendPoint[] }) {
    const width = 640;
    const height = 180;
    const paddingX = 12;
    const paddingTop = 8;
    const paddingBottom = 32;
    const chartW = width - paddingX * 2;
    const chartH = height - paddingTop - paddingBottom;
    const barGap = 4;
    const barW = (chartW - barGap * (points.length - 1)) / points.length;
    // Show 0..120 vertical range so >100% doesn't clip.
    const maxY = 120;

    const gridLines = [0, 50, 100];

    return (
        <div className="overflow-hidden rounded-2xl bg-background p-3">
            <svg
                viewBox={`0 0 ${width} ${height}`}
                className="h-40 w-full"
                preserveAspectRatio="none"
            >
                {gridLines.map((g) => {
                    const y = paddingTop + chartH - (g / maxY) * chartH;
                    return (
                        <g key={g}>
                            <line
                                x1={paddingX}
                                x2={width - paddingX}
                                y1={y}
                                y2={y}
                                className="stroke-border"
                                strokeWidth={1}
                                strokeDasharray="2 4"
                            />
                            <text
                                x={paddingX}
                                y={y - 3}
                                className="fill-muted"
                                fontSize={9}
                            >
                                {g}%
                            </text>
                        </g>
                    );
                })}

                {points.map((p, i) => {
                    const x = paddingX + i * (barW + barGap);
                    const perf = p.avg_performance;
                    if (perf === null || p.sessions_count === 0) {
                        return (
                            <g key={p.date}>
                                <line
                                    x1={x + barW / 2}
                                    x2={x + barW / 2}
                                    y1={paddingTop + chartH - 2}
                                    y2={paddingTop + chartH}
                                    className="stroke-muted opacity-30"
                                    strokeWidth={2}
                                />
                                <text
                                    x={x + barW / 2}
                                    y={height - 12}
                                    textAnchor="middle"
                                    className="fill-muted"
                                    fontSize={8}
                                >
                                    {dayLabel(p.date)}
                                </text>
                            </g>
                        );
                    }
                    const bandColor = perfBarClass(perf);
                    const capped = Math.min(perf, maxY);
                    const h = Math.max(2, (capped / maxY) * chartH);
                    const y = paddingTop + chartH - h;
                    return (
                        <g key={p.date}>
                            <rect
                                x={x}
                                y={y}
                                width={barW}
                                height={h}
                                rx={2}
                                className={bandColor}
                            />
                            <text
                                x={x + barW / 2}
                                y={y - 3}
                                textAnchor="middle"
                                className="fill-text font-semibold"
                                fontSize={8}
                            >
                                {Math.round(perf)}
                            </text>
                            <text
                                x={x + barW / 2}
                                y={height - 12}
                                textAnchor="middle"
                                className="fill-muted"
                                fontSize={8}
                            >
                                {dayLabel(p.date)}
                            </text>
                        </g>
                    );
                })}
            </svg>

            <div className="mt-2 flex flex-wrap justify-center gap-3 text-[10px] text-muted">
                <LegendChip color="fill-emerald-500" label="≥100%" />
                <LegendChip color="fill-sky-500" label="75–99%" />
                <LegendChip color="fill-amber-500" label="50–74%" />
                <LegendChip color="fill-rose-500" label="<50%" />
            </div>
        </div>
    );
}

function LegendChip({ color, label }: { color: string; label: string }) {
    return (
        <div className="flex items-center gap-1">
            <svg width={8} height={8}>
                <rect width={8} height={8} rx={2} className={color} />
            </svg>
            {label}
        </div>
    );
}

function RecentSessionsCard({
    sessions,
}: {
    sessions: WorkerPerformanceRecentSession[];
}) {
    return (
        <div className="rounded-3xl border border-border bg-surface p-5">
            <div className="mb-3">
                <h2 className="text-sm font-black uppercase tracking-widest text-text">
                    Recent sessions
                </h2>
                <p className="text-xs text-muted">
                    Your last {sessions.length || 10} completed sessions.
                </p>
            </div>

            {sessions.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-background p-10 text-center text-muted">
                    <Activity className="size-8 opacity-50" />
                    <p className="text-sm font-semibold text-text">
                        No completed sessions yet
                    </p>
                    <p className="text-xs">
                        Sessions land here after they close on a station.
                    </p>
                </div>
            ) : (
                <ul className="divide-y divide-border rounded-2xl border border-border bg-background">
                    {sessions.map((s) => (
                        <SessionRow key={s.id} session={s} />
                    ))}
                </ul>
            )}
        </div>
    );
}

function SessionRow({ session }: { session: WorkerPerformanceRecentSession }) {
    const perf = session.performance_percentage;
    const tone = perfTone(perf);
    const badge = {
        good: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        neutral: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
        warn: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
        bad: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    }[tone];
    return (
        <li className="flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text">
                    {session.workstation_name ?? "—"}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted">
                    {session.item_name ?? "No item"} ·{" "}
                    {sessionWhen(session)}
                </p>
            </div>
            {session.quantity_produced !== null && (
                <div className="hidden text-right text-xs text-muted sm:block">
                    {session.quantity_produced.toLocaleString()} units
                </div>
            )}
            <div
                className={`ml-2 shrink-0 rounded-full px-3 py-1 text-sm font-black tabular-nums ${badge}`}
            >
                {perf !== null ? `${Math.round(perf)}%` : "—"}
            </div>
        </li>
    );
}

/* ================================================================== */
/*                            Utilities                                */
/* ================================================================== */

function perfTone(p: number | null): "good" | "neutral" | "warn" | "bad" {
    if (p === null) return "neutral";
    if (p >= 100) return "good";
    if (p >= 75) return "neutral";
    if (p >= 50) return "warn";
    return "bad";
}

function perfBarClass(p: number): string {
    if (p >= 100) return "fill-emerald-500";
    if (p >= 75) return "fill-sky-500";
    if (p >= 50) return "fill-amber-500";
    return "fill-rose-500";
}

function perfLabel(p: number | null): string {
    if (p === null) return "No data in this window";
    if (p >= 100) return "Excellent output";
    if (p >= 75) return "On track";
    if (p >= 50) return "Below target";
    return "Well below target";
}

function dayLabel(iso: string): string {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString([], { weekday: "narrow" });
}

function sessionWhen(s: WorkerPerformanceRecentSession): string {
    const t = s.ended_at ?? s.started_at;
    if (!t) return "—";
    const d = new Date(t);
    const today = new Date();
    const sameDay =
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate();
    if (sameDay) {
        return `Today ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }
    return d.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getMsg(err: unknown): string {
    if (err instanceof Error) return err.message;
    return "Unknown error.";
}
