"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@heroui/react";
import {
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    Clock,
    Coffee,
    Factory,
    Loader2,
    Play,
    Square,
    ClipboardCheck,
    ThumbsUp,
    ThumbsDown,
    Gauge,
} from "lucide-react";
import { workerService } from "@/services/worker.service";
import {
    WorkerDayOverview,
    WorkerDayShift,
    WorkerDaySession,
    WorkerDayReview,
} from "@/types/worker";

/**
 * /workers/:id/day/:date — chronological narrative of a worker's day.
 *
 * Layout:
 *   Header (worker name + date + prev/next day nav)
 *   For each shift (usually 1/day):
 *     Shift banner (clock-in → clock-out, elapsed, on-station vs idle)
 *     Interleaved timeline: sessions + QA reviews sorted by time
 *   Unattached section (station-kiosk work with no personal-kiosk shift)
 *
 * Managers land here to audit a shift; workers use it for self-review.
 */
export default function WorkerDayPage() {
    const params = useParams<{ id: string; date: string }>();
    const workerId = Number(params.id);
    const date = params.date;

    const [data, setData] = useState<WorkerDayOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        workerService
            .getDayOverview(workerId, date)
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
    }, [workerId, date]);

    const prevDate = shiftDate(date, -1);
    const nextDate = shiftDate(date, +1);

    return (
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6">
            <header className="flex flex-col gap-3">
                <Button
                    as={Link}
                    href={`/workers/${workerId}`}
                    variant="light"
                    size="sm"
                    startContent={<ArrowLeft className="size-3.5" />}
                    className="self-start"
                >
                    Back to worker
                </Button>
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                            Day overview
                        </p>
                        <h1 className="mt-1 text-2xl font-black text-text">
                            {data?.worker.name ?? "…"}
                        </h1>
                        <p className="mt-1 text-sm text-muted">{formatDate(date)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            as={Link}
                            href={`/workers/${workerId}/day/${prevDate}`}
                            variant="flat"
                            size="sm"
                            isIconOnly
                            aria-label="Previous day"
                        >
                            <ChevronLeft className="size-4" />
                        </Button>
                        <Button
                            as={Link}
                            href={`/workers/${workerId}/day/${nextDate}`}
                            variant="flat"
                            size="sm"
                            isIconOnly
                            aria-label="Next day"
                        >
                            <ChevronRight className="size-4" />
                        </Button>
                    </div>
                </div>
            </header>

            {loading && (
                <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-6 text-sm text-muted">
                    <Loader2 className="size-4 animate-spin" />
                    Loading day…
                </div>
            )}

            {error && (
                <div className="rounded-2xl border border-danger/40 bg-danger/5 p-4 text-sm text-danger">
                    {error}
                </div>
            )}

            {data && !loading && (
                <>
                    {data.shifts.length === 0 && data.unattached_sessions.length === 0 && data.unattached_reviews.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-border bg-background p-8 text-center text-sm text-muted">
                            Nothing recorded on this day.
                        </div>
                    )}

                    {data.shifts.map((shift) => (
                        <ShiftCard key={shift.id} shift={shift} />
                    ))}

                    {(data.unattached_sessions.length > 0 || data.unattached_reviews.length > 0) && (
                        <section className="rounded-2xl border border-border bg-background p-4">
                            <h2 className="text-sm font-black uppercase tracking-widest text-muted">
                                Outside any shift
                            </h2>
                            <p className="mt-1 text-xs text-muted">
                                Station kiosk activity that ran while no personal-kiosk shift was open.
                            </p>
                            <ol className="mt-3 space-y-2">
                                {mergeSortedByTime(
                                    data.unattached_sessions,
                                    data.unattached_reviews,
                                ).map((entry) => (
                                    <TimelineEntry key={entry.key} entry={entry} />
                                ))}
                            </ol>
                        </section>
                    )}
                </>
            )}
        </div>
    );
}

// ---- shift card ----

