"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, addToast } from "@heroui/react";
import {
    ClipboardCheck,
    Clock,
    Factory,
    Loader2,
    MessageSquarePlus,
    Package,
    Search,
    ThumbsDown,
    ThumbsUp,
    UserRound,
    X,
} from "lucide-react";
import { personalKioskService } from "@/services/personal-kiosk.service";
import {
    QCFeedbackItem,
    QCPendingSession,
    QCRosterWorker,
} from "@/types/worker";

interface QCPageProps {
    token: string;
    sessionToken: string;
}

/**
 * Embedded QC review inbox. Shows every completed session that needs
 * a verdict for the tenant. The authenticated worker (already known
 * to be `is_qa=true` from the personal-kiosk session) verifies inline
 * — no jumping to /qc/<qc_token> and no second PIN prompt.
 *
 * MVP scope: list + search + verify with per-worker feedback. Filters
 * beyond a text search (date range, station chooser) are still on the
 * standalone /qc/<token> page for supervisors doing bulk triage.
 */
export default function QCPage({
    token,
    sessionToken,
}: QCPageProps) {
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState<QCPendingSession[][]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [q, setQ] = useState("");
    // The query that produced the current results — used in the empty
    // state so the copy doesn't flicker while the operator retypes.
    const [committedQ, setCommittedQ] = useState("");
    const [detail, setDetail] = useState<QCPendingSession | null>(null);
    // "Leave feedback on any worker" modal — separate flow from
    // session verification. Open with the CTA under the hero.
    const [showGeneral, setShowGeneral] = useState(false);

    const load = useCallback(
        async (nextPage: number, search: string, append: boolean) => {
            if (append) setLoadingMore(true);
            else setLoading(true);
            try {
                const res = await personalKioskService.getQCSessions(
                    token,
                    sessionToken,
                    nextPage,
                    search,
                );
                setPages((prev) =>
                    append ? [...prev, res.results] : [res.results],
                );
                setTotalCount(res.count);
                setTotalPages(res.total_pages);
                setPage(res.page);
                setError(null);
                setCommittedQ(search);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Load failed");
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
        },
        [token, sessionToken],
    );

    useEffect(() => {
        void load(1, "", false);
    }, [load]);

    const flat = useMemo(() => pages.flat(), [pages]);
    const canLoadMore = page < totalPages && !loadingMore;

    const handleSearch = () => {
        void load(1, q.trim(), false);
    };
    const handleClear = () => {
        setQ("");
        void load(1, "", false);
    };
    const handleLoadMore = () => {
        if (canLoadMore) void load(page + 1, committedQ, true);
    };

    const handleVerified = () => {
        setDetail(null);
        // Reload from page 1 so the just-verified row disappears.
        void load(1, committedQ, false);
    };

    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
            <div>
                <h1 className="text-2xl font-black text-text">Quality Control</h1>
                <p className="mt-0.5 text-xs text-muted">
                    Verify completed sessions across every workstation.
                    {totalCount > 0 && (
                        <>
                            {" "}
                            <span className="font-black text-text">
                                {totalCount}
                            </span>{" "}
                            waiting review.
                        </>
                    )}
                </p>
            </div>

            {/* Session-less feedback CTA — pick any worker and leave
                a +10 / −10 mark without a WorkSession. For behaviour,
                attitude, standing complaints and other things that
                don't map cleanly to a single session. */}
            <button
                type="button"
                onClick={() => setShowGeneral(true)}
                className="group flex items-center gap-3 rounded-3xl border-2 border-dashed border-primary/40 bg-primary/5 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md active:scale-[0.99]"
            >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                    <MessageSquarePlus className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-text">
                        Leave feedback on any worker
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted">
                        No session needed — behaviour, attitude,
                        recognitions. Pick a worker → +10 or −10 with a
                        reason.
                    </p>
                </div>
            </button>

            <SearchBar
                q={q}
                setQ={setQ}
                onSubmit={handleSearch}
                onClear={handleClear}
                busy={loading}
            />

            {error && (
                <div className="rounded-2xl border border-danger/40 bg-danger/5 p-4 text-sm text-danger">
                    {error}
                </div>
            )}

            {loading && (
                <LoadingCard label="Loading review queue…" />
            )}

            {!loading && !error && flat.length === 0 && (
                <EmptyState
                    icon={<ClipboardCheck className="size-8 opacity-50" />}
                    title={committedQ ? "No matches" : "All caught up"}
                    body={
                        committedQ
                            ? `No completed sessions match "${committedQ}".`
                            : "Nothing needs review right now."
                    }
                />
            )}

            {!loading && flat.length > 0 && (
                <>
                    <ul className="space-y-3">
                        {flat.map((s) => (
                            <li key={s.id}>
                                <SessionRow
                                    session={s}
                                    onOpen={() => setDetail(s)}
                                />
                            </li>
                        ))}
                    </ul>
                    {canLoadMore && (
                        <Button
                            variant="flat"
                            size="lg"
                            isLoading={loadingMore}
                            onPress={handleLoadMore}
                            className="w-full"
                        >
                            Load more
                        </Button>
                    )}
                </>
            )}

            {detail && (
                <VerifyModal
                    token={token}
                    sessionToken={sessionToken}
                    session={detail}
                    onClose={() => setDetail(null)}
                    onVerified={handleVerified}
                />
            )}

            {showGeneral && (
                <GeneralFeedbackModal
                    token={token}
                    sessionToken={sessionToken}
                    onClose={() => setShowGeneral(false)}
                />
            )}
        </div>
    );
}

