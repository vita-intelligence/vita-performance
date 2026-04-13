import { useState, useEffect, useCallback } from "react";
import { kioskService } from "@/services/kiosk.service";
import { KioskState, KioskWorker } from "@/types/kiosk";
import { KioskForm } from "@/types/dynamic-form";
import { dynamicFormService } from "@/services/dynamic-form.service";

export const useKiosk = (token: string) => {
    const [state, setState] = useState<KioskState | null>(null);
    const [workers, setWorkers] = useState<KioskWorker[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [sop, setSOP] = useState<{ content: string; updated_at: string | null } | null>(null);
    const [isSOPLoading, setIsSOPLoading] = useState(false);
    const [startForms, setStartForms] = useState<KioskForm[]>([]);
    const [endForms, setEndForms] = useState<KioskForm[]>([]);

    const load = useCallback(async () => {
        try {
            const [kioskState, kioskWorkers, sForms, eForms] = await Promise.all([
                kioskService.getWorkstation(token),
                kioskService.getWorkers(token),
                dynamicFormService.getKioskForms(token, "start"),
                dynamicFormService.getKioskForms(token, "end"),
            ]);
            setState(kioskState);
            setWorkers(kioskWorkers);
            setStartForms(sForms);
            setEndForms(eForms);
        } catch {
            setError("Invalid or expired kiosk link.");
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (state?.active_session) {
            fetchSOP();
        }
    }, [state?.active_session]);

    const fetchSOP = useCallback(async () => {
        if (sop !== null) return;
        setIsSOPLoading(true);
        try {
            const data = await kioskService.getSOP(token);
            setSOP(data);
        } catch {
            setSOP({ content: "", updated_at: null });
        } finally {
            setIsSOPLoading(false);
        }
    }, [token, sop]);

    const startSession = async (workerIds: number[], itemId?: number | null, requestedAt?: string) => {
        try {
            const session = await kioskService.startSession(token, workerIds, itemId, requestedAt);
            setState((prev) => prev ? { ...prev, active_session: session } : prev);
            return session;
        } catch (e: any) {
            throw new Error(e?.response?.data?.detail || "Failed to start session.");
        }
    };

    const stopSession = async (workerId: number, pin: string, quantity: number, notes: string, requestedAt?: string) => {
        try {
            const completed = await kioskService.stopSession(token, workerId, pin, quantity, notes, requestedAt);
            setState((prev) => prev ? { ...prev, active_session: null } : prev);
            return completed;
        } catch (e: any) {
            throw new Error(e?.response?.data?.detail || "Failed to stop session.");
        }
    };

    const submitFormResponse = async (formId: number, sessionId: number, answers: Record<string, any>) => {
        await dynamicFormService.submitResponse(token, formId, sessionId, answers);
    };

    return {
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
    };
};