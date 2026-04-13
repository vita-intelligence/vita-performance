"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, X } from "lucide-react";
import { useWorkers } from "@/hooks/useWorkers";
import { useReputationTimeline } from "@/hooks/useReputationTimeline";
import { ReputationTimelineFilters } from "@/types/worker";
import { REPUTATION_TIER_COLORS, REPUTATION_TIER_LABELS } from "@/lib/utils/reputation.utils";
import ReputationFilters from "./_components/ReputationFilters";
import ReputationEventRow from "./_components/ReputationEventRow";

function filtersFromUrl(params: URLSearchParams): ReputationTimelineFilters {
    const out: ReputationTimelineFilters = {};
    const worker = params.get("worker");
    if (worker) out.worker = Number(worker);
    const search = params.get("search");
    if (search) out.search = search;
    const category = params.get("category");
    if (category === "auto" || category === "manual") out.category = category;
    const sign = params.get("sign");
    if (sign === "positive" || sign === "negative") out.sign = sign;
    const date_from = params.get("date_from");
    if (date_from) out.date_from = date_from;
    const date_to = params.get("date_to");
    if (date_to) out.date_to = date_to;
    return out;
}

function filtersToUrl(filters: ReputationTimelineFilters): string {
    const params = new URLSearchParams();
    if (filters.worker) params.set("worker", String(filters.worker));
    if (filters.search) params.set("search", filters.search);
    if (filters.category) params.set("category", filters.category);
    if (filters.sign) params.set("sign", filters.sign);
    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to) params.set("date_to", filters.date_to);
    const s = params.toString();
    return s ? `?${s}` : "";
}

export default function ReputationTimelinePage() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const [filters, setFilters] = useState<ReputationTimelineFilters>(() =>
        filtersFromUrl(new URLSearchParams(searchParams.toString()))
    );

    // Keep local state in sync if the URL changes (back/forward navigation).
    useEffect(() => {
        const next = filtersFromUrl(new URLSearchParams(searchParams.toString()));
        setFilters(next);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    const updateFilters = (next: ReputationTimelineFilters) => {
        setFilters(next);
        router.replace(`/reputation${filtersToUrl(next)}`, { scroll: false });
    };

    const { workers } = useWorkers();
    const {
        events,
        totalCount,
        isLoading,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
    } = useReputationTimeline(filters);

    const focusedWorker = useMemo(
        () => (filters.worker ? (workers ?? []).find((w) => w.id === filters.worker) : null),
        [filters.worker, workers]
    );

    // Infinite scroll sentinel
    const sentinelRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const node = sentinelRef.current;
        if (!node) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage();
                }
            },
            { rootMargin: "200px" },
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    return (
        <main className="bg-background px-4 py-12 sm:px-8 lg:px-16">
            <div className="max-w-5xl mx-auto flex flex-col gap-8">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-black text-text uppercase tracking-tight">
                        Reputation Timeline
                    </h1>
                    <p className="text-sm text-muted">
                        {focusedWorker
                            ? `Every reputation event for ${focusedWorker.full_name}.`
                            : "Every reputation event across all workers — automatic and manual."}
                    </p>
                </div>

                {/* Focused worker banner — prominent, easy to clear */}
                {focusedWorker && (
                    <div className="border border-text bg-surface px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                            <button
                                onClick={() => updateFilters({ ...filters, worker: null })}
                                className="text-muted hover:text-text transition-colors shrink-0"
                                title="Back to all workers"
                            >
                                <ArrowLeft size={18} />
                            </button>
                            <div className="flex flex-col gap-0.5 min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                                    Filtering by worker
                                </p>
                                <Link
                                    href={`/workers/${focusedWorker.id}`}
                                    className="text-xl sm:text-2xl font-black text-text uppercase tracking-tight hover:underline truncate"
                                >
                                    {focusedWorker.full_name}
                                </Link>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                            <span
                                className={`font-mono font-black text-2xl ${REPUTATION_TIER_COLORS[focusedWorker.reputation_tier]}`}
                            >
                                {focusedWorker.reputation_score}
                            </span>
                            <span className="text-[10px] uppercase tracking-widest text-muted">
                                {REPUTATION_TIER_LABELS[focusedWorker.reputation_tier]}
                            </span>
                        </div>
                        <button
                            onClick={() => updateFilters({ ...filters, worker: null })}
                            className="flex items-center gap-1 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-muted hover:text-text border border-border hover:border-text shrink-0"
                        >
                            <X size={12} />
                            Clear
                        </button>
                    </div>
                )}

                <ReputationFilters
                    workers={workers ?? []}
                    filters={filters}
                    onChange={updateFilters}
                    hideWorkerSelect={!!focusedWorker}
                />

                <div className="flex items-center gap-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                        {totalCount} event{totalCount === 1 ? "" : "s"}
                    </p>
                    <div className="h-px bg-border flex-1" />
                </div>

                {isLoading && events.length === 0 ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={28} className="animate-spin text-muted" />
                    </div>
                ) : events.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-2 border border-dashed border-border">
                        <p className="text-sm text-muted uppercase tracking-widest">No events</p>
                        <p className="text-xs text-muted">Try adjusting the filters</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {events.map((event) => (
                            <ReputationEventRow
                                key={event.id}
                                event={event}
                                hideWorker={!!focusedWorker}
                            />
                        ))}
                        <div ref={sentinelRef} className="h-12 flex items-center justify-center">
                            {isFetchingNextPage && (
                                <Loader2 size={20} className="animate-spin text-muted" />
                            )}
                            {!hasNextPage && events.length > 0 && (
                                <p className="text-xs uppercase tracking-widest text-muted">
                                    End of timeline
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
