"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@heroui/react";
import {
    Activity,
    Calendar,
    ChevronDown,
    ChevronUp,
    Clock,
    Factory,
    Filter,
    History as HistoryIcon,
    Loader2,
    LogIn,
    LogOut,
    Package,
} from "lucide-react";
import { personalKioskService } from "@/services/personal-kiosk.service";
import { RndBadge } from "@/components/RndBadge";
import {
    HistoryPayload,
    HistorySessionRow,
    HistoryShiftRow,
} from "@/types/worker";

interface HistoryPageProps {
    token: string;
    sessionToken: string;
    workerId: number;
    workerName: string;
}

interface Filters {
    dateFrom: string;
    dateTo: string;
}

/**
 * Full shift-history page: every clock-in / clock-out with the
 * sessions the worker ran inside grouped underneath. Infinite scroll
 * (IntersectionObserver on a sentinel) keeps the page fast for a
 * shift-heavy worker while filters let them narrow the timeline.
 */
export default function HistoryPage({
    token,
    sessionToken,
    workerId,
    workerName,
}: HistoryPageProps) {
    const [filters, setFilters] = useState<Filters>({ dateFrom: "", dateTo: "" });
    // Committed filters — the ones we're actually querying with. Kept
    // separate from the draft input state so typing a date doesn't
    // refetch on every keystroke.
    const [applied, setApplied] = useState<Filters>({ dateFrom: "", dateTo: "" });
    const [showFilters, setShowFilters] = useState(false);

    const [pages, setPages] = useState<HistoryShiftRow[][]>([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(
        async (nextPage: number, f: Filters, append: boolean) => {
            if (append) setLoadingMore(true);
            else setLoading(true);
            try {
                const res: HistoryPayload =
                    await personalKioskService.getHistory(
                        token,
                        workerId,
                        sessionToken,
                        {
                            page: nextPage,
                            dateFrom: f.dateFrom || null,
                            dateTo: f.dateTo || null,
                        },
                    );
                setPages((prev) =>
                    append ? [...prev, res.results] : [res.results],
                );
                setPage(res.page);
                setTotalPages(res.total_pages);
                setTotalCount(res.count);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Load failed");
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
        },
        [token, workerId, sessionToken],
    );

    useEffect(() => {
        void load(1, applied, false);
    }, [load, applied]);

    const shifts = useMemo(() => pages.flat(), [pages]);
    const hasMore = page < totalPages;

    // Infinite scroll — sentinel div at the bottom triggers next-page
    // when it enters viewport.
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        if (!sentinelRef.current || !hasMore || loading) return;
        const io = new IntersectionObserver(
            (entries) => {
                if (
                    entries[0]?.isIntersecting &&
                    !loadingMore &&
                    hasMore
                ) {
                    void load(page + 1, applied, true);
                }
            },
            { rootMargin: "300px" },
        );
        io.observe(sentinelRef.current);
        return () => io.disconnect();
    }, [hasMore, loading, loadingMore, page, applied, load]);

    const applyFilters = () => {
        setApplied(filters);
        setShowFilters(false);
    };
    const clearFilters = () => {
        setFilters({ dateFrom: "", dateTo: "" });
        setApplied({ dateFrom: "", dateTo: "" });
    };
    const hasActiveFilters = !!(applied.dateFrom || applied.dateTo);

    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-black text-text">History</h1>
                    <p className="mt-0.5 text-xs text-muted">
                        Every shift {workerName.split(" ")[0]} has clocked, with
                        the sessions they ran inside.
                    </p>
                </div>
                <Button
                    variant={hasActiveFilters ? "solid" : "flat"}
                    color={hasActiveFilters ? "primary" : "default"}
                    startContent={<Filter className="size-4" />}
                    onPress={() => setShowFilters((v) => !v)}
                    className="shrink-0"
                >
                    Filter
                    {hasActiveFilters && (
                        <span className="ml-1 rounded-full bg-white/20 px-2 text-[10px] font-black">
                            {[applied.dateFrom, applied.dateTo].filter(Boolean).length}
                        </span>
                    )}
                </Button>
            </div>

            {showFilters && (
                <FilterPanel
                    filters={filters}
                    setFilters={setFilters}
                    onApply={applyFilters}
                    onClear={clearFilters}
                />
            )}

            {error && (
                <div className="rounded-2xl border border-danger/40 bg-danger/5 p-4 text-sm text-danger">
                    {error}
                </div>
            )}

            {loading && (
                <div className="flex items-center justify-center gap-2 rounded-3xl border border-border bg-surface p-16 text-sm text-muted">
                    <Loader2 className="size-4 animate-spin" />
                    Loading history…
                </div>
            )}

            {!loading && !error && shifts.length === 0 && (
                <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-border bg-background p-10 text-center text-muted">
                    <HistoryIcon className="size-8 opacity-50" />
                    <p className="text-sm font-semibold text-text">
                        No shifts yet
                    </p>
                    <p className="max-w-sm text-xs">
                        {hasActiveFilters
                            ? "Try widening your date range."
                            : "Once you clock in for the first time, it'll show up here."}
                    </p>
                </div>
            )}

            {!loading && shifts.length > 0 && (
                <>
                    <p className="text-[11px] font-black uppercase tracking-widest text-muted">
                        {totalCount} shift{totalCount === 1 ? "" : "s"}
                    </p>
                    <div className="space-y-3">
                        {shifts.map((s) => (
                            <ShiftCard key={s.id} shift={s} />
                        ))}
                    </div>
                    <div ref={sentinelRef} />
                    {loadingMore && (
                        <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted">
                            <Loader2 className="size-3.5 animate-spin" />
                            Loading more…
                        </div>
                    )}
                    {!hasMore && shifts.length > 5 && (
                        <p className="py-6 text-center text-[10px] font-black uppercase tracking-widest text-muted">
                            End of history
                        </p>
                    )}
                </>
            )}
        </div>
    );
}