/* ================================================================== */

function SearchBar({
    q,
    setQ,
    onSubmit,
    onClear,
    busy,
}: {
    q: string;
    setQ: (v: string) => void;
    onSubmit: () => void;
    onClear: () => void;
    busy: boolean;
}) {
    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                onSubmit();
            }}
            className="flex flex-col gap-2 sm:flex-row"
        >
            <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted" />
                <input
                    type="text"
                    inputMode="search"
                    autoComplete="off"
                    placeholder="Search worker, station or item…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="w-full h-14 rounded-2xl border border-border bg-background pl-12 pr-11 text-lg text-text placeholder:text-muted focus:border-primary focus:outline-none"
                />
                {q && (
                    <button
                        type="button"
                        onClick={onClear}
                        aria-label="Clear search"
                        className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex size-8 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-text"
                    >
                        <X className="size-4" />
                    </button>
                )}
            </div>
            <Button
                type="submit"
                color="primary"
                size="lg"
                isLoading={busy}
                startContent={!busy ? <Search className="size-4" /> : undefined}
                className="h-14 sm:w-32"
            >
                Search
            </Button>
        </form>
    );
}

function SessionRow({
    session,
    onOpen,
}: {
    session: QCPendingSession;
    onOpen: () => void;
}) {
    const when = session.end_time ? new Date(session.end_time) : null;
    return (
        <button
            type="button"
            onClick={onOpen}
            className="group w-full flex items-start gap-4 rounded-3xl border-2 border-border bg-background p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md active:scale-[0.99]"
        >
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Factory className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-text truncate">
                    {session.workstation_name ?? "—"}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted">
                    {session.item_name ?? "No item"}
                    {" · "}
                    {session.workers.map((w) => w.name).join(", ") || "no workers"}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                    {session.duration_hours != null && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 font-semibold">
                            <Clock className="size-3" />
                            {session.duration_hours.toFixed(1)}h
                        </span>
                    )}
                    {session.quantity_produced != null && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 font-semibold tabular-nums">
                            <Package className="size-3" />
                            {session.quantity_produced}
                            {session.workstation_uom
                                ? ` ${session.workstation_uom}`
                                : ""}
                        </span>
                    )}
                    {when && (
                        <span className="text-muted">
                            {when.toLocaleString([], {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </span>
                    )}
                </div>
            </div>
        </button>
    );
}

/* ------------------------ VERIFY MODAL ------------------------ */

interface WorkerFeedbackState {
    mark: "positive" | "negative" | null;
    reason: string;
}

function VerifyModal({
    token,
    sessionToken,
    session,
    onClose,
    onVerified,
}: {
    token: string;
    sessionToken: string;
    session: QCPendingSession;
    onClose: () => void;
    onVerified: () => void;
}) {
    const [rejected, setRejected] = useState<string>("0");
    const [feedback, setFeedback] = useState<Record<number, WorkerFeedbackState>>(
        () =>
            Object.fromEntries(
                session.workers.map((w) => [
                    w.id,
                    { mark: null, reason: "" } as WorkerFeedbackState,
                ]),
            ),
    );
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const setWorker = (id: number, patch: Partial<WorkerFeedbackState>) =>
        setFeedback((prev) => ({
            ...prev,
            [id]: { ...prev[id], ...patch },
        }));

    const handleVerify = async () => {
        setBusy(true);
        setErr(null);
        try {
            const items: QCFeedbackItem[] = [];
            for (const w of session.workers) {
                const row = feedback[w.id];
                if (!row?.mark) continue;
                if (!row.reason.trim()) {
                    setErr(`Reason required for ${w.name}.`);
                    setBusy(false);
                    return;
                }
                items.push({
                    worker_id: w.id,
                    mark: row.mark,
                    reason: row.reason.trim(),
                });
            }
            const qty = Number(rejected);
            await personalKioskService.verifyQCSession(
                token,
                session.id,
                sessionToken,
                {
                    quantityRejected: Number.isFinite(qty) ? qty : 0,
                    feedback: items,
                },
            );
            addToast({
                title: "Verified",
                description: `Session on ${session.workstation_name ?? ""} closed.`,
                color: "success",
            });
            onVerified();
        } catch (e) {
            addToast({
                title: "Verify failed",
                description: e instanceof Error ? e.message : "Unknown",
                color: "danger",
            });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
            <div className="w-full max-w-lg overflow-y-auto max-h-[90dvh] rounded-3xl border border-border bg-background p-5 shadow-2xl">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-widest text-muted">
                            Review session
                        </p>
                        <h2 className="mt-1 text-lg font-black text-text truncate">
                            {session.workstation_name ?? "—"}
                        </h2>
                        <p className="mt-0.5 text-xs text-muted truncate">
                            {session.item_name ?? "No item"}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="shrink-0 inline-flex size-9 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-text"
                    >
                        <X className="size-4" />
                    </button>
                </div>

                <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                                Produced
                            </p>
                            <p className="mt-0.5 font-black tabular-nums text-text">
                                {session.quantity_produced ?? "—"}
                                {session.workstation_uom
                                    ? ` ${session.workstation_uom}`
                                    : ""}
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                                Duration
                            </p>
                            <p className="mt-0.5 font-black tabular-nums text-text">
                                {session.duration_hours != null
                                    ? `${session.duration_hours.toFixed(1)}h`
                                    : "—"}
                            </p>
                        </div>
                    </div>
                    <label className="mt-4 block text-[10px] font-bold uppercase tracking-wider text-muted">
                        Quantity rejected {session.workstation_uom ? `(${session.workstation_uom})` : ""}
                    </label>
                    <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        value={rejected}
                        onChange={(e) => setRejected(e.target.value)}
                        className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-2 text-sm text-text tabular-nums focus:border-primary focus:outline-none"
                    />
                </div>

                <div className="mt-4 space-y-3">
                    <p className="text-[11px] font-black uppercase tracking-widest text-text">
                        Feedback per worker
                    </p>
                    {session.workers.length === 0 && (
                        <p className="text-xs text-muted">No workers on this session.</p>
                    )}
                    {session.workers.map((w) => (
                        <WorkerFeedbackRow
                            key={w.id}
                            name={w.name}
                            state={feedback[w.id]}
                            onChange={(patch) => setWorker(w.id, patch)}
                        />
                    ))}
                </div>

                {err && (
                    <p className="mt-3 text-xs text-danger">{err}</p>
                )}

                <div className="mt-5 flex gap-2">
                    <Button
                        variant="light"
                        onPress={onClose}
                        isDisabled={busy}
                        className="flex-1"
                    >
                        Cancel
                    </Button>
                    <Button
                        color="primary"
                        isLoading={busy}
                        onPress={handleVerify}
                        className="flex-1"
                    >
                        Verify
                    </Button>
                </div>
            </div>
        </div>
    );
}

function WorkerFeedbackRow({
    name,
    state,
    onChange,
}: {
    name: string;
    state: WorkerFeedbackState;
    onChange: (patch: Partial<WorkerFeedbackState>) => void;
}) {
    const posSelected = state.mark === "positive";
    const negSelected = state.mark === "negative";
    return (
        <div className="rounded-2xl border border-border bg-background p-3">
            <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <UserRound className="size-4" />
                </div>
                <p className="text-sm font-black text-text">{name}</p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                    type="button"
                    onClick={() =>
                        onChange({
                            mark: posSelected ? null : "positive",
                        })
                    }
                    className={`inline-flex items-center justify-center gap-1.5 rounded-2xl border-2 py-2 text-xs font-black transition-colors ${
                        posSelected
                            ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "border-border text-muted hover:border-emerald-500/40 hover:text-emerald-600"
                    }`}
                >
                    <ThumbsUp className="size-3.5" />
                    +10
                </button>
                <button
                    type="button"
                    onClick={() =>
                        onChange({
                            mark: negSelected ? null : "negative",
                        })
                    }
                    className={`inline-flex items-center justify-center gap-1.5 rounded-2xl border-2 py-2 text-xs font-black transition-colors ${
                        negSelected
                            ? "border-rose-500/60 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                            : "border-border text-muted hover:border-rose-500/40 hover:text-rose-600"
                    }`}
                >
                    <ThumbsDown className="size-3.5" />
                    −10
                </button>
            </div>
            {(posSelected || negSelected) && (
                <input
                    type="text"
                    placeholder="Reason (required)"
                    value={state.reason}
                    onChange={(e) => onChange({ reason: e.target.value })}
                    className="mt-2 w-full rounded-2xl border border-border bg-surface px-3 py-2 text-xs text-text focus:border-primary focus:outline-none"
                />
            )}
        </div>
    );
}

/* --------- utils --------- */

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

/* ------------------------ GENERAL FEEDBACK ------------------------ */

/**
 * Session-less feedback modal. Two panes: a worker search when nobody
 * is selected, and a +10 / −10 form once someone is. Used for
 * behaviour, attitude and shout-outs that don't map to a WorkSession.
 */
function GeneralFeedbackModal({
    token,
    sessionToken,
    onClose,
}: {
    token: string;
    sessionToken: string;
    onClose: () => void;
}) {
    const [q, setQ] = useState("");
    const [committedQ, setCommittedQ] = useState("");
    const [hits, setHits] = useState<QCRosterWorker[]>([]);
    const [searching, setSearching] = useState(false);
    const [picked, setPicked] = useState<QCRosterWorker | null>(null);
    const [mark, setMark] = useState<"positive" | "negative" | null>(null);
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);

    const runSearch = async () => {
        const trimmed = q.trim();
        if (!trimmed) return;
        setSearching(true);
        try {
            const r = await personalKioskService.searchQCWorkers(
                token,
                sessionToken,
                trimmed,
            );
            setHits(r);
            setCommittedQ(trimmed);
        } catch (err) {
            addToast({
                title: "Search failed",
                description: err instanceof Error ? err.message : "Unknown",
                color: "danger",
            });
        } finally {
            setSearching(false);
        }
    };

    const handleSubmit = async () => {
        if (!picked || !mark) return;
        if (!reason.trim()) {
            addToast({
                title: "Reason required",
                description: "Say why you're leaving this mark.",
                color: "warning",
            });
            return;
        }
        setBusy(true);
        try {
            const res = await personalKioskService.leaveGeneralFeedback(
                token,
                sessionToken,
                picked.id,
                mark,
                reason.trim(),
            );
            addToast({
                title: "Feedback recorded",
                description: `${picked.full_name} · reputation now ${res.reputation_score}`,
                color: "success",
            });
            onClose();
        } catch (err) {
            addToast({
                title: "Couldn't record",
                description: err instanceof Error ? err.message : "Unknown",
                color: "danger",
            });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
            <div className="w-full max-w-md overflow-y-auto max-h-[90dvh] rounded-3xl border border-border bg-background p-5 shadow-2xl">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-xs font-black uppercase tracking-widest text-muted">
                            General feedback
                        </p>
                        <h2 className="mt-1 text-lg font-black text-text">
                            {picked ? picked.full_name : "Pick a worker"}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="inline-flex size-9 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-text"
                        disabled={busy}
                    >
                        <X className="size-4" />
                    </button>
                </div>

                {!picked ? (
                    <>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (q.trim()) void runSearch();
                            }}
                            className="mt-4 flex gap-2"
                        >
                            <div className="relative flex-1">
                                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
                                <input
                                    autoFocus
                                    type="text"
                                    inputMode="search"
                                    placeholder="Search by name…"
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    className="w-full h-12 rounded-2xl border border-border bg-surface pl-9 pr-3 text-sm text-text focus:border-primary focus:outline-none"
                                />
                            </div>
                            <Button
                                type="submit"
                                color="primary"
                                isLoading={searching}
                                isDisabled={!q.trim()}
                                startContent={
                                    !searching ? (
                                        <Search className="size-4" />
                                    ) : undefined
                                }
                                className="h-12 shrink-0"
                            >
                                Search
                            </Button>
                        </form>

                        <div className="mt-3 max-h-[50dvh] overflow-y-auto">
                            {committedQ && hits.length === 0 && !searching && (
                                <p className="py-6 text-center text-xs text-muted">
                                    No worker matches "{committedQ}".
                                </p>
                            )}
                            <ul className="space-y-2">
                                {hits.map((w) => (
                                    <li key={w.id}>
                                        <button
                                            type="button"
                                            onClick={() => setPicked(w)}
                                            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-background p-3 text-left transition-colors hover:border-primary/40 hover:bg-surface"
                                        >
                                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">
                                                {initials(w.full_name)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-black text-text">
                                                    {w.full_name}
                                                </p>
                                                <p className="mt-0.5 text-[11px] text-muted">
                                                    {w.group_name ?? "—"} · rep{" "}
                                                    <span className="font-black text-text tabular-nums">
                                                        {w.reputation_score}
                                                    </span>
                                                </p>
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </>
                ) : (
                    <>
                        <button
                            type="button"
                            onClick={() => setPicked(null)}
                            className="mt-3 text-xs font-semibold text-muted hover:text-text"
                        >
                            ← Pick a different worker
                        </button>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() =>
                                    setMark(mark === "positive" ? null : "positive")
                                }
                                className={`inline-flex items-center justify-center gap-1.5 rounded-2xl border-2 py-3 text-sm font-black transition-colors ${
                                    mark === "positive"
                                        ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                        : "border-border text-muted hover:border-emerald-500/40 hover:text-emerald-600"
                                }`}
                            >
                                <ThumbsUp className="size-4" />
                                +10
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    setMark(mark === "negative" ? null : "negative")
                                }
                                className={`inline-flex items-center justify-center gap-1.5 rounded-2xl border-2 py-3 text-sm font-black transition-colors ${
                                    mark === "negative"
                                        ? "border-rose-500/60 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                        : "border-border text-muted hover:border-rose-500/40 hover:text-rose-600"
                                }`}
                            >
                                <ThumbsDown className="size-4" />
                                −10
                            </button>
                        </div>

                        <label className="mt-4 block text-[11px] font-semibold uppercase tracking-wider text-muted">
                            Reason (required)
                        </label>
                        <textarea
                            rows={3}
                            placeholder="e.g. Volunteered to stay late and finish the CIP"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="mt-1 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text focus:border-primary focus:outline-none"
                        />

                        <div className="mt-5 flex gap-2">
                            <Button
                                variant="light"
                                onPress={onClose}
                                isDisabled={busy}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                color="primary"
                                isLoading={busy}
                                onPress={handleSubmit}
                                isDisabled={!mark || !reason.trim()}
                                className="flex-1"
                            >
                                Submit
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

