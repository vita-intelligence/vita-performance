import { useState, useEffect, useCallback } from "react";
import { kioskService } from "@/services/kiosk.service";
import { KioskState, KioskWorker } from "@/types/kiosk";

export const useKiosk = (token: string) => {
    const [state, setState] = useState<KioskState | null>(null);
    const [workers, setWorkers] = useState<KioskWorker[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        try {
            const [kioskState, kioskWorkers] = await Promise.all([
                kioskService.getWorkstation(token),
                kioskService.getWorkers(token),
            ]);
            setState(kioskState);
            setWorkers(kioskWorkers);
        } catch {
            setError("Invalid or expired kiosk link.");
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        load();
    }, [load]);

    const startSession = async (workerIds: number[], itemId?: number | null) => {
        try {
            const session = await kioskService.startSession(token, workerIds, itemId);
            setState((prev) => prev ? { ...prev, active_session: session } : prev);
        } catch (e: any) {
            throw new Error(e?.response?.data?.detail || "Failed to start session.");
        }
    };

    const stopSession = async (workerId: number, pin: string, quantity: number, notes: string) => {
        try {
            await kioskService.stopSession(token, workerId, pin, quantity, notes);
            setState((prev) => prev ? { ...prev, active_session: null } : prev);
        } catch (e: any) {
            throw new Error(e?.response?.data?.detail || "Failed to stop session.");
        }
    };

    return {
        state,
        workers,
        isLoading,
        error,
        startSession,
        stopSession,
    };
};