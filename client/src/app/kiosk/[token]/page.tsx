"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { addToast } from "@heroui/react";
import { useKiosk } from "@/hooks/useKiosk";
import KioskIdle from "./_components/KioskIdle";
import KioskActive from "./_components/KioskActive";
import FormRenderer from "@/components/shared/FormRenderer";

export default function KioskPage() {
    const { token } = useParams<{ token: string }>();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const {
        state,
        workers,
        isLoading,
        error,
        sop,
        isSOPLoading,
        fetchSOP,
        startForms,
        endForms,
        startSession,
        stopSession,
        submitFormResponse,
    } = useKiosk(token);

    type StartFormAnswer = {
        formId: number;
        answers: Record<string, any>;
    };

    const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
    const [currentFormIndex, setCurrentFormIndex] = useState(0);
    const [showingStartForms, setShowingStartForms] = useState(false);
    const [showingEndForms, setShowingEndForms] = useState(false);
    const [stopParams, setStopParams] = useState<{
        workerId: number;
        pin: string;
        quantity: number;
        notes: string;
    } | null>(null);
    const [pendingStart, setPendingStart] = useState<{
        workerIds: number[];
        itemId?: number | null;
    } | null>(null);
    // Collect all start form answers before session is created
    const [collectedStartAnswers, setCollectedStartAnswers] = useState<StartFormAnswer[]>([]);
    // Capture the real start/stop timestamp before forms are shown
    const [requestedAt, setRequestedAt] = useState<string | null>(null);

    useEffect(() => {
        if (state?.active_session) {
            setCurrentSessionId(state.active_session.id);
        }
    }, [state?.active_session]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <p className="text-muted text-xs uppercase tracking-widest">Loading...</p>
            </div>
        );
    }

    if (error || !state) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center flex-col gap-4">
                <p className="text-error text-sm uppercase tracking-widest font-semibold">{error || "Something went wrong."}</p>
            </div>
        );
    }

    // Show forms BEFORE creating session
    const handleStart = async (workerIds: number[], itemId?: number | null) => {
        if (startForms.length > 0) {
            setRequestedAt(new Date().toISOString());
            setPendingStart({ workerIds, itemId });
            setCollectedStartAnswers([]);
            setCurrentFormIndex(0);
            setShowingStartForms(true);
        } else {
            setIsSubmitting(true);
            try {
                const session = await startSession(workerIds, itemId);
                setCurrentSessionId(session.id);
            } catch {
                addToast({ title: "Failed to start session", description: "Please try again.", color: "danger", timeout: 4000 });
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    // Collect answers — create session only after last form
    const handleStartFormSubmit = async (answers: Record<string, any>) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const form = startForms[currentFormIndex];
            const newCollected = [...collectedStartAnswers, { formId: form.id, answers }];
            setCollectedStartAnswers(newCollected);

            if (currentFormIndex < startForms.length - 1) {
                setCurrentFormIndex((i) => i + 1);
            } else {
                setShowingStartForms(false);
                setCurrentFormIndex(0);
                if (pendingStart) {
                    const session = await startSession(pendingStart.workerIds, pendingStart.itemId, requestedAt ?? undefined);
                    setCurrentSessionId(session.id);
                    for (const collected of newCollected) {
                        await submitFormResponse(collected.formId, session.id, collected.answers);
                    }
                    setPendingStart(null);
                    setCollectedStartAnswers([]);
                    setRequestedAt(null);
                }
            }
        } catch {
            addToast({ title: "Failed to submit form", description: "Please try again.", color: "danger", timeout: 4000 });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStop = async (workerId: number, pin: string, quantity: number, notes: string) => {
        if (endForms.length > 0 && currentSessionId) {
            setRequestedAt(new Date().toISOString());
            setStopParams({ workerId, pin, quantity, notes });
            setCurrentFormIndex(0);
            setShowingEndForms(true);
        } else {
            setIsSubmitting(true);
            try {
                await stopSession(workerId, pin, quantity, notes);
            } catch {
                addToast({ title: "Failed to stop session", description: "Please try again.", color: "danger", timeout: 4000 });
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handleEndFormSubmit = async (answers: Record<string, any>) => {
        if (!currentSessionId || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const form = endForms[currentFormIndex];
            await submitFormResponse(form.id, currentSessionId, answers);
            if (currentFormIndex < endForms.length - 1) {
                setCurrentFormIndex((i) => i + 1);
            } else {
                setShowingEndForms(false);
                setCurrentFormIndex(0);
                if (stopParams) {
                    await stopSession(
                        stopParams.workerId,
                        stopParams.pin,
                        stopParams.quantity,
                        stopParams.notes,
                        requestedAt ?? undefined
                    );
                    setStopParams(null);
                    setRequestedAt(null);
                }
            }
        } catch {
            addToast({ title: "Failed to submit form", description: "Please try again.", color: "danger", timeout: 4000 });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="h-screen bg-background flex flex-col overflow-hidden">
            {showingStartForms && startForms[currentFormIndex] && (
                <FormRenderer
                    form={startForms[currentFormIndex]}
                    sessionId={0}
                    onSubmit={handleStartFormSubmit}
                    onClose={() => {
                        setShowingStartForms(false);
                        setPendingStart(null);
                        setCollectedStartAnswers([]);
                        setRequestedAt(null);
                    }}
                    isSubmitting={isSubmitting}
                    token={token}
                />
            )}

            {showingEndForms && endForms[currentFormIndex] && currentSessionId && (
                <FormRenderer
                    form={endForms[currentFormIndex]}
                    sessionId={currentSessionId}
                    onSubmit={handleEndFormSubmit}
                    onClose={() => { setShowingEndForms(false); setRequestedAt(null); }}
                    isSubmitting={isSubmitting}
                    token={token}
                />
            )}

            {state.active_session ? (
                <KioskActive
                    token={token}
                    session={state.active_session}
                    workers={workers}
                    onStop={handleStop}
                    sop={sop}
                    isSOPLoading={isSOPLoading}
                    onFetchSOP={fetchSOP}
                    workstationName={state.workstation.name}
                    isSubmitting={isSubmitting}
                />
            ) : (
                <KioskIdle
                    token={token}
                    workstationName={state.workstation.name}
                    workers={workers}
                    onStart={handleStart}
                    sop={sop}
                    isSOPLoading={isSOPLoading}
                    onFetchSOP={fetchSOP}
                    isSubmitting={isSubmitting}
                />
            )}
        </div>
    );
}