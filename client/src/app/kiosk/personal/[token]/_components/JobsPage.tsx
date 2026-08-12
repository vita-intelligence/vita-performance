"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Calendar,
    ClipboardList,
    Clock,
    Factory,
    FlaskConical,
    Info,
    Loader2,
    RefreshCw,
    Search,
    X,
} from "lucide-react";
import { personalKioskService } from "@/services/personal-kiosk.service";
import { RndBadge, isRndProjectType } from "@/components/RndBadge";
import { JobRow } from "@/types/worker";

interface JobsPageProps {
    token: string;
    sessionToken: string;
    workerName: string;
    isClockedIn: boolean;
    onOpenJob: (row: JobRow) => void;
}

/**
 * Cross-workstation "available jobs" list. Every PSP MO currently
 * in_progress that routes to a station this worker can open shows up
 * here as one card — tapping it launches StationView for that station
 * with the MO pre-selected so the worker doesn't have to hunt through
 * the stations list to find it.
 *
 * Empty state distinguishes "PSP not integrated" from "nothing running"
 * so the worker knows whether to wait or ask a supervisor.
 */
export default function JobsPage({
    token,
    sessionToken,
    workerName,
    isClockedIn,
    onOpenJob,
}: JobsPageProps) {
    // Hard gate — jobs are actionable and require an active shift so
    // sessions attach to the right clock-in. Render an unmissable
    // notice + block navigation into the workstation until they clock
    // in from the hub.
    if (!isClockedIn) {
        return <ClockInGate title="Jobs" workerName={workerName} />;
    }
    const [rows, setRows] = useState<JobRow[] | null>(null);
    const [pspIntegrated, setPspIntegrated] = useState<boolean>(true);
    const [truncated, setTruncated] = useState<boolean>(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState("");

    const load = useCallback(
        async (isRefresh: boolean) => {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);
            try {
                // Refresh button forces a cache-bypass on the server so
                // the operator always sees the latest state.
                const res = await personalKioskService.getJobs(
                    token,
                    sessionToken,
                    { bypassCache: isRefresh },
                );
                setRows(res.items);
                setPspIntegrated(res.psp_source_of_truth);
                setTruncated(!!res.truncated);
                setError(null);
            } catch (err) {
                setError(getMsg(err));
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [token, sessionToken],
    );

    useEffect(() => {
        void load(false);
    }, [load]);

    const filtered = useMemo(() => {
        if (!rows) return [];
        const q = query.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((r) => {
            // Convenience synonyms for the R&D chip so "r&d" / "rnd" /
            // "sample" / "trial" all filter down to the right stream
            // without the operator having to know the exact wire value.
            const streamMatches =
                (q === "r&d" || q === "rnd" || q === "trial") &&
                r.project_type === "trial";
            const sampleMatches =
                q === "sample" && r.project_type === "sample";
            return (
                streamMatches ||
                sampleMatches ||
                (r.item_name ?? "").toLowerCase().includes(q) ||
                (r.item_code ?? "").toLowerCase().includes(q) ||
                (r.workstation_name ?? "").toLowerCase().includes(q) ||
                (r.workstation_group_name ?? "").toLowerCase().includes(q)
            );
        });
    }, [rows, query]);

    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-black text-text">Jobs</h1>
                    <p className="mt-0.5 text-xs text-muted">
                        {workerName} — every MO running on a station you can
                        open. Tap to jump straight in.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => void load(true)}
                    disabled={refreshing || loading}
                    aria-label="Refresh"
                    className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted transition-colors hover:bg-surface hover:text-text disabled:opacity-40"
                >
                    <RefreshCw
                        className={`size-4 ${refreshing ? "animate-spin" : ""}`}
                    />
                </button>
            </div>

            {rows && rows.length > 0 && (
                <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted" />
                    <input
                        type="text"
                        inputMode="search"
                        autoComplete="off"
                        autoCorrect="off"
                        placeholder="Filter by item, station…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full h-14 rounded-2xl border border-border bg-background pl-12 pr-11 text-lg text-text placeholder:text-muted focus:border-primary focus:outline-none"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery("")}
                            aria-label="Clear filter"
                            className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex size-8 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-text"
                        >
                            <X className="size-4" />
                        </button>
                    )}
                </div>
            )}

            {error && (
                <div className="rounded-2xl border border-danger/40 bg-danger/5 p-4 text-sm text-danger">
                    {error}
                </div>
            )}

            {loading && (
                <div className="flex items-center justify-center gap-2 rounded-3xl border border-border bg-surface p-10 text-sm text-muted">
                    <Loader2 className="size-4 animate-spin" />
                    Loading jobs…
                </div>
            )}

            {!loading && !error && rows && rows.length === 0 && (
                <EmptyState pspIntegrated={pspIntegrated} />
            )}

            {!loading && !error && filtered.length === 0 && rows && rows.length > 0 && (
                <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-border bg-background p-10 text-center text-muted">
                    <Search className="size-6 opacity-50" />
                    <p className="text-sm font-semibold text-text">No matches</p>
                    <p className="max-w-sm text-xs">
                        Nothing matches “{query.trim()}”.
                    </p>
                </div>
            )}

            {!loading && filtered.length > 0 && (
                <div className="space-y-3">
                    {truncated && (
                        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 text-xs text-amber-700 dark:text-amber-400">
                            <Info className="mt-0.5 size-4 shrink-0" />
                            <div>
                                <p className="font-semibold">Showing the top jobs only.</p>
                                <p className="mt-0.5 opacity-90">
                                    There are more in-progress MOs than we display at once. Use the search box to find the one you want.
                                </p>
                            </div>
                        </div>
                    )}
                    {filtered.map((row) => (
                        <JobCard
                            key={`${row.mo_uuid}:${row.workstation_id}`}
                            row={row}
                            onOpen={() => onOpenJob(row)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function EmptyState({ pspIntegrated }: { pspIntegrated: boolean }) {
    return (
        <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-border bg-background p-10 text-center text-muted">
            <ClipboardList className="size-6 opacity-50" />
            <p className="text-sm font-semibold text-text">
                {pspIntegrated
                    ? "No jobs running right now"
                    : "No PSP integration"}
            </p>
            <p className="max-w-sm text-xs">
                {pspIntegrated
                    ? "A supervisor needs to hit “Start production” on PSP before an MO shows up here."
                    : "Jobs are sourced from PSP. Ask a supervisor to configure the PSP integration on this tenant."}
            </p>
        </div>
    );
}

function JobCard({ row, onOpen }: { row: JobRow; onOpen: () => void }) {
    const target = toNumberOrNull(row.quantity);
    const produced = toNumberOrNull(row.quantity_produced) ?? 0;
    const hasProgress = target != null && target > 0;
    const ratio = hasProgress ? Math.min(1, produced / target) : 0;
    const percent = Math.round(ratio * 100);
    const trimmed = (n: number) => {
        const s = n.toFixed(4);
        return s.replace(/\.?0+$/, "");
    };
    const qtyLabel = hasProgress
        ? `${trimmed(produced)} / ${trimmed(target)}`
        : row.quantity != null
          ? `Qty ${row.quantity}`
          : null;
    // R&D chip when the job feeds a trial batch or a sample kit —
    // shared component so every session/MO surface uses the same
    // visual + wording.
    const isRnd = isRndProjectType(row.project_type);

    return (
        <button
            type="button"
            onClick={onOpen}
            className="group flex w-full items-start gap-4 rounded-3xl border-2 border-border bg-background p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md active:scale-[0.99]"
        >
            <div
                className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${
                    isRnd
                        ? "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                        : "bg-primary/10 text-primary"
                }`}
            >
                {isRnd ? (
                    <FlaskConical className="size-6" />
                ) : (
                    <ClipboardList className="size-6" />
                )}
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-black text-text">
                        {row.item_name ?? row.item_code ?? "MO"}
                    </p>
                    <RndBadge projectType={row.project_type} />
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                    <Factory className="size-3.5 shrink-0" />
                    <span className="truncate">{row.workstation_name}</span>
                    {row.workstation_group_name && (
                        <>
                            <span className="opacity-50">·</span>
                            <span className="truncate">
                                {row.workstation_group_name}
                            </span>
                        </>
                    )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                    {row.step_sort_order != null && (
                        <span className="rounded-full bg-surface px-2 py-0.5 font-semibold tabular-nums">
                            Step {row.step_sort_order + 1}
                        </span>
                    )}
                    {qtyLabel && (
                        <span className="rounded-full bg-surface px-2 py-0.5 font-semibold tabular-nums">
                            {qtyLabel}
                        </span>
                    )}
                    {row.due_date && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 font-semibold">
                            <Calendar className="size-3" />
                            {new Date(row.due_date).toLocaleDateString([], {
                                day: "numeric",
                                month: "short",
                            })}
                        </span>
                    )}
                </div>
                {hasProgress && (
                    <div className="mt-2 flex items-center gap-2">
                        <div
                            className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface"
                            role="progressbar"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={percent}
                        >
                            <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${percent}%` }}
                            />
                        </div>
                        <span className="text-[10px] font-semibold text-muted tabular-nums">
                            {percent}%
                        </span>
                    </div>
                )}
            </div>
        </button>
    );
}

function toNumberOrNull(v: string | number | null | undefined): number | null {
    if (v == null) return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
}

function getMsg(err: unknown): string {
    if (err instanceof Error) return err.message;
    return "Unknown error.";
}

/**
 * Full-page block shown when the worker hasn't clocked in yet. We
 * deliberately do NOT render any actionable content behind it — a
 * shift-less session would attach to no shift and pollute the
 * performance / reputation rollups.
 */
export function ClockInGate({
    title,
    workerName,
}: {
    title: string;
    workerName: string;
}) {
    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
            <div>
                <h1 className="text-2xl font-black text-text">{title}</h1>
                <p className="mt-0.5 text-xs text-muted">
                    {workerName} — clock in from the hub to unlock this
                    section.
                </p>
            </div>
            <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-warning/50 bg-warning/5 p-10 text-center">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-warning/15 text-warning">
                    <Clock className="size-7" />
                </div>
                <p className="text-lg font-black text-text">
                    You’re not clocked in yet
                </p>
                <p className="max-w-md text-sm text-muted">
                    We block this section until you clock in so every
                    session, review, and job you touch attaches to a
                    real shift.
                </p>
                <p className="max-w-md text-xs text-muted">
                    Tap the home button in the top bar, then hit
                    <span className="mx-1 rounded-md bg-surface px-1.5 py-0.5 font-black text-text">
                        Clock in
                    </span>
                    on your hub. Come back here after and pick a job.
                </p>
            </div>
        </div>
    );
}