/* ================================================================== */

function FilterPanel({
    filters,
    setFilters,
    onApply,
    onClear,
}: {
    filters: Filters;
    setFilters: (f: Filters) => void;
    onApply: () => void;
    onClear: () => void;
}) {
    return (
        <div className="rounded-3xl border border-border bg-surface p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                    <label className="text-[11px] font-black uppercase tracking-wider text-muted">
                        From
                    </label>
                    <input
                        type="date"
                        value={filters.dateFrom}
                        onChange={(e) =>
                            setFilters({ ...filters, dateFrom: e.target.value })
                        }
                        className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-text focus:border-primary focus:outline-none"
                    />
                </div>
                <div>
                    <label className="text-[11px] font-black uppercase tracking-wider text-muted">
                        To
                    </label>
                    <input
                        type="date"
                        value={filters.dateTo}
                        onChange={(e) =>
                            setFilters({ ...filters, dateTo: e.target.value })
                        }
                        className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-text focus:border-primary focus:outline-none"
                    />
                </div>
            </div>
            <div className="mt-3 flex gap-2">
                <Button
                    variant="light"
                    onPress={onClear}
                    className="flex-1"
                >
                    Clear
                </Button>
                <Button
                    color="primary"
                    onPress={onApply}
                    className="flex-1"
                >
                    Apply
                </Button>
            </div>
        </div>
    );
}

function ShiftCard({ shift }: { shift: HistoryShiftRow }) {
    const [expanded, setExpanded] = useState(false);
    const clockedIn = new Date(shift.clocked_in_at);
    const clockedOut = shift.clocked_out_at
        ? new Date(shift.clocked_out_at)
        : null;
    const day = clockedIn.toLocaleDateString([], {
        weekday: "short",
        day: "numeric",
        month: "short",
    });
    const inTime = clockedIn.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });
    const outTime = clockedOut
        ? clockedOut.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
          })
        : null;

    const isActive = shift.status === "active";
    const canExpand = shift.sessions.length > 0;

    return (
        <div
            className={`rounded-3xl border-2 p-5 transition-colors ${
                isActive
                    ? "border-success/40 bg-success/5"
                    : "border-border bg-background hover:border-primary/30"
            }`}
        >
            <div className="flex items-start gap-3">
                <div
                    className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${
                        isActive
                            ? "bg-success/15 text-success"
                            : "bg-primary/10 text-primary"
                    }`}
                >
                    <Calendar className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-text">{day}</p>
                        {isActive && (
                            <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-success">
                                Active
                            </span>
                        )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                        <span className="inline-flex items-center gap-1">
                            <LogIn className="size-3" />
                            {inTime}
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <LogOut className="size-3" />
                            {outTime ?? "—"}
                        </span>
                        <span className="inline-flex items-center gap-1 font-black text-text tabular-nums">
                            <Clock className="size-3" />
                            {formatSeconds(shift.duration_seconds)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <Activity className="size-3" />
                            {shift.sessions_count} session
                            {shift.sessions_count === 1 ? "" : "s"}
                        </span>
                    </div>
                </div>
                {canExpand && (
                    <button
                        type="button"
                        onClick={() => setExpanded((v) => !v)}
                        aria-label={expanded ? "Collapse" : "Expand"}
                        className="shrink-0 inline-flex size-9 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-text"
                    >
                        {expanded ? (
                            <ChevronUp className="size-4" />
                        ) : (
                            <ChevronDown className="size-4" />
                        )}
                    </button>
                )}
            </div>

            {expanded && shift.sessions.length > 0 && (
                <ul className="mt-4 space-y-2 border-t border-border pt-3">
                    {shift.sessions.map((s) => (
                        <SessionMiniRow key={s.id} session={s} />
                    ))}
                </ul>
            )}
        </div>
    );
}

function SessionMiniRow({ session }: { session: HistorySessionRow }) {
    const start = session.start_time ? new Date(session.start_time) : null;
    const end = session.end_time ? new Date(session.end_time) : null;
    const perf = session.performance_percentage;
    const tone = perf == null
        ? "muted"
        : perf >= 100
          ? "good"
          : perf >= 75
            ? "neutral"
            : perf >= 50
              ? "warn"
              : "bad";
    const badge = {
        good: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        neutral: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
        warn: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
        bad: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
        muted: "bg-surface text-muted",
    }[tone];

    return (
        <li className="flex items-start gap-3 rounded-2xl bg-surface p-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-background text-muted">
                <Factory className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                    <p className="text-xs font-black text-text truncate">
                        {session.workstation_name ?? "—"}
                    </p>
                    <RndBadge projectType={session.project_type} compact />
                </div>
                <p className="mt-0.5 text-[11px] text-muted truncate">
                    {session.item_name ??
                        session.activity_label ??
                        session.activity_kind}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-muted">
                    {start && (
                        <span>
                            {start.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                            {end
                                ? ` – ${end.toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                  })}`
                                : ""}
                        </span>
                    )}
                    {session.quantity_produced != null && (
                        <span className="inline-flex items-center gap-1 tabular-nums">
                            <Package className="size-2.5" />
                            {session.quantity_produced}
                            {session.workstation_uom
                                ? ` ${session.workstation_uom}`
                                : ""}
                        </span>
                    )}
                </div>
            </div>
            <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black tabular-nums ${badge}`}
            >
                {perf != null ? `${Math.round(perf)}%` : "—"}
            </span>
        </li>
    );
}

function formatSeconds(secs: number): string {
    const s = Math.max(0, Math.floor(secs));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}