function ShiftCard({ shift }: { shift: WorkerDayShift }) {
    const timeline = mergeSortedByTime(shift.sessions, shift.qa_reviews);

    return (
        <section className="rounded-2xl border border-border bg-background">
            {/* Header banner */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 bg-surface px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Clock className="size-5" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                            Shift
                        </p>
                        <p className="mt-0.5 text-sm font-bold text-text">
                            {formatTimeShort(shift.clocked_in_at)}
                            {" → "}
                            {shift.clocked_out_at
                                ? formatTimeShort(shift.clocked_out_at)
                                : "open"}
                        </p>
                    </div>
                    {shift.is_active && (
                        <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-success">
                            LIVE
                        </span>
                    )}
                </div>
                <div className="flex flex-wrap gap-4 text-[11px] font-semibold uppercase tracking-wider text-muted">
                    <Stat label="Duration" value={formatHms(shift.duration_seconds)} />
                    <Stat label="On station" value={formatHms(shift.on_station_seconds)} />
                    <Stat label="Idle" value={formatHms(shift.idle_seconds)} />
                    <Stat label="Sessions" value={String(shift.sessions_count)} />
                    <Stat label="QA reviews" value={String(shift.qa_reviews_count)} />
                </div>
            </div>

            {/* Timeline */}
            <div className="p-5">
                {timeline.length === 0 ? (
                    <div className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-surface/50 px-4 py-3 text-xs text-muted">
                        <Coffee className="size-4" />
                        No activity recorded in this shift yet.
                    </div>
                ) : (
                    <ol className="space-y-2">
                        {timeline.map((entry) => (
                            <TimelineEntry key={entry.key} entry={entry} />
                        ))}
                    </ol>
                )}
                {shift.notes && (
                    <p className="mt-4 rounded-lg border border-border/60 bg-surface/40 px-3 py-2 text-xs text-muted">
                        <span className="font-semibold text-text">Notes: </span>
                        {shift.notes}
                    </p>
                )}
            </div>
        </section>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-muted">{label}</p>
            <p className="mt-0.5 text-sm font-black text-text tabular-nums">{value}</p>
        </div>
    );
}

// ---- timeline entries ----

type TimelineItem =
    | { kind: "session"; key: string; time: string; data: WorkerDaySession }
    | { kind: "review"; key: string; time: string; data: WorkerDayReview };

function mergeSortedByTime(
    sessions: WorkerDaySession[],
    reviews: WorkerDayReview[],
): TimelineItem[] {
    const items: TimelineItem[] = [
        ...sessions.map<TimelineItem>((s) => ({
            kind: "session",
            key: `s-${s.id}`,
            time: s.start_time ?? "",
            data: s,
        })),
        ...reviews.map<TimelineItem>((r) => ({
            kind: "review",
            key: `r-${r.id}`,
            time: r.created_at,
            data: r,
        })),
    ];
    items.sort((a, b) => a.time.localeCompare(b.time));
    return items;
}

function TimelineEntry({ entry }: { entry: TimelineItem }) {
    if (entry.kind === "session") {
        const s = entry.data;
        const isActive = s.status === "active" || !s.end_time;
        return (
            <li className="flex items-start gap-3 rounded-xl border border-border bg-surface/40 px-4 py-3">
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-background text-text">
                    <Factory className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-text">
                            {s.workstation_name ?? "Unknown station"}
                        </p>
                        {isActive && (
                            <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-warning">
                                Active
                            </span>
                        )}
                        {s.status === "verified" && (
                            <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-success">
                                Verified
                            </span>
                        )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                        <span className="inline-flex items-center gap-1">
                            <Play className="size-3" />
                            {formatTimeShort(s.start_time)}
                        </span>
                        {s.end_time && (
                            <span className="inline-flex items-center gap-1">
                                <Square className="size-3" />
                                {formatTimeShort(s.end_time)}
                            </span>
                        )}
                        {s.duration_seconds !== null && (
                            <span>{formatHms(s.duration_seconds)}</span>
                        )}
                        {s.performance_percentage !== null && (
                            <span className="inline-flex items-center gap-1">
                                <Gauge className="size-3" />
                                {s.performance_percentage.toFixed(0)}%
                            </span>
                        )}
                        {s.quantity_produced !== null && (
                            <span>{s.quantity_produced} produced</span>
                        )}
                        {s.item_name && (
                            <span className="truncate">{s.item_name}</span>
                        )}
                    </div>
                </div>
            </li>
        );
    }

    const r = entry.data;
    const positive = r.event_type.includes("positive") || r.event_type === "auto_perf_high" || r.event_type === "auto_perf_excellent";
    return (
        <li className="flex items-start gap-3 rounded-xl border border-border bg-surface/40 px-4 py-3">
            <div className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${positive ? "bg-success/15 text-success" : "bg-danger/15 text-danger"}`}>
                {positive ? <ThumbsUp className="size-4" /> : <ThumbsDown className="size-4" />}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-text">
                        {formatReviewType(r.event_type)}
                    </p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${positive ? "bg-success/15 text-success" : "bg-danger/15 text-danger"}`}>
                        {r.score_delta > 0 ? "+" : ""}
                        {r.score_delta}
                    </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                    <span>{formatTimeShort(r.created_at)}</span>
                    {r.author_name && r.author_name !== r.target_worker_name && (
                        <span className="inline-flex items-center gap-1">
                            <ClipboardCheck className="size-3" />
                            by {r.author_name}
                        </span>
                    )}
                    {r.session_workstation && (
                        <span>{r.session_workstation}</span>
                    )}
                </div>
                {r.reason && (
                    <p className="mt-1 text-xs text-text/80">{r.reason}</p>
                )}
            </div>
        </li>
    );
}

// ---- helpers ----

function shiftDate(iso: string, days: number): string {
    const d = new Date(iso + "T00:00:00");
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}

function formatDate(iso: string): string {
    try {
        return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    } catch {
        return iso;
    }
}

function formatTimeShort(iso: string | null): string {
    if (!iso) return "—";
    try {
        return new Date(iso).toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return iso;
    }
}

function formatHms(seconds: number | null): string {
    if (seconds === null) return "—";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
    if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`;
    return `${s}s`;
}

function formatReviewType(t: string): string {
    switch (t) {
        case "manual_positive":
            return "Positive QA feedback";
        case "manual_negative":
            return "Negative QA feedback";
        case "auto_perf_excellent":
            return "Auto: excellent performance";
        case "auto_perf_high":
            return "Auto: high performance";
        case "auto_perf_low":
            return "Auto: low performance";
        case "auto_perf_very_low":
            return "Auto: very low performance";
        default:
            return t;
    }
}

function getMsg(err: unknown): string {
    if (typeof err !== "object" || err === null) return "Unknown error.";
    const anyErr = err as { response?: { data?: { detail?: string } }; message?: string };
    return anyErr.response?.data?.detail ?? anyErr.message ?? "Couldn’t load day.";
}
