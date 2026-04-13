import { useState, useEffect, useCallback, useRef } from "react";
import { qcService } from "@/services/qc.service";
import { QCWorker, QCWorkstation, QCSession, QCSessionFilters, QCState } from "@/types/qc";

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const PAGE_SIZE = 25;

export const useQC = (token: string) => {
    const [state, setState] = useState<QCState>({ worker: null });
    const [workers, setWorkers] = useState<QCWorker[]>([]);
    const [workstations, setWorkstations] = useState<QCWorkstation[]>([]);
    const [sessions, setSessions] = useState<QCSession[]>([]);
    const [count, setCount] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [filters, setFilters] = useState<QCSessionFilters>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingSessions, setIsLoadingSessions] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState("");
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const logout = useCallback(() => {
        setState({ worker: null });
        setSessions([]);
        setFilters({});
        setPage(1);
    }, []);

    const resetTimer = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(logout, INACTIVITY_TIMEOUT);
    }, [logout]);

    useEffect(() => {
        if (!state.worker) {
            if (timerRef.current) clearTimeout(timerRef.current);
            return;
        }
        resetTimer();
        const handler = () => resetTimer();
        window.addEventListener("touchstart", handler);
        window.addEventListener("mousemove", handler);
        window.addEventListener("keydown", handler);
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            window.removeEventListener("touchstart", handler);
            window.removeEventListener("mousemove", handler);
            window.removeEventListener("keydown", handler);
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

    const fetchSessions = useCallback(async (nextFilters: QCSessionFilters, nextPage: number) => {
        setIsLoadingSessions(true);
        try {
            const data = await qcService.getSessions(token, { ...nextFilters, page: nextPage, page_size: PAGE_SIZE });
            setSessions(data.results);
            setCount(data.count);
            setPage(data.page);
            setTotalPages(data.total_pages);
        } catch {
            setSessions([]);
            setCount(0);
            setTotalPages(0);
        } finally {
            setIsLoadingSessions(false);
        }
    }, [token]);

    // Fetch sessions whenever worker logs in or filters change
    useEffect(() => {
        if (!state.worker) return;
        fetchSessions(filters, page);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.worker, filters, page]);

    // Refresh workstations list periodically once logged in
    useEffect(() => {
        if (!state.worker) return;
        const i = setInterval(async () => {
            try {
                const ws = await qcService.getWorkstations(token);
                setWorkstations(ws);
            } catch { }
        }, 60_000);
        return () => clearInterval(i);
    }, [state.worker, token]);

    const verifyPin = useCallback((workerId: number) => {
        const worker = workers.find((w) => w.id === workerId);
        if (worker) setState({ worker });
    }, [workers]);

    const updateFilters = useCallback((next: Partial<QCSessionFilters>) => {
        setFilters((prev) => ({ ...prev, ...next }));
        setPage(1);
    }, []);

    const goToPage = useCallback((p: number) => {
        setPage(p);
    }, []);

    const verifySession = async (sessionId: number, quantityRejected: number) => {
        setIsVerifying(true);
        try {
            await qcService.verifySession(token, sessionId, quantityRejected);
            // Optimistic update — drop from list, then refetch in background
            setSessions((prev) => prev.filter((s) => s.id !== sessionId));
            setCount((c) => Math.max(0, c - 1));
            fetchSessions(filters, page);
        } finally {
            setIsVerifying(false);
        }
    };

    return {
        state,
        workers,
        workstations,
        sessions,
        count,
        page,
        totalPages,
        filters,
        isLoading,
        isLoadingSessions,
        isVerifying,
        error,
        verifyPin,
        verifySession,
        logout,
        updateFilters,
        goToPage,
    };
};
