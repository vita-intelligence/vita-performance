import { useState, useEffect, useCallback, useRef } from "react";
import { qcService } from "@/services/qc.service";
import { QCWorker, QCWorkstation, QCSession, QCState } from "@/types/qc";

const INACTIVITY_TIMEOUT = 2 * 60 * 1000; // 2 minutes

export const useQC = (token: string) => {
    const [state, setState] = useState<QCState>({ worker: null, workstation: null });
    const [workers, setWorkers] = useState<QCWorker[]>([]);
    const [workstations, setWorkstations] = useState<QCWorkstation[]>([]);
    const [sessions, setSessions] = useState<QCSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const resetToWorkerSelect = useCallback(() => {
        setState({ worker: null, workstation: null });
        setSessions([]);
    }, []);

    const backToWorkstations = useCallback(() => {
        setState((prev) => ({ ...prev, workstation: null }));
        setSessions([]);
    }, []);

    const resetTimer = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(resetToWorkerSelect, INACTIVITY_TIMEOUT);
    }, [resetToWorkerSelect]);

    // Inactivity timer — only active when a worker is logged in
    useEffect(() => {
        if (!state.worker) {
            if (timerRef.current) clearTimeout(timerRef.current);
            return;
        }
        resetTimer();
        window.addEventListener("touchstart", resetTimer);
        window.addEventListener("mousemove", resetTimer);
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            window.removeEventListener("touchstart", resetTimer);
            window.removeEventListener("mousemove", resetTimer);
        };
    }, [state.worker, resetTimer]);

    const load = useCallback(async () => {
        try {
            const [qcWorkers, qcWorkstations] = await Promise.all([
                qcService.getWorkers(token),
                qcService.getWorkstations(token),
            ]);
            setWorkers(qcWorkers);
            setWorkstations(qcWorkstations);
        } catch {
            setError("Invalid or expired QC link.");
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        load();
    }, [load]);

    const verifyPin = useCallback((workerId: number) => {
        const worker = workers.find((w) => w.id === workerId);
        if (worker) setState((prev) => ({ ...prev, worker }));
    }, [workers]);

    const selectWorkstation = async (workstation: QCWorkstation) => {
        setState((prev) => ({ ...prev, workstation }));
        const data = await qcService.getSessions(token, workstation.id);
        setSessions(data);
    };

    const verifySession = async (sessionId: number, quantityRejected: number) => {
        await qcService.verifySession(token, sessionId, quantityRejected);
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        resetToWorkerSelect();
    };

    const logout = () => resetToWorkerSelect();

    return {
        state,
        workers,
        workstations,
        sessions,
        isLoading,
        error,
        verifyPin,
        selectWorkstation,
        verifySession,
        logout,
        backToWorkstations,
    };
};