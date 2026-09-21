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
    SprayCan,
    Square,
} from "lucide-react";
import FormRenderer from "@/components/shared/FormRenderer";
import { personalKioskService } from "@/services/personal-kiosk.service";
import type {
    CleaningSessionStart,
    CleaningWorkstationTile,
} from "@/types/worker";
import type { FormField, KioskForm } from "@/types/dynamic-form";

interface CleaningSessionViewProps {
    token: string;
    sessionToken: string;
    target: CleaningWorkstationTile;
    onFinished: () => void;
    onBack: () => void;
}

type Phase =
    | "confirm"
    | "starting"
    | "running"
    | "filling_forms"
    | "submitting"
    | "done";

/**
 * Cleaning session mirrors the shape of a normal work session on
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
export default function CleaningSessionView({
    token,
    sessionToken,
    target,
    onFinished,
    onBack,
}: CleaningSessionViewProps) {
    const [phase, setPhase] = useState<Phase>("confirm");
    const [session, setSession] = useState<CleaningSessionStart | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [duration, setDuration] = useState<number | null>(null);
    // Walk-through state: `currentIndex` tracks which form in
    // `session.forms` the operator is filling; `responses` accumulates
    // as they submit each one. When the last submit lands we call
    // completeCleaningSession with the full array.
    const [currentIndex, setCurrentIndex] = useState(0);
    const [responses, setResponses] = useState<
        Array<{ formId: number; answers: Record<string, unknown> }>
    >([]);

    const handleStart = useCallback(async () => {
        setPhase("starting");
        setError(null);
        try {
            const res = await personalKioskService.startCleaningSession(token, {
                sessionToken,
                workstationId: target.workstation_id,
            });
            setSession(res);
            setCurrentIndex(0);
            setResponses([]);
            // Land on the running panel — timer + Stop button.
            // FormRenderer stays gated until the operator hits Stop
            // so they can actually clean before answering questions.
            setPhase("running");
        } catch (err) {
            setError(getMsg(err));
            setPhase("confirm");
        }
    }, [token, sessionToken, target.workstation_id]);

    // Stop tapped from the running panel. Transitions to the form
    // walk-through; the timer keeps ticking underneath because the
    // session stays ``active`` on the backend until the last form
    // submits (that's what stamps ``end_time`` and defines the
    // recorded duration).
    const handleStop = useCallback(() => {
        if (!session) return;
        setCurrentIndex(0);
        setResponses([]);
        setPhase("filling_forms");
    }, [session]);

    const handleSubmit = useCallback(
        async (answers: Record<string, unknown>) => {
            if (!session) return;
            const current = session.forms[currentIndex];
            if (!current) return;
            const nextResponses = [
                ...responses,
                { formId: current.id, answers },
            ];
            const isLast = currentIndex + 1 >= session.forms.length;

            if (!isLast) {
                // Advance to the next form in the walk-through. The
                // FormRenderer key change unmounts the current one
                // and mounts the next with clean state.
                setResponses(nextResponses);
                setCurrentIndex(currentIndex + 1);
                return;
            }

            setPhase("submitting");
            try {
                const res = await personalKioskService.completeCleaningSession(
                    token,
                    session.session_id,
                    {
                        sessionToken,
                        responses: nextResponses,
                    },
                );
                setDuration(res.duration_seconds);
                setPhase("done");
                addToast({
                    title: "Cleaning logged",
                    description: `${target.workstation_name} — ${formatDuration(res.duration_seconds)}.`,
                    color: "success",
                });
            } catch (err) {
                addToast({
                    title: "Couldn't submit",
                    description: getMsg(err),
                    color: "danger",
                });
                setPhase("filling_forms");
            }
        },
        [
            token,
            sessionToken,
            session,
            currentIndex,
            responses,
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

    // Full-screen FormRenderer takes over while the worker fills the
    // checklist. We still render a lightweight backdrop underneath so
    // "Cancel" from the FormRenderer lands the operator back here
    // instead of on a blank page.
    if (phase === "filling_forms" || phase === "submitting") {
        if (!session) return null;
        const current = session.forms[currentIndex];
        if (!current) return null;
        const total = session.forms.length;
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
                    key={current.id}
                    form={kioskForm}
                    sessionId={session.session_id}
                    isSubmitting={phase === "submitting"}
                    onSubmit={handleSubmit}
                    onClose={() => {
                        // Deliberate: keep the session running when the
                        // operator dismisses the form (e.g. to grab a
                        // supply). The backdrop card behind gives them
                        // a "Resume checklist" button.
                        // No state change — the portal just unmounts.
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

    return (
        <ConfirmCard
            target={target}
            starting={phase === "starting"}
            error={error}
            onStart={handleStart}
            onBack={onBack}
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
}: {
    target: CleaningWorkstationTile;
    starting: boolean;
    error: string | null;
    onStart: () => void;
    onBack: () => void;
}) {
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
                        <SprayCan className="size-6" />
                    </span>
                    <div className="min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-widest text-muted">
                            Cleaning session
                        </p>
                        <h1 className="text-lg font-black text-text sm:text-2xl">
                            {target.workstation_name}
                        </h1>
                    </div>
                </div>
                <div className="mt-4 space-y-2 text-sm text-text">
                    <p>
                        <span className="font-semibold">Checklist:</span>{" "}
                        {target.form_name}
                    </p>
                    {target.last_cleaning_at && (
                        <p className="text-xs text-muted">
                            Last cleaned:{" "}
                            {new Date(target.last_cleaning_at).toLocaleString()}
                        </p>
                    )}
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
                {starting ? "Starting…" : "Start cleaning"}
            </button>
            <p className="text-center text-xs text-muted">
                The timer starts as soon as you tap Start. When the
                station is clean, tap Stop cleaning and the checklist
                opens — the timer keeps running until you submit it.
            </p>
        </div>
    );
}


/**
 * Running panel — mirrors ``StationView``'s RunningPanel: a big
 * emerald "Session running" card with a pulsing dot and the live
 * elapsed timer, a workstation info card, and a red "Stop cleaning"
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
    target: CleaningWorkstationTile;
    session: CleaningSessionStart;
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
                            Cleaning in progress
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
                    <SprayCan className="size-4 text-cyan-500" />
                    <p className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
                        Checklist queued
                    </p>
                </div>
                <p className="mt-1 text-sm text-text">{target.form_name}</p>
                <p className="mt-1 text-xs text-muted">
                    Tap Stop cleaning when the station is clean. The
                    checklist opens then — the timer keeps ticking
                    until you submit, so the total time recorded
                    includes filling the form.
                </p>
            </div>

            <button
                type="button"
                onClick={onStop}
                className="inline-flex h-16 items-center justify-center gap-2 rounded-2xl bg-danger text-white text-base font-black uppercase tracking-widest transition-opacity hover:opacity-90"
            >
                <Square className="size-5" />
                Stop cleaning
            </button>
        </div>
    );
}

function BackdropCard({
    target,
    session,
    step,
}: {
    target: CleaningWorkstationTile;
    session: CleaningSessionStart;
    step?: { current: number; total: number };
}) {
    const elapsed = useElapsed(session.start_time);
    return (
        <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-4">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <SprayCan className="size-4 text-cyan-500" />
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
    target: CleaningWorkstationTile;
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
                    Cleaning complete
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
