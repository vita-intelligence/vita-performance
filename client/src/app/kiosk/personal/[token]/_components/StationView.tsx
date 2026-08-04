"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, addToast } from "@heroui/react";
import {
    BookOpen,
    Calendar,
    ChevronLeft,
    Clipboard,
    ClipboardList,
    Factory,
    Loader2,
    Maximize2,
    Package,
    Play,
    Radio,
    Search,
    Square,
    X,
} from "lucide-react";
import { personalKioskService } from "@/services/personal-kiosk.service";
import {
    StationContextPayload,
    StationItem,
    StationMORow,
    StationSession,
} from "@/types/worker";
import SessionCompletedScreen from "./SessionCompletedScreen";

interface StationViewProps {
    token: string;
    sessionToken: string;
    workstationId: number;
    onBack: () => void;
}

/**
 * In-app "run a session on this workstation" panel. Embedded inside
 * the personal kiosk so a worker never has to switch to the standalone
 * `/kiosk/<workstation-token>` page and re-enter their PIN.
 *
 * Two modes:
 *   idle    — pick an item (optional), tap Start
 *   running — timer + Stop button that prompts for quantity produced
 *
 * Everything talks to the personal-kiosk session-authenticated
 * endpoints, so the worker's identity + shift are proven from their
 * cached session_token.
 */
export default function StationView({
    token,
    sessionToken,
    workstationId,
    onBack,
}: StationViewProps) {
    const [context, setContext] = useState<StationContextPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const res = await personalKioskService.getStationContext(
                token,
                workstationId,
                sessionToken,
            );
            setContext(res);
            setError(null);
        } catch (err) {
            setError(getMsg(err));
        } finally {
            setLoading(false);
        }
    }, [token, workstationId, sessionToken]);

    useEffect(() => {
        setLoading(true);
        void load();
    }, [load]);

    if (loading) {
        return (
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
                <BackChip onBack={onBack} />
                <div className="flex items-center justify-center gap-2 rounded-3xl border border-border bg-surface p-16 text-sm text-muted">
                    <Loader2 className="size-4 animate-spin" />
                    Loading station…
                </div>
            </div>
        );
    }

    if (error || !context) {
        return (
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
                <BackChip onBack={onBack} />
                <div className="rounded-3xl border border-danger/40 bg-danger/5 p-6 text-sm text-danger">
                    {error ?? "Couldn't load station."}
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
            <BackChip onBack={onBack} />

            <StationHero workstation={context.workstation} />

            {context.active_session ? (
                <RunningPanel
                    token={token}
                    sessionToken={sessionToken}
                    session={context.active_session}
                    uom={context.workstation.uom}
                    sopContent={context.workstation.sop_content}
                    sopUpdatedAt={context.workstation.sop_updated_at}
                    workstationDescription={context.workstation.description}
                    onStopped={() => {
                        // No toast — the celebration screen inside
                        // RunningPanel is the "well done" moment; a
                        // stacked toast would land ON TOP of it.
                        void load();
                    }}
                />
            ) : context.tenant_psp_integrated ||
              context.workstation.psp_source_of_truth ? (
                <PspStartPanel
                    token={token}
                    sessionToken={sessionToken}
                    workstationId={workstationId}
                    onStarted={() => {
                        addToast({
                            title: "Session started",
                            description: `Running on ${context.workstation.name}.`,
                            color: "success",
                        });
                        void load();
                    }}
                />
            ) : (
                <StartPanel
                    token={token}
                    sessionToken={sessionToken}
                    workstationId={workstationId}
                    initialItems={context.items}
                    onStarted={() => {
                        addToast({
                            title: "Session started",
                            description: `Running on ${context.workstation.name}.`,
                            color: "success",
                        });
                        void load();
                    }}
                />
            )}
        </div>
    );
}

/* ================================================================== */

function BackChip({ onBack }: { onBack: () => void }) {
    return (
        <button
            type="button"
            onClick={onBack}
            className="inline-flex w-fit items-center gap-1 text-xs font-semibold text-muted hover:text-text"
        >
            <ChevronLeft className="size-4" />
            Back to stations
        </button>
    );
}

function StationHero({
    workstation,
}: {
    workstation: StationContextPayload["workstation"];
}) {
    return (
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-indigo-500 via-blue-500 to-sky-500 p-6 text-white shadow-xl">
            <div className="absolute -right-8 -top-10 size-48 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex items-center gap-4">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
                    <Factory className="size-7" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
                        Workstation
                    </p>
                    <p className="mt-0.5 text-2xl font-black truncate">
                        {workstation.name}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-white/85">
                        {workstation.is_general && (
                            <span className="rounded-full bg-white/15 px-2 py-0.5 font-semibold uppercase">
                                General
                            </span>
                        )}
                        {workstation.uom && (
                            <span className="rounded-full bg-white/15 px-2 py-0.5 font-semibold">
                                UoM · {workstation.uom}
                            </span>
                        )}
                    </div>
                </div>
            </div>
            {workstation.description && (
                <p className="relative mt-4 text-sm text-white/90">
                    {workstation.description}
                </p>
            )}
        </div>
    );
}

/* ------------------------ PSP START (MO picker) ------------------------ */

/**
 * PSP-linked stations don't let workers pick arbitrary items — the
 * only work that can happen here is an MO step that PSP has flagged
 * as `in_progress` AND routed to this station. This panel loads that
 * list, shows one card per MO step, and starts the session bound to
 * the chosen MO/step uuids so PSP can match the labour-time back to
 * the right cost bucket.
 */
function PspStartPanel({
    token,
    sessionToken,
    workstationId,
    onStarted,
}: {
    token: string;
    sessionToken: string;
    workstationId: number;
    onStarted: () => void;
}) {
    const [mos, setMOs] = useState<StationMORow[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [startingKey, setStartingKey] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await personalKioskService.getStationMOs(
                    token,
                    workstationId,
                    sessionToken,
                );
                if (!cancelled) {
                    setMOs(res.items);
                    setError(null);
                }
            } catch (err) {
                if (!cancelled) setError(getMsg(err));
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [token, workstationId, sessionToken]);

    if (error) {
        return (
            <div className="rounded-3xl border border-danger/40 bg-danger/5 p-6 text-sm text-danger">
                {error}
            </div>
        );
    }

    if (mos === null) {
        return (
            <div className="flex items-center justify-center gap-2 rounded-3xl border border-border bg-surface p-16 text-sm text-muted">
                <Loader2 className="size-4 animate-spin" />
                Loading MOs from PSP…
            </div>
        );
    }

    if (mos.length === 0) {
        return (
            <div className="rounded-3xl border border-dashed border-border bg-surface p-10 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-background text-muted">
                    <Clipboard className="size-5" />
                </div>
                <p className="mt-3 text-sm font-semibold text-text">
                    No approved MOs running here right now
                </p>
                <p className="mt-1 text-xs text-muted">
                    A supervisor needs to hit "Start production" on
                    PSP before an MO shows up on this station.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-text">
                    Pick an MO
                </h2>
                <p className="mt-0.5 text-xs text-muted">
                    Only MOs approved and running on the floor are
                    shown. Tap one to start.
                </p>
            </div>
            {mos.map((row) => {
                const key = `${row.mo_uuid}:${row.step_uuid}`;
                return (
                    <MOCard
                        key={key}
                        row={row}
                        busy={startingKey === key}
                        onStart={() =>
                            startPspMO({
                                token,
                                workstationId,
                                sessionToken,
                                row,
                                onStarted,
                                setBusy: (v) => setStartingKey(v ? key : null),
                            })
                        }
                    />
                );
            })}
        </div>
    );
}

async function startPspMO({
    token,
    workstationId,
    sessionToken,
    row,
    onStarted,
    setBusy,
}: {
    token: string;
    workstationId: number;
    sessionToken: string;
    row: StationMORow;
    onStarted: () => void;
    setBusy: (v: boolean) => void;
}) {
    setBusy(true);
    try {
        await personalKioskService.startStationSession(
            token,
            workstationId,
            sessionToken,
            {
                activityKind: "mo",
                moUuid: row.mo_uuid,
                moStepUuid: row.step_uuid,
                // MO items live on PSP, not the local mirror, so we
                // snapshot the item name at start-time onto the session
                // via override_task_name. Without this the running /
                // completion screens fall back to "Generic session".
                itemName: row.item_name,
                // Passing the group uuid lets the BE fetch throughput
                // from PSP and stamp override_target_* on the session,
                // so performance % can be scored on stop.
                workstationGroupUuid: row.workstation_group_uuid,
            },
        );
        onStarted();
    } catch (err) {
        addToast({
            title: "Couldn't start",
            description: getMsg(err),
            color: "danger",
        });
    } finally {
        setBusy(false);
    }
}

function MOCard({
    row,
    busy,
    onStart,
}: {
    row: StationMORow;
    busy: boolean;
    onStart: () => void;
}) {
    return (
        <div className="rounded-3xl border-2 border-border bg-background p-4 transition-colors hover:border-primary/40">
            <div className="flex items-start gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Clipboard className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-text truncate">
                        {row.item_name ?? "MO"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted truncate">
                        {row.step_name}
                        {row.workstation_group_name && (
                            <> · {row.workstation_group_name}</>
                        )}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                        {row.quantity != null && (
                            <span className="rounded-full bg-surface px-2 py-0.5 font-semibold tabular-nums">
                                Qty {row.quantity}
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
                </div>
                <Button
                    color="primary"
                    isLoading={busy}
                    startContent={!busy ? <Play className="size-4" /> : undefined}
                    onPress={onStart}
                    className="shrink-0"
                >
                    Start
                </Button>
            </div>
        </div>
    );
}

/* ------------------------ START ------------------------ */

function StartPanel({
    token,
    sessionToken,
    workstationId,
    initialItems,
    onStarted,
}: {
    token: string;
    sessionToken: string;
    workstationId: number;
    initialItems: StationItem[];
    onStarted: () => void;
}) {
    const [selectedItem, setSelectedItem] = useState<StationItem | null>(null);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [activityLabel, setActivityLabel] = useState("");

    const handleStart = async () => {
        setBusy(true);
        try {
            await personalKioskService.startStationSession(
                token,
                workstationId,
                sessionToken,
                {
                    itemId: selectedItem?.id ?? null,
                    activityKind: selectedItem ? "mo" : "other",
                    activityLabel: selectedItem ? null : activityLabel || null,
                },
            );
            onStarted();
        } catch (err) {
            addToast({
                title: "Couldn't start",
                description: getMsg(err),
                color: "danger",
            });
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <div className="rounded-3xl border border-border bg-surface p-5">
                <div className="mb-4">
                    <h2 className="text-sm font-black uppercase tracking-widest text-text">
                        What are you working on?
                    </h2>
                    <p className="mt-0.5 text-xs text-muted">
                        Optional — leave blank for a generic session.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    className={`flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition-colors ${
                        selectedItem
                            ? "border-primary/40 bg-primary/5"
                            : "border-dashed border-border bg-background hover:border-primary/40"
                    }`}
                >
                    <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Package className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        {selectedItem ? (
                            <>
                                <p className="text-sm font-black text-text truncate">
                                    {selectedItem.name}
                                </p>
                                <p className="text-[11px] text-muted">
                                    Item · tap to change
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="text-sm font-semibold text-text">
                                    Pick an item
                                </p>
                                <p className="text-[11px] text-muted">
                                    Or leave blank for a generic session
                                </p>
                            </>
                        )}
                    </div>
                    {selectedItem && (
                        <span
                            role="button"
                            aria-label="Clear item"
                            className="inline-flex size-8 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-text"
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedItem(null);
                            }}
                        >
                            <X className="size-4" />
                        </span>
                    )}
                </button>

                {!selectedItem && (
                    <div className="mt-4">
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                            Task description (optional)
                        </label>
                        <input
                            type="text"
                            placeholder='e.g. "Cleaning between runs"'
                            value={activityLabel}
                            onChange={(e) => setActivityLabel(e.target.value)}
                            className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none"
                        />
                    </div>
                )}
            </div>

            <Button
                color="primary"
                size="lg"
                isLoading={busy}
                startContent={!busy ? <Play className="size-5" /> : undefined}
                onPress={handleStart}
                className="h-16 w-full text-base font-black"
            >
                Start session
            </Button>

            {pickerOpen && (
                <ItemPicker
                    token={token}
                    sessionToken={sessionToken}
                    workstationId={workstationId}
                    initialItems={initialItems}
                    onPick={(item) => {
                        setSelectedItem(item);
                        setPickerOpen(false);
                    }}
                    onClose={() => setPickerOpen(false)}
                />
            )}
        </>
    );
}

function ItemPicker({
    token,
    sessionToken,
    workstationId,
    initialItems,
    onPick,
    onClose,
}: {
    token: string;
    sessionToken: string;
    workstationId: number;
    initialItems: StationItem[];
    onPick: (item: StationItem) => void;
    onClose: () => void;
}) {
    const [q, setQ] = useState("");
    const [items, setItems] = useState<StationItem[]>(initialItems);
    const [busy, setBusy] = useState(false);
    // Debounce so a fast typer doesn't hammer the endpoint.
    const timer = useRef<number | null>(null);

    useEffect(() => {
        if (timer.current) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(async () => {
            setBusy(true);
            try {
                const res = await personalKioskService.searchStationItems(
                    token,
                    workstationId,
                    sessionToken,
                    q,
                );
                setItems(res);
            } catch {
                // silent — leave last-known list.
            } finally {
                setBusy(false);
            }
        }, 250);
        return () => {
            if (timer.current) window.clearTimeout(timer.current);
        };
    }, [q, token, workstationId, sessionToken]);

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
            <div className="w-full max-w-md rounded-3xl border border-border bg-background p-4 shadow-2xl">
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
                        <input
                            type="text"
                            autoFocus
                            placeholder="Search items…"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            className="w-full h-12 rounded-2xl border border-border bg-surface pl-10 pr-4 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none"
                        />
                    </div>
                    <Button
                        variant="light"
                        onPress={onClose}
                        aria-label="Close"
                        className="h-12"
                    >
                        <X className="size-4" />
                    </Button>
                </div>

                <div className="mt-3 max-h-[60dvh] overflow-y-auto">
                    {busy && (
                        <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted">
                            <Loader2 className="size-3.5 animate-spin" />
                            Searching…
                        </div>
                    )}
                    {!busy && items.length === 0 && (
                        <div className="py-10 text-center text-xs text-muted">
                            No items match "{q}".
                        </div>
                    )}
                    <ul className="divide-y divide-border">
                        {items.map((i) => (
                            <li key={i.id}>
                                <button
                                    type="button"
                                    onClick={() => onPick(i)}
                                    className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-surface"
                                >
                                    <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                        <Package className="size-4" />
                                    </div>
                                    <span className="truncate text-sm font-semibold text-text">
                                        {i.name}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}

/* ------------------------ RUNNING ------------------------ */

function RunningPanel({
    token,
    sessionToken,
    session,
    uom,
    sopContent,
    sopUpdatedAt,
    workstationDescription,
    onStopped,
}: {
    token: string;
    sessionToken: string;
    session: StationSession;
    uom: string;
    sopContent: string;
    sopUpdatedAt: string | null;
    workstationDescription: string;
    onStopped: () => void;
}) {
    const [nowMs, setNowMs] = useState(() => Date.now());
    const [qty, setQty] = useState("");
    const [notes, setNotes] = useState("");
    const [busy, setBusy] = useState(false);
    const [confirmingStop, setConfirmingStop] = useState(false);
    // Populated on successful Stop — triggers the fullscreen celebration
    // overlay. `onStopped()` fires only when the operator (or the 8s
    // auto-dismiss) closes the overlay, so context reload doesn't
    // unmount the animation mid-count-up.
    const [completedSession, setCompletedSession] =
        useState<StationSession | null>(null);

    useEffect(() => {
        const id = setInterval(() => setNowMs(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    const handleStop = async () => {
        setBusy(true);
        try {
            const parsed = qty.trim() === "" ? null : Number(qty);
            if (parsed !== null && (Number.isNaN(parsed) || parsed < 0)) {
                throw new Error("Quantity must be a non-negative number.");
            }
            const done = await personalKioskService.stopStationSession(
                token,
                session.id,
                sessionToken,
                {
                    quantityProduced: parsed,
                    notes: notes.trim() || undefined,
                },
            );
            setCompletedSession(done);
        } catch (err) {
            addToast({
                title: "Couldn't stop",
                description: getMsg(err),
                color: "danger",
            });
        } finally {
            setBusy(false);
        }
    };

    if (completedSession) {
        return (
            <SessionCompletedScreen
                session={completedSession}
                onDone={onStopped}
            />
        );
    }

    return (
        <div className="space-y-4">
            <div className="rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-cyan-500/10 p-6">
                <div className="flex items-start gap-4">
                    <div className="relative flex size-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                        <Radio className="size-6" />
                        <span className="absolute -right-0.5 -top-0.5 flex size-3">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                            <span className="relative inline-flex size-3 rounded-full bg-emerald-500" />
                        </span>
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                            Session running
                        </p>
                        <p className="mt-1 text-3xl font-black tabular-nums text-text">
                            {formatElapsed(nowMs, session.started_at)}
                        </p>
                        <p className="mt-0.5 truncate text-sm text-muted">
                            {session.item_name ??
                                session.activity_label ??
                                "Generic session"}
                        </p>
                    </div>
                </div>
            </div>

            <OperationDescriptionCard
                session={session}
                workstationDescription={workstationDescription}
            />

            <SopCard content={sopContent} updatedAt={sopUpdatedAt} />

            {!confirmingStop ? (
                <Button
                    color="danger"
                    size="lg"
                    onPress={() => setConfirmingStop(true)}
                    startContent={<Square className="size-5" />}
                    className="h-16 w-full text-base font-black"
                >
                    Stop session
                </Button>
            ) : (
                <div className="rounded-3xl border border-border bg-surface p-5">
                    <div className="mb-3">
                        <h2 className="text-sm font-black uppercase tracking-widest text-text">
                            Stop this session?
                        </h2>
                        <p className="mt-0.5 text-xs text-muted">
                            Enter how much you produced so performance
                            can be calculated. Leave blank if not
                            applicable.
                        </p>
                    </div>

                    <label className="mt-2 block text-[11px] font-semibold uppercase tracking-wider text-muted">
                        Quantity produced {uom ? `(${uom})` : ""}
                    </label>
                    <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        placeholder="0"
                        value={qty}
                        onChange={(e) => setQty(e.target.value)}
                        className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-lg font-black text-text tabular-nums focus:border-primary focus:outline-none"
                    />

                    <label className="mt-4 block text-[11px] font-semibold uppercase tracking-wider text-muted">
                        Notes (optional)
                    </label>
                    <textarea
                        rows={2}
                        placeholder="Anything worth flagging for the reviewer"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-text focus:border-primary focus:outline-none"
                    />

                    <div className="mt-4 flex gap-2">
                        <Button
                            variant="light"
                            onPress={() => setConfirmingStop(false)}
                            isDisabled={busy}
                            className="flex-1"
                        >
                            Keep running
                        </Button>
                        <Button
                            color="danger"
                            isLoading={busy}
                            onPress={handleStop}
                            startContent={
                                !busy ? <Square className="size-4" /> : undefined
                            }
                            className="flex-1"
                        >
                            Stop
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

/* --------- utils --------- */

/* ------------------------ SOP + OPERATION ------------------------ */

/**
 * "What am I doing right now" card. Prefers the PSP MO step's
 * operation description when the session is MO-attributed — that's
 * the specific work for THIS MO. Falls back to the workstation's
 * generic description for cleaning / maintenance sessions so the
 * operator still sees standing instructions.
 */
function OperationDescriptionCard({
    session,
    workstationDescription,
}: {
    session: StationSession;
    workstationDescription: string;
}) {
    const [readerOpen, setReaderOpen] = useState(false);
    const text = session.operation_description || workstationDescription;
    if (!text) return null;

    const isMoSpecific = !!session.operation_description;
    // Long-content threshold — anything past 4 lines / ~350 chars
    // gets a "Read full" affordance so the running screen doesn't
    // scroll for 20 seconds to reach the Stop button.
    const isLong = text.length > 350 || text.split("\n").length > 4;
    const title = isMoSpecific ? "Operation" : "Station notes";
    const subtitle = isMoSpecific
        ? "From the PSP MO step"
        : "Default instructions for this workstation";

    return (
        <>
            <div className="rounded-3xl border-2 border-primary/30 bg-primary/5 p-5">
                <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                            <ClipboardList className="size-4" />
                        </div>
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-widest text-primary">
                                {title}
                            </p>
                            <p className="text-[10px] text-muted">{subtitle}</p>
                        </div>
                    </div>
                    {isLong && (
                        <button
                            type="button"
                            onClick={() => setReaderOpen(true)}
                            className="shrink-0 inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-primary hover:bg-primary/25"
                        >
                            <Maximize2 className="size-3" />
                            Full
                        </button>
                    )}
                </div>
                {/* Cap inline preview at ~4 lines with a fade so long
                    text is obvious there's more to read. */}
                <div
                    className={
                        isLong
                            ? "relative max-h-24 overflow-hidden"
                            : "relative"
                    }
                >
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-text">
                        {text}
                    </p>
                    {isLong && (
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-primary/5 to-transparent" />
                    )}
                </div>
            </div>

            {readerOpen && (
                <FullscreenReader
                    title={title}
                    subtitle={subtitle}
                    content={text}
                    onClose={() => setReaderOpen(false)}
                />
            )}
        </>
    );
}

/**
 * SOP viewer — opens a fullscreen reader on tap because SOPs are
 * routinely pages long (safety, allergen, cleaning). Inline preview
 * is deliberately compact so the running screen stays scannable.
 * Empty state nudges a supervisor to fill it in.
 */
function SopCard({
    content,
    updatedAt,
}: {
    content: string;
    updatedAt: string | null;
}) {
    const [readerOpen, setReaderOpen] = useState(false);
    const isEmpty = !content.trim();

    if (isEmpty) {
        return (
            <div className="rounded-3xl border border-dashed border-border bg-surface p-4">
                <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-background text-muted">
                        <BookOpen className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-black uppercase tracking-widest text-muted">
                            SOP
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted">
                            No SOP written for this station yet. Ask a
                            supervisor to add one.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Give a 2-line snippet so the operator knows what the SOP is
    // about without needing to open the reader for a familiar station.
    const snippet = content.trim().split("\n").slice(0, 2).join("\n");
    const updatedLabel = updatedAt
        ? new Date(updatedAt).toLocaleDateString([], {
              month: "short",
              day: "numeric",
          })
        : null;

    return (
        <>
            <button
                type="button"
                onClick={() => setReaderOpen(true)}
                className="group flex w-full flex-col gap-3 rounded-3xl border border-border bg-surface p-4 text-left transition-all hover:border-primary/40 hover:shadow-md active:scale-[0.99]"
                aria-label="Open SOP reader"
            >
                {/* Header: icon + short title + updated pill only.
                    No competing action button — the whole card is
                    the tap target so nothing fights for horizontal
                    space. */}
                <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <BookOpen className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-black uppercase tracking-widest text-text">
                            SOP
                        </p>
                        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                            Standard Operating Procedure
                        </p>
                    </div>
                    {updatedLabel && (
                        <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-[10px] font-semibold text-muted">
                            {updatedLabel}
                        </span>
                    )}
                </div>

                {/* Snippet — 2-line preview. */}
                <p className="line-clamp-2 text-xs leading-relaxed text-muted">
                    {snippet}
                </p>

                {/* Full-width action row — tappable, unambiguous. */}
                <div className="flex items-center justify-center gap-1.5 rounded-2xl bg-primary/10 py-2 text-[11px] font-black uppercase tracking-wider text-primary transition-colors group-hover:bg-primary/15">
                    <Maximize2 className="size-3.5" />
                    Open full SOP
                </div>
            </button>

            {readerOpen && (
                <FullscreenReader
                    title="Standard Operating Procedure"
                    subtitle={
                        updatedAt
                            ? `Updated ${new Date(updatedAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}`
                            : ""
                    }
                    content={content}
                    onClose={() => setReaderOpen(false)}
                />
            )}
        </>
    );
}

/**
 * Fullscreen reader used by both the SOP and long Operation cards.
 * Sticky header so the operator always knows where they are + how
 * to close, and the body scrolls independently. Font size is bumped
 * so an operator with wet gloves at arm's length can still read.
 */
function FullscreenReader({
    title,
    subtitle,
    content,
    onClose,
}: {
    title: string;
    subtitle: string;
    content: string;
    onClose: () => void;
}) {
    // Close on Escape — desktop testers appreciate it, mobile users
    // never see it and lose nothing.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKey);
        // Lock body scroll while the reader is up so double-scrolling
        // (background page + reader) doesn't happen on iOS.
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
            <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <BookOpen className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-text truncate">
                        {title}
                    </p>
                    {subtitle && (
                        <p className="text-[11px] text-muted truncate">
                            {subtitle}
                        </p>
                    )}
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close reader"
                    className="inline-flex size-10 items-center justify-center rounded-full text-muted hover:bg-background hover:text-text active:scale-95"
                >
                    <X className="size-5" />
                </button>
            </header>
            <div className="flex-1 overflow-y-auto px-4 py-6 pb-24">
                <div className="mx-auto max-w-2xl">
                    <p className="whitespace-pre-wrap text-base leading-7 text-text">
                        {content}
                    </p>
                </div>
            </div>
            {/* Persistent close bar at the bottom — thumb-reachable
                on tall phones so an operator doesn't have to reach up
                for the top-right X. */}
            <div className="sticky bottom-0 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur">
                <Button
                    color="primary"
                    size="lg"
                    onPress={onClose}
                    className="h-14 w-full text-base font-black"
                >
                    Back to session
                </Button>
            </div>
        </div>
    );
}

function formatElapsed(nowMs: number, startedIso: string | null): string {
    if (!startedIso) return "0s";
    const startMs = new Date(startedIso).getTime();
    const seconds = Math.max(0, Math.floor((nowMs - startMs) / 1000));
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
        return `${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
    }
    return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function getMsg(err: unknown): string {
    if (err instanceof Error) return err.message;
    return "Unknown error.";
}
