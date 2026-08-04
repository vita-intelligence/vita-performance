"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ClipboardCheck,
    Clock,
    Factory,
    Info,
    Loader2,
    Lock,
    Search,
    X,
} from "lucide-react";
import { personalKioskService } from "@/services/personal-kiosk.service";
import { WorkerStationsPayload, WorkerStationTile } from "@/types/worker";
import { useDebounce } from "@/hooks/useDebounce";

interface StationsPageProps {
    token: string;
    workerId: number;
    workerName: string;
    isClockedIn: boolean;
    onOpenStation: (workstationId: number) => void;
    onOpenQC: () => void;
}

/**
 * Full alphabetic station catalogue with infinite scroll. No search
 * gate — a worker landing on this page immediately sees every station
 * they can open, sorted A→Z with general stations pinned above.
 *
 * Search box narrows the list live (300ms debounce) so on a large
 * tenant they can find "pouch filling" without scrolling through
 * hundreds of rows. Recent stations still pin above as one-tap
 * shortcuts.
 *
 * Infinite scroll uses IntersectionObserver on a sentinel div —
 * fetches the next page when it enters viewport, same pattern as
 * QC + History pages so the FE ergonomics stay consistent.
 */
export default function StationsPage({
    token,
    workerId,
    workerName,
    isClockedIn,
    onOpenStation,
    onOpenQC,
}: StationsPageProps) {
    const [query, setQuery] = useState("");
    // Debounce so typing doesn't hammer the endpoint at every keystroke
    // but still feels live — 300ms is the sweet spot between "responsive"
    // and "not thrashing the DB".
    const debouncedQuery = useDebounce(query, 300);

    const [pages, setPages] = useState<WorkerStationTile[][]>([]);
    const [meta, setMeta] = useState<{
        page: number;
        totalMatches: number;
        totalAvailable: number;
        hasMore: boolean;
        qaEnabled: boolean;
        recent: WorkerStationTile[];
    }>({
        page: 0,
        totalMatches: 0,
        totalAvailable: 0,
        hasMore: false,
        qaEnabled: false,
        recent: [],
    });
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(
        async (nextPage: number, q: string, append: boolean) => {
            if (append) setLoadingMore(true);
            else setLoading(true);
            try {
                const res: WorkerStationsPayload =
                    await personalKioskService.getStations(
                        token,
                        workerId,
                        q,
                        nextPage,
                    );
                setPages((prev) =>
                    append ? [...prev, res.stations] : [res.stations],
                );
                setMeta({
                    page: res.page,
                    totalMatches: res.total_matches,
                    totalAvailable: res.total_available,
                    hasMore: res.has_more,
                    qaEnabled: res.qa_enabled,
                    recent: res.recent,
                });
                setError(null);
            } catch (err) {
                setError(getMsg(err));
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
        },
        [token, workerId],
    );

    // Reload page 1 whenever the (debounced) query changes.
    useEffect(() => {
        void load(1, debouncedQuery.trim(), false);
    }, [load, debouncedQuery]);

    const stations = useMemo(() => pages.flat(), [pages]);

    // Infinite scroll sentinel.
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        if (!sentinelRef.current || !meta.hasMore || loading || loadingMore)
            return;
        const io = new IntersectionObserver(
            (entries) => {
                if (
                    entries[0]?.isIntersecting &&
                    !loadingMore &&
                    meta.hasMore
                ) {
                    void load(meta.page + 1, debouncedQuery.trim(), true);
                }
            },
            { rootMargin: "300px" },
        );
        io.observe(sentinelRef.current);
        return () => io.disconnect();
    }, [meta.hasMore, meta.page, loading, loadingMore, debouncedQuery, load]);

    const handleClear = () => setQuery("");

    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
            <SectionIntro
                title="Stations"
                subtitle={`${workerName} — pick a station to open its kiosk`}
            />

            {!isClockedIn && (
                <div className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/5 p-4 text-sm text-warning">
                    <Info className="mt-0.5 size-4 shrink-0" />
                    <div>
                        <p className="font-semibold">
                            You’re not clocked in yet.
                        </p>
                        <p className="mt-0.5 text-xs opacity-90">
                            Go back and clock in first so today’s sessions
                            attach to your shift.
                        </p>
                    </div>
                </div>
            )}

            {/* QA tile — inline QC review inbox. */}
            {meta.qaEnabled && (
                <button
                    type="button"
                    onClick={onOpenQC}
                    className="group flex items-center gap-4 rounded-3xl border-2 border-primary/40 bg-primary/5 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg active:scale-[0.99]"
                >
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                        <ClipboardCheck className="size-7" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-base font-black text-text">
                            Quality Control
                        </p>
                        <p className="mt-0.5 text-xs text-muted">
                            Review completed sessions across every station.
                        </p>
                    </div>
                    <span className="hidden rounded-full bg-primary/15 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-primary sm:inline">
                        Reviewer
                    </span>
                </button>
            )}

            {meta.recent.length > 0 && !debouncedQuery && (
                <RecentStations
                    stations={meta.recent}
                    onOpenStation={onOpenStation}
                />
            )}

            <LiveSearchBar
                query={query}
                setQuery={setQuery}
                onClear={handleClear}
                totalMatches={meta.totalMatches}
                totalAvailable={meta.totalAvailable}
                showingCount={stations.length}
                hasQuery={!!debouncedQuery.trim()}
            />

            {error && (
                <div className="rounded-2xl border border-danger/40 bg-danger/5 p-4 text-sm text-danger">
                    {error}
                </div>
            )}

            {loading && (
                <LoadingCard label="Loading stations…" />
            )}

            {!loading && !error && stations.length === 0 && (
                <>
                    {debouncedQuery.trim() ? (
                        <EmptyState
                            icon={<Search className="size-6 opacity-50" />}
                            title="No matches"
                            body={`No station names match "${debouncedQuery.trim()}".`}
                        />
                    ) : (
                        <EmptyState
                            icon={<Lock className="size-6 opacity-50" />}
                            title="No stations assigned yet"
                            body="Ask a supervisor to grant you access under Workers → Authorised stations, or mark a station as “general”."
                        />
                    )}
                </>
            )}

            {!loading && stations.length > 0 && (
                <>
                    <StationGrid
                        stations={stations}
                        onOpenStation={onOpenStation}
                    />
                    <div ref={sentinelRef} />
                    {loadingMore && (
                        <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted">
                            <Loader2 className="size-3.5 animate-spin" />
                            Loading more…
                        </div>
                    )}
                    {!meta.hasMore && stations.length > 6 && (
                        <p className="py-6 text-center text-[10px] font-black uppercase tracking-widest text-muted">
                            End of list
                        </p>
                    )}
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

function LiveSearchBar({
    query,
    setQuery,
    onClear,
    totalMatches,
    totalAvailable,
    showingCount,
    hasQuery,
}: {
    query: string;
    setQuery: (q: string) => void;
    onClear: () => void;
    totalMatches: number;
    totalAvailable: number;
    showingCount: number;
    hasQuery: boolean;
}) {
    return (
        <div className="space-y-2">
            <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted" />
                <input
                    type="text"
                    inputMode="search"
                    autoComplete="off"
                    autoCorrect="off"
                    placeholder={
                        totalAvailable > 0
                            ? `Filter ${totalAvailable} station${totalAvailable === 1 ? "" : "s"}…`
                            : "Filter stations…"
                    }
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full h-14 rounded-2xl border border-border bg-background pl-12 pr-11 text-lg text-text placeholder:text-muted focus:border-primary focus:outline-none"
                />
                {query && (
                    <button
                        type="button"
                        onClick={onClear}
                        aria-label="Clear filter"
                        className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex size-8 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-text"
                    >
                        <X className="size-4" />
                    </button>
                )}
            </div>
            {totalMatches > 0 && (
                <p className="text-[11px] text-muted">
                    Showing{" "}
                    <span className="font-black tabular-nums text-text">
                        {showingCount}
                    </span>{" "}
                    of{" "}
                    <span className="font-black tabular-nums text-text">
                        {totalMatches}
                    </span>
                    {hasQuery && ` match${totalMatches === 1 ? "" : "es"}`}
                </p>
            )}
        </div>
    );
}

function RecentStations({
    stations,
    onOpenStation,
}: {
    stations: WorkerStationTile[];
    onOpenStation: (workstationId: number) => void;
}) {
    return (
        <section className="space-y-2">
            <div className="flex items-center gap-2">
                <Clock className="size-4 text-muted" />
                <p className="text-[11px] font-black uppercase tracking-widest text-muted">
                    Recent
                </p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {stations.map((s) => (
                    <button
                        key={s.id}
                        type="button"
                        onClick={() => onOpenStation(s.id)}
                        className="group flex items-center gap-3 rounded-2xl border border-border bg-background p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md active:scale-[0.99]"
                    >
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface text-text group-hover:bg-primary/10 group-hover:text-primary">
                            <Factory className="size-4" />
                        </div>
                        <p className="min-w-0 flex-1 truncate text-xs font-black text-text">
                            {s.name}
                        </p>
                    </button>
                ))}
            </div>
        </section>
    );
}

function StationGrid({
    stations,
    onOpenStation,
}: {
    stations: WorkerStationTile[];
    onOpenStation: (workstationId: number) => void;
}) {
    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {stations.map((s) => (
                <button
                    key={s.id}
                    type="button"
                    onClick={() => onOpenStation(s.id)}
                    className="group flex min-h-24 items-center gap-4 rounded-3xl border-2 border-border bg-background p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md active:scale-[0.99]"
                >
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-surface text-text group-hover:bg-primary/10 group-hover:text-primary">
                        <Factory className="size-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-black text-text">
                                {s.name}
                            </p>
                            {s.is_general && (
                                <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-success">
                                    General
                                </span>
                            )}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-muted">
                            {s.description ||
                                (s.is_general
                                    ? "Open to everyone"
                                    : "Assigned to you")}
                        </p>
                    </div>
                </button>
            ))}
        </div>
    );
}

function EmptyState({
    icon,
    title,
    body,
}: {
    icon: React.ReactNode;
    title: string;
    body: string;
}) {
    return (
        <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-border bg-background p-10 text-center text-muted">
            {icon}
            <p className="text-sm font-semibold text-text">{title}</p>
            <p className="max-w-sm text-xs">{body}</p>
        </div>
    );
}

function LoadingCard({ label }: { label: string }) {
    return (
        <div className="flex items-center justify-center gap-2 rounded-3xl border border-border bg-surface p-10 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" />
            {label}
        </div>
    );
}

function getMsg(err: unknown): string {
    if (err instanceof Error) return err.message;
    return "Unknown error.";
}
