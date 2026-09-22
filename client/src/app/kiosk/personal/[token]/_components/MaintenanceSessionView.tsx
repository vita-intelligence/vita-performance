"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addToast } from "@heroui/react";
import {
    ArrowLeft,
    CheckCircle2,
    Clock,
    Loader2,
    Play,
    Radio,
    Wrench,
    Square,
} from "lucide-react";
import FormRenderer from "@/components/shared/FormRenderer";
import { personalKioskService } from "@/services/personal-kiosk.service";
import type {
    MaintenanceSessionStart,
    MaintenanceWorkstationTile,
    WorkstationEquipmentItem,
} from "@/types/worker";
import type { FormField, KioskForm } from "@/types/dynamic-form";

interface MaintenanceSessionViewProps {
    token: string;
    sessionToken: string;
    target: MaintenanceWorkstationTile;
    /**
     * When set, skip the Confirm → Start dance and hydrate an
     * already-running session by id. Powers the "resume from the
     * Home-menu Live-Activity banner" flow — a worker who taps
     * their live-session card for a cleaning session lands here
     * with the timer already ticking, instead of getting thrown
     * into the production RunningPanel (which asks for "quantity
     * produced" — nonsense on a cleaning run).
     */
    resumeSessionId?: number;
    /** When set, the equipment scope picker on the confirm screen
     *  pre-selects this equipment uuid. Used when the operator
     *  jumped in from the Machine tab of the picker. */
    preselectedEquipmentUuid?: string;
    onFinished: () => void;
    onBack: () => void;
}

type Phase =
    | "confirm"
    | "starting"
    // Pre-session checklist walk — happens BEFORE the running phase
    // when the workstation / category has maintenance_start forms
    // attached. Skipped when no start forms are configured.
    | "filling_start_forms"
    | "running"
    | "filling_end_forms"
    | "submitting"
    | "done";

/**
 * Maintenance session mirrors the shape of a normal work session on
 * :class:`StationView`'s ``RunningPanel``:
 *
 *   1. ``confirm``       — pre-session card explaining what's about
 *                          to happen.
 *   2. ``starting``      — POST /cleaning-sessions/start/ in flight.
 *   3. ``running``       — big "Session running" card with pulsing
 *                          dot, live elapsed timer, and a "Stop
 *                          cleaning" button. Forms are queued but
 *                          NOT open — operator does the physical
 *                          cleaning first.
 *   4. ``filling_forms`` — after Stop is tapped, FormRenderer walks
 *                          through the ordered cleaning forms. Timer
 *                          KEEPS TICKING (backdrop card behind the
 *                          renderer surfaces it) so the total
 *                          duration includes form-fill time — the
 *                          session doesn't end until the last form
 *                          is submitted.
 *   5. ``submitting``    — the final complete request is in flight.
 *   6. ``done``          — session closed, PSP cleaning-complete
 *                          callback fired, duration surfaced.
 *
 * The form gate is enforced backend-side too — the /complete/
 * endpoint refuses to close the session without a ``responses``
 * array (see :func:`_persist_session_form_responses` +
 * :class:`PublicPersonalKioskCompleteCleaningSessionView`), so
 * bypassing the FE can't skip the checklist. Backend stamps
 * ``end_time = now()`` at complete-request landing, which lands
 * exactly at "operator hit submit on the last form" — total
 * duration includes both the cleaning work AND the checklist
 * fill-in time, matching how operators actually think about the
 * "cleaning session length" metric.
 */
