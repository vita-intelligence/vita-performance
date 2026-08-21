"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, addToast } from "@heroui/react";
import {
    BookOpen,
    ClipboardList,
    Factory,
    Loader2,
    Play,
    X,
} from "lucide-react";
import { personalKioskService } from "@/services/personal-kiosk.service";
import { RndBadge } from "@/components/RndBadge";
import { JobPreviewPayload, JobRow } from "@/types/worker";
import BomCard from "./BomCard";

interface JobPreviewModalProps {
    token: string;
    sessionToken: string;
    job: JobRow;
    isClockedIn: boolean;
    onClose: () => void;
    /** Fired after startStationSession succeeds — parent navigates
     *  to StationView so the operator lands on the RunningPanel with
     *  the same session they just launched. */
    onStarted: (job: JobRow) => void;
}

/**
 * Interstitial the operator sees BEFORE Start. Bundles three cards the
 * running screen already carries — Operation description (from the PSP
 * step), workstation SOP, and the MO's BOM parts — into one preview so
 * they can read the procedure and check the shelf before committing
 * time to the session.
 *
 * Loads the workstation SOP + MO parts from
 * `getJobPreview(ws_id, mo_uuid)`; failing PSP degrades to an empty
 * BOM list so Start still works. Operation description travels on the
 * JobRow itself (mirrored from PSP step.operation_description via the
 * Jobs list) so we always have it locally, no round-trip needed.
 */
export default function JobPreviewModal({
    token,
    sessionToken,
    job,
    isClockedIn,
    onClose,
    onStarted,
}: JobPreviewModalProps) {
    const [preview, setPreview] = useState<JobPreviewPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [starting, setStarting] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await personalKioskService.getJobPreview(
                token,
                job.workstation_id,
                job.mo_uuid,
                sessionToken,
            );
            setPreview(res);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Load failed");
        } finally {
            setLoading(false);
        }
    }, [token, job.workstation_id, job.mo_uuid, sessionToken]);

    useEffect(() => {
        void load();
    }, [load]);

    // Lock body scroll + Escape-to-close, mirroring the StationView
    // FullscreenReader so the modal feels native on a tablet.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !starting) onClose();
        };
        document.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [onClose, starting]);

    const handleStart = async () => {
        setStarting(true);
        try {
            await personalKioskService.startStationSession(
                token,
                job.workstation_id,
                sessionToken,
                {
                    activityKind: "mo",
                    moUuid: job.mo_uuid,
                    moStepUuid: job.step_uuid,
                    itemName: job.item_name,
                    workstationGroupUuid: job.workstation_group_uuid,
                },
            );
            onStarted(job);
        } catch (err) {
            addToast({
                title: "Couldn't start",
                description: err instanceof Error ? err.message : "Unknown error",
                color: "danger",
            });
        } finally {
            setStarting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-background sm:items-center sm:justify-center sm:bg-black/50 sm:p-4">
            <div className="flex h-full w-full flex-col overflow-hidden bg-background shadow-2xl sm:h-[min(90dvh,900px)] sm:max-w-2xl sm:rounded-3xl sm:border sm:border-border">
                <ModalHeader job={job} onClose={onClose} disabled={starting} />

                <div className="flex-1 overflow-y-auto px-4 py-5">
                    <div className="mx-auto flex max-w-2xl flex-col gap-4">
                        {error && (
                            <div className="rounded-2xl border border-danger/40 bg-danger/5 p-4 text-sm text-danger">
                                {error}
                            </div>
                        )}

                        <OperationDescriptionCard
                            operation={job.step_name}
                            fallback={preview?.workstation.description}
                        />

                        {loading ? (
                            <div className="flex items-center justify-center gap-2 rounded-3xl border border-border bg-surface p-8 text-sm text-muted">
                                <Loader2 className="size-4 animate-spin" />
                                Loading SOP + BOM…
                            </div>
                        ) : (
                            <>
                                <SopCard
                                    content={preview?.workstation.sop_content ?? ""}
                                    updatedAt={
                                        preview?.workstation.sop_updated_at ?? null
                                    }
                                />
                                <BomCard
                                    parts={preview?.parts ?? []}
                                    token={token}
                                    sessionToken={sessionToken}
                                />
                            </>
                        )}
                    </div>
                </div>

                <ModalFooter
                    isClockedIn={isClockedIn}
                    onStart={handleStart}
                    onClose={onClose}
                    starting={starting}
                />
            </div>
        </div>
    );
}

