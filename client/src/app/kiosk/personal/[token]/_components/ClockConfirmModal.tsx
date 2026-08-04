"use client";

import { Button } from "@heroui/react";
import { AlertTriangle, LogIn, LogOut, X } from "lucide-react";

interface ClockConfirmModalProps {
    mode: "in" | "out";
    workerName: string;
    open: boolean;
    isBusy: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    /** Only used for the Clock Out modal — how long the worker has
     *  been on shift right now, so they see the impact before ending. */
    elapsed?: string;
}

/**
 * Small confirm dialog wrapping Clock In / Clock Out. Prevents a
 * misclick from starting or ending a shift when the operator meant
 * to tap a nearby button. Renders as a bottom-sheet on mobile and a
 * centered card on desktop so it feels native either way.
 */
export default function ClockConfirmModal({
    mode,
    workerName,
    open,
    isBusy,
    onConfirm,
    onCancel,
    elapsed,
}: ClockConfirmModalProps) {
    if (!open) return null;

    const isOut = mode === "out";
    const title = isOut ? "End this shift?" : "Start a shift?";
    const body = isOut
        ? `You're about to clock ${workerName.split(" ")[0]} out.${
              elapsed
                  ? ` You've been on shift for ${elapsed}.`
                  : ""
          } Any active work sessions will still need to be stopped separately.`
        : `You're about to clock ${workerName.split(" ")[0]} in. Every session you run today will attach to this shift.`;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
            <div className="w-full max-w-md rounded-3xl border border-border bg-background p-5 shadow-2xl">
                <div className="flex items-start gap-3">
                    <div
                        className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${
                            isOut
                                ? "bg-danger/10 text-danger"
                                : "bg-primary/10 text-primary"
                        }`}
                    >
                        {isOut ? (
                            <LogOut className="size-5" />
                        ) : (
                            <LogIn className="size-5" />
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-black text-text">
                            {title}
                        </h2>
                        <p className="mt-1 text-sm text-muted">{body}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        aria-label="Close"
                        className="shrink-0 inline-flex size-9 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-text"
                        disabled={isBusy}
                    >
                        <X className="size-4" />
                    </button>
                </div>

                {isOut && (
                    <div className="mt-4 flex items-start gap-2 rounded-2xl border border-warning/40 bg-warning/5 p-3 text-xs text-warning">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                        <p>
                            Once you clock out, this shift is closed and
                            timekeeping stops — you'll have to clock back
                            in to attribute any new sessions.
                        </p>
                    </div>
                )}

                <div className="mt-5 flex gap-2">
                    <Button
                        variant="light"
                        onPress={onCancel}
                        isDisabled={isBusy}
                        className="flex-1"
                    >
                        Cancel
                    </Button>
                    <Button
                        color={isOut ? "danger" : "primary"}
                        isLoading={isBusy}
                        onPress={onConfirm}
                        className="flex-1"
                    >
                        {isOut ? "Clock out" : "Clock in"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