export default function MaintenanceSessionView({
    token,
    sessionToken,
    target,
    resumeSessionId,
    preselectedEquipmentUuid,
    onFinished,
    onBack,
}: MaintenanceSessionViewProps) {
    const [phase, setPhase] = useState<Phase>(
        // Resume paths start in a transient "starting" phase so the
        // hydrate effect below can fetch the session before we
        // render either Confirm or Running. Without this the
        // operator would see the Confirm card flicker before the
        // fetch completes, then get swapped to Running mid-scroll.
        resumeSessionId != null ? "starting" : "confirm",
    );
    const [session, setSession] = useState<MaintenanceSessionStart | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [duration, setDuration] = useState<number | null>(null);
    // Walk-through state: `currentIndex` tracks which form in
    // `session.forms` the operator is filling; `responses` accumulates
    // as they submit each one. When the last submit lands we call
    // completeCleaningSession with the full array.
    const [currentIndex, setCurrentIndex] = useState(0);
    // Two-phase response accumulator — see cleaning view for shape.
    const [startResponses, setStartResponses] = useState<
        Array<{ formId: number; answers: Record<string, unknown> }>
    >([]);
    const [responses, setResponses] = useState<
        Array<{ formId: number; answers: Record<string, unknown> }>
    >([]);

    // Equipment scope picker — mirror of the cleaning view. See
    // :file:`CleaningSessionView.tsx` for the design rationale.
    const [equipmentList, setEquipmentList] = useState<WorkstationEquipmentItem[]>(
        [],
    );
    const [selectedEquipmentUuid, setSelectedEquipmentUuid] = useState<
        string | null
    >(preselectedEquipmentUuid ?? null);

    useEffect(() => {
        if (resumeSessionId != null) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await personalKioskService.getWorkstationEquipment(
                    token,
                    target.workstation_id,
                    { sessionToken },
                );
                if (cancelled) return;
                setEquipmentList(res.items);
            } catch {
                // Silent — fall back to workstation-only scope.
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [resumeSessionId, token, sessionToken, target.workstation_id]);

    // Resume-from-home hydration. Fires once when the parent
    // mounts this view with a ``resumeSessionId`` — fetches the
    // existing session's identity + form list and jumps straight
    // to the ``running`` phase. Failure falls back to the Confirm
    // card with an inline error so the operator can still see what
    // went wrong (session already closed, wrong worker, network).
    useEffect(() => {
        if (resumeSessionId == null) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await personalKioskService.getMaintenanceSession(
                    token,
                    resumeSessionId,
                    { sessionToken },
                );
                if (cancelled) return;
                setSession(res);
                setCurrentIndex(0);
                setResponses([]);
                setPhase("running");
            } catch (err) {
                if (cancelled) return;
                setError(getMsg(err));
                setPhase("confirm");
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [resumeSessionId, token, sessionToken]);

    const handleStart = useCallback(async () => {
        setPhase("starting");
        setError(null);
        try {
            const res = await personalKioskService.startMaintenanceSession(token, {
                sessionToken,
                workstationId: target.workstation_id,
                equipmentUuid: selectedEquipmentUuid,
            });
            setSession(res);
            setCurrentIndex(0);
            setStartResponses([]);
            setResponses([]);
            const hasStart = (res.start_forms ?? []).length > 0;
            setPhase(hasStart ? "filling_start_forms" : "running");
        } catch (err) {
            setError(getMsg(err));
            setPhase("confirm");
        }
    }, [token, sessionToken, target.workstation_id, selectedEquipmentUuid]);

    // Stop tapped from the running panel. Transitions to the end-
    // form walk-through; the timer keeps ticking underneath because
    // the session stays ``active`` on the backend until the last
    // form submits. If no end forms are configured, close immediately.
    const handleStop = useCallback(async () => {
        if (!session) return;
        const endForms = session.end_forms ?? [];
        if (endForms.length === 0) {
            setPhase("submitting");
            try {
                const res = await personalKioskService.completeMaintenanceSession(
                    token,
                    session.session_id,
                    {
                        sessionToken,
                        responses: startResponses,
                    },
                );
                setDuration(res.duration_seconds);
                setPhase("done");
                addToast({
                    title: "Maintenance logged",
                    description: `${target.workstation_name} — ${formatDuration(res.duration_seconds)}.`,
                    color: "success",
                });
            } catch (err) {
                addToast({
                    title: "Couldn't submit",
                    description: getMsg(err),
                    color: "danger",
                });
                setPhase("running");
            }
            return;
        }
        setCurrentIndex(0);
        setResponses([]);
        setPhase("filling_end_forms");
    }, [session, sessionToken, startResponses, target.workstation_name, token]);

    const handleSubmit = useCallback(
        async (answers: Record<string, unknown>) => {
            if (!session) return;

            if (phase === "filling_start_forms") {
                const list = session.start_forms ?? [];
                const current = list[currentIndex];
                if (!current) return;
                const nextStart = [
                    ...startResponses,
                    { formId: current.id, answers },
                ];
                const isLast = currentIndex + 1 >= list.length;
                if (!isLast) {
                    setStartResponses(nextStart);
                    setCurrentIndex(currentIndex + 1);
                    return;
                }
                setStartResponses(nextStart);
                setCurrentIndex(0);
                setPhase("running");
                return;
            }

            const list = session.end_forms ?? [];
            const current = list[currentIndex];
            if (!current) return;
            const nextResponses = [
                ...responses,
                { formId: current.id, answers },
            ];
            const isLast = currentIndex + 1 >= list.length;

            if (!isLast) {
                setResponses(nextResponses);
                setCurrentIndex(currentIndex + 1);
                return;
            }

            setPhase("submitting");
            try {
                const res = await personalKioskService.completeMaintenanceSession(
                    token,
                    session.session_id,
                    {
                        sessionToken,
                        responses: [...startResponses, ...nextResponses],
                    },
                );
                setDuration(res.duration_seconds);
                setPhase("done");
                addToast({
                    title: "Maintenance logged",
                    description: `${target.workstation_name} — ${formatDuration(res.duration_seconds)}.`,
                    color: "success",
                });
            } catch (err) {
                addToast({
                    title: "Couldn't submit",
                    description: getMsg(err),
                    color: "danger",
                });
                setPhase("filling_end_forms");
            }
        },
        [
            token,
            sessionToken,
            session,
            currentIndex,
            phase,
            responses,
            startResponses,
            target.workstation_name,
        ],
    );

    // Running panel — timer visible, Stop button prominent. Form
    // walk-through only opens when the operator taps Stop. Mirrors
    // ``RunningPanel`` on :file:`StationView.tsx` so cleaning feels
    // like every other session on the kiosk.
    if (phase === "running") {
        if (!session) return null;
        return (
            <RunningPanel
                target={target}
                session={session}
                onStop={handleStop}
            />
        );
    }

    // Full-screen FormRenderer takes over while the worker walks
    // either the pre-session start-form list or the post-session
    // end-form list.
    if (
        phase === "filling_start_forms" ||
        phase === "filling_end_forms" ||
        phase === "submitting"
    ) {
        if (!session) return null;
        const isStartPhase = phase === "filling_start_forms";
        const list = isStartPhase
            ? session.start_forms ?? []
            : session.end_forms ?? [];
        const current = list[currentIndex];
        if (!current) return null;
        const total = list.length;
        const kioskForm: KioskForm = {
            id: current.id,
            name:
                total > 1
                    ? `${current.name} · ${currentIndex + 1} of ${total}`
                    : current.name,
            schema: current.schema as FormField[],
        };
        return (
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
                <BackdropCard
                    target={target}
                    session={session}
                    step={{ current: currentIndex + 1, total }}
                />
                <FormRenderer
                    key={`${isStartPhase ? "start" : "end"}-${current.id}`}
                    form={kioskForm}
                    sessionId={session.session_id}
                    isSubmitting={phase === "submitting"}
                    onSubmit={handleSubmit}
                    onClose={() => {
                        if (isStartPhase) {
                            setPhase("confirm");
                            setCurrentIndex(0);
                            setStartResponses([]);
                        } else {
                            setPhase("running");
                            setCurrentIndex(0);
                            setResponses([]);
                        }
                    }}
                    token={token}
                />
            </div>
        );
    }

    if (phase === "done") {
        return (
            <DoneCard
                target={target}
                durationSeconds={duration ?? 0}
                onBack={onFinished}
            />
        );
    }

    const scopedEquipment =
        selectedEquipmentUuid
            ? equipmentList.find(
                  (e) => e.uuid === selectedEquipmentUuid,
              ) ?? null
            : null;

    return (
        <ConfirmCard
            target={target}
            starting={phase === "starting"}
            error={error}
            onStart={handleStart}
            onBack={onBack}
            scopedEquipment={scopedEquipment}
        />
    );
}

/* ------------------------------------------------------------------ */

function ConfirmCard({
    target,
    starting,
    error,
    onStart,
    onBack,
    scopedEquipment,
}: {
    target: MaintenanceWorkstationTile;
    starting: boolean;
    error: string | null;
    onStart: () => void;
    onBack: () => void;
    scopedEquipment: WorkstationEquipmentItem | null;
}) {
    // The picker (Workstation tab / Machine tab) already answered
    // "what am I servicing" — never re-ask on the confirm screen.
    // Show the confirmed scope; Back returns to the picker to change.
    const scopeLabel = scopedEquipment
        ? scopedEquipment.name
        : `${target.workstation_name} · the whole workstation`;
    const scopeSub = scopedEquipment
        ? scopedEquipment.serial_number
            ? `SN ${scopedEquipment.serial_number}`
            : "specific machine"
        : "workstation-scope maintenance";

    return (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6">
            <button
                type="button"
                onClick={onBack}
                className="inline-flex w-fit items-center gap-1 text-xs font-semibold uppercase tracking-widest text-muted hover:text-text"
            >
                <ArrowLeft className="size-3.5" />
                Back
            </button>

            <div className="rounded-2xl border-2 border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-sky-500/10 p-5 sm:p-6">
                <div className="flex items-center gap-3">
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
                        <Wrench className="size-6" />
                    </span>
                    <div className="min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-widest text-muted">
                            Maintenance session
                        </p>
                        <h1 className="text-lg font-black text-text sm:text-2xl">
                            {scopeLabel}
                        </h1>
                        <p className="mt-0.5 text-xs text-muted">
                            {scopeSub}
                        </p>
                    </div>
                </div>
                <div className="mt-4 space-y-2 text-sm text-text">
                    {target.last_maintenance_at && (
                        <p className="text-xs text-muted">
                            Last serviced:{" "}
                            {new Date(target.last_maintenance_at).toLocaleString()}
                        </p>
                    )}
                    <p className="text-xs text-muted">
                        Not right? Tap Back to change what you&apos;re
                        maintaining.
                    </p>
                </div>
            </div>

            {error && (
                <div className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-2.5 text-sm text-danger">
                    {error}
                </div>
            )}

            <button
                type="button"
                onClick={onStart}
                disabled={starting}
                className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-text text-background text-sm font-black uppercase tracking-widest transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {starting ? (
                    <Loader2 className="size-5 animate-spin" />
                ) : (
                    <Play className="size-5" />
                )}
                {starting ? "Starting…" : "Start maintenance"}
            </button>
            <p className="text-center text-xs text-muted">
                The timer starts as soon as you tap Start. When the
                service is done, tap Stop maintenance and the checklist
                opens — the timer keeps running until you submit it.
            </p>
        </div>
    );
}


/**
 * Running panel — mirrors ``StationView``'s RunningPanel: a big
 * emerald "Session running" card with a pulsing dot and the live
 * elapsed timer, a workstation info card, and a red "Stop maintenance"
 * button. Tapping Stop hands control to :func:`handleStop` which
 * opens the form walk-through; the timer keeps ticking behind the
 * form until the last one is submitted (backend stamps ``end_time``
 * at that moment).
 */
function RunningPanel({
    target,
    session,
    onStop,
}: {
    target: MaintenanceWorkstationTile;
    session: MaintenanceSessionStart;
    onStop: () => void;
}) {
    const elapsed = useElapsed(session.start_time);
    return (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6">
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
                            Maintenance in progress
                        </p>
                        <p className="mt-1 text-3xl font-black tabular-nums text-text">
                            {formatDuration(elapsed)}
                        </p>
                        <p className="mt-0.5 truncate text-sm text-muted">
                            {target.workstation_name}
                        </p>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-4">
                <div className="flex items-center gap-2">
                    <Wrench className="size-4 text-cyan-500" />
                    <p className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
                        Checklist queued
                    </p>
                </div>
                <p className="mt-1 text-sm text-text">{target.form_name}</p>
                <p className="mt-1 text-xs text-muted">
                    Tap Stop maintenance when the service is done. The
                    checklist opens then — the timer keeps ticking
                    until you submit, so the total time recorded
                    includes filling the form. Hit the ✕ on the
                    checklist if you tapped Stop by mistake — it
                    returns you here so you can keep going.
                </p>
            </div>

            <button
                type="button"
                onClick={onStop}
                className="inline-flex h-16 items-center justify-center gap-2 rounded-2xl bg-danger text-white text-base font-black uppercase tracking-widest transition-opacity hover:opacity-90"
            >
                <Square className="size-5" />
                Stop maintenance
            </button>
        </div>
    );
}

function BackdropCard({
    target,
    session,
    step,
}: {
    target: MaintenanceWorkstationTile;
    session: MaintenanceSessionStart;
    step?: { current: number; total: number };
}) {
    const elapsed = useElapsed(session.start_time);
    return (
        <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-4">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Wrench className="size-4 text-cyan-500" />
                    <p className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
                        {target.workstation_name}
                    </p>
                </div>
                <div className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-xs font-black text-cyan-600 dark:text-cyan-400">
                    <Clock className="size-3.5" />
                    {formatDuration(elapsed)}
                </div>
            </div>
            <p className="mt-1 text-xs text-muted">
                {step && step.total > 1
                    ? `Checklist ${step.current} of ${step.total}. Complete this one, then the next opens automatically.`
                    : "Checklist opens in a moment. Complete each field, then Submit to close the session."}
            </p>
        </div>
    );
}

function DoneCard({
    target,
    durationSeconds,
    onBack,
}: {
    target: MaintenanceWorkstationTile;
    durationSeconds: number;
    onBack: () => void;
}) {
    return (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6">
            <div className="rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 p-6 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="size-7" />
                </div>
                <h1 className="mt-3 text-xl font-black text-text sm:text-2xl">
                    Maintenance complete
                </h1>
                <p className="mt-1 text-sm text-muted">
                    {target.workstation_name} · {formatDuration(durationSeconds)}
                </p>
            </div>
            <button
                type="button"
                onClick={onBack}
                className="inline-flex h-12 items-center justify-center rounded-xl bg-text text-background text-sm font-black uppercase tracking-widest transition-opacity hover:opacity-90"
            >
                Back to home
            </button>
        </div>
    );
}

/* ------------------------------------------------------------------ */

function useElapsed(startIso: string): number {
    const startMs = useMemo(() => new Date(startIso).getTime(), [startIso]);
    const [now, setNow] = useState(() => Date.now());
    const rafRef = useRef<number | null>(null);
    useEffect(() => {
        // Tick every second — cheap enough on a factory tablet and
        // the display only shows seconds resolution anyway.
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => {
            clearInterval(id);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, []);
    return Math.max(0, Math.floor((now - startMs) / 1000));
}

function formatDuration(totalSeconds: number): string {
    if (!Number.isFinite(totalSeconds) || totalSeconds < 0) totalSeconds = 0;
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
    if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
    return `${s}s`;
}

function getMsg(err: unknown): string {
    if (err instanceof Error) return err.message;
    return "Something went wrong.";
}

/**
 * Scope picker on the maintenance confirm screen. Mirror of the
 * cleaning variant — pick "This workstation" (default) or a
 * specific machine on it. Machine-scoped sessions land audit
 * events against the equipment and pull the equipment-scoped
 * forms attached at the category level.
 */
function ScopePicker({
    workstationName,
    equipmentList,
    selectedEquipmentUuid,
    onSelect,
}: {
    workstationName: string;
    equipmentList: WorkstationEquipmentItem[];
    selectedEquipmentUuid: string | null;
    onSelect: (uuid: string | null) => void;
}) {
    return (
        <div className="rounded-2xl border border-border/60 bg-surface/30 p-4">
            <p className="text-[11px] font-black uppercase tracking-widest text-muted">
                What are you maintaining?
            </p>
            <p className="mt-1 text-xs text-muted">
                The audit event goes against whatever you pick — so pick
                the machine if you&apos;re servicing it specifically, or
                the workstation if you&apos;re working on the whole cell.
            </p>
            <ul className="mt-3 space-y-1.5">
                <ScopeOption
                    label={`${workstationName} · the whole workstation`}
                    checked={selectedEquipmentUuid === null}
                    onSelect={() => onSelect(null)}
                />
                {equipmentList.map((item) => (
                    <ScopeOption
                        key={item.uuid}
                        label={item.name}
                        sublabel={
                            item.serial_number ? `SN ${item.serial_number}` : undefined
                        }
                        checked={selectedEquipmentUuid === item.uuid}
                        onSelect={() => onSelect(item.uuid)}
                    />
                ))}
            </ul>
        </div>
    );
}

function ScopeOption({
    label,
    sublabel,
    checked,
    onSelect,
}: {
    label: string;
    sublabel?: string;
    checked: boolean;
    onSelect: () => void;
}) {
    return (
        <li>
            <button
                type="button"
                onClick={onSelect}
                className={
                    "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors " +
                    (checked
                        ? "border-cyan-500 bg-cyan-500/10"
                        : "border-border bg-background hover:border-text")
                }
            >
                <span
                    className={
                        "relative flex size-4 shrink-0 items-center justify-center rounded-full border-2 " +
                        (checked
                            ? "border-cyan-500 bg-cyan-500"
                            : "border-border")
                    }
                    aria-hidden
                >
                    {checked && (
                        <span className="size-1.5 rounded-full bg-white" />
                    )}
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-text">
                        {label}
                    </span>
                    {sublabel && (
                        <span className="block text-[11px] text-muted">
                            {sublabel}
                        </span>
                    )}
                </span>
            </button>
        </li>
    );
}