/* ================================================================== */

function ModalHeader({
    job,
    onClose,
    disabled,
}: {
    job: JobRow;
    onClose: () => void;
    disabled: boolean;
}) {
    return (
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ClipboardList className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-black text-text">
                        {job.item_name ?? job.item_code ?? "MO"}
                    </p>
                    <RndBadge projectType={job.project_type} />
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted">
                    <Factory className="size-3 shrink-0" />
                    <span className="truncate">{job.workstation_name}</span>
                    {job.step_sort_order != null && (
                        <>
                            <span className="opacity-50">·</span>
                            <span>Step {job.step_sort_order + 1}</span>
                        </>
                    )}
                </div>
            </div>
            <button
                type="button"
                onClick={onClose}
                disabled={disabled}
                aria-label="Close preview"
                className="inline-flex size-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-background hover:text-text disabled:opacity-40"
            >
                <X className="size-5" />
            </button>
        </header>
    );
}

function ModalFooter({
    isClockedIn,
    onStart,
    onClose,
    starting,
}: {
    isClockedIn: boolean;
    onStart: () => void;
    onClose: () => void;
    starting: boolean;
}) {
    return (
        <div className="sticky bottom-0 border-t border-border bg-surface/95 px-4 py-4 backdrop-blur">
            <div className="mx-auto flex max-w-2xl flex-col gap-3 sm:flex-row-reverse">
                <Button
                    color="primary"
                    size="lg"
                    onPress={onStart}
                    isLoading={starting}
                    isDisabled={!isClockedIn}
                    startContent={!starting ? <Play className="size-6" /> : undefined}
                    className="h-16 w-full flex-1 rounded-2xl text-lg font-black"
                >
                    Start session
                </Button>
                <Button
                    variant="flat"
                    size="lg"
                    onPress={onClose}
                    isDisabled={starting}
                    className="h-16 w-full flex-1 rounded-2xl text-lg font-bold"
                >
                    Cancel
                </Button>
            </div>
            {!isClockedIn && (
                <p className="mt-2 text-center text-[11px] text-warning">
                    Clock in from the hub before you can start a session.
                </p>
            )}
        </div>
    );
}

function OperationDescriptionCard({
    operation,
    fallback,
}: {
    operation: string | null | undefined;
    fallback: string | undefined;
}) {
    const text = (operation && operation.trim()) || (fallback && fallback.trim()) || "";
    if (!text) return null;
    const isMoSpecific = !!(operation && operation.trim());
    const title = isMoSpecific ? "Operation" : "Station notes";
    const subtitle = isMoSpecific
        ? "From the PSP MO step"
        : "Default instructions for this workstation";

    return (
        <div className="rounded-3xl border-2 border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                    <ClipboardList className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-black uppercase tracking-widest text-primary">
                        {title}
                    </p>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                        {subtitle}
                    </p>
                </div>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-text">
                {text}
            </p>
        </div>
    );
}

function SopCard({
    content,
    updatedAt,
}: {
    content: string;
    updatedAt: string | null;
}) {
    const trimmed = content.trim();
    const updatedLabel = updatedAt
        ? new Date(updatedAt).toLocaleDateString([], {
              month: "short",
              day: "numeric",
          })
        : null;

    return (
        <div className="rounded-3xl border border-border bg-surface p-4">
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
            {trimmed ? (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-text">
                    {trimmed}
                </p>
            ) : (
                <p className="mt-3 text-xs text-muted">
                    No SOP written for this station yet. Ask a supervisor to add
                    one.
                </p>
            )}
        </div>
    );
}

