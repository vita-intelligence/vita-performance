"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useKiosk } from "@/hooks/useKiosk";
import KioskIdle from "./_components/KioskIdle";
import KioskActive from "./_components/KioskActive";
import FormRenderer from "@/components/shared/FormRenderer";

export default function KioskPage() {
    const { token } = useParams<{ token: string }>();
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
            setPendingStart({ workerIds, itemId });
            setCollectedStartAnswers([]);
            setCurrentFormIndex(0);
            setShowingStartForms(true);
        } else {
            const session = await startSession(workerIds, itemId);
            setCurrentSessionId(session.id);
        }
    };

    // Collect answers — create session only after last form
    const handleStartFormSubmit = async (answers: Record<string, any>) => {
        const form = startForms[currentFormIndex];
        const newCollected = [...collectedStartAnswers, { formId: form.id, answers }];
        setCollectedStartAnswers(newCollected);

        if (currentFormIndex < startForms.length - 1) {
            setCurrentFormIndex((i) => i + 1);
        } else {
            // All forms done — NOW create session
            setShowingStartForms(false);
            setCurrentFormIndex(0);
            if (pendingStart) {
                const session = await startSession(pendingStart.workerIds, pendingStart.itemId);
                setCurrentSessionId(session.id);
                // Submit all collected answers now that we have session ID
                for (const collected of newCollected) {
                    await submitFormResponse(collected.formId, session.id, collected.answers);
                }
                setPendingStart(null);
                setCollectedStartAnswers([]);
            }
        }
    };

    const handleStop = async (workerId: number, pin: string, quantity: number, notes: string) => {
        if (endForms.length > 0 && currentSessionId) {
            setStopParams({ workerId, pin, quantity, notes });
            setCurrentFormIndex(0);
            setShowingEndForms(true);
        } else {
            await stopSession(workerId, pin, quantity, notes);
        }
    };

    const handleEndFormSubmit = async (answers: Record<string, any>) => {
        if (!currentSessionId) return;
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
                    stopParams.notes
                );
                setStopParams(null);
            }
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
                    }}
                />
            )}

            {showingEndForms && endForms[currentFormIndex] && currentSessionId && (
                <FormRenderer
                    form={endForms[currentFormIndex]}
                    sessionId={currentSessionId}
                    onSubmit={handleEndFormSubmit}
                    onClose={() => setShowingEndForms(false)}
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
                />
            )}
        </div>
    );
}