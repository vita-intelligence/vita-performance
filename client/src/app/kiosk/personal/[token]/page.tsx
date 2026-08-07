"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { addToast } from "@heroui/react";
import { Loader2 } from "lucide-react";
import { personalKioskService } from "@/services/personal-kiosk.service";
import { Worker, WorkerShift } from "@/types/worker";
import WorkerPicker from "./_components/WorkerPicker";
import PinKeypad from "./_components/PinKeypad";
import WorkerHome from "./_components/WorkerHome";
import PerformancePage from "./_components/PerformancePage";
import ReputationPage from "./_components/ReputationPage";
import StationsPage from "./_components/StationsPage";
import StationView from "./_components/StationView";
import QCPage from "./_components/QCPage";
import HistoryPage from "./_components/HistoryPage";
import JobsPage from "./_components/JobsPage";
import AppShell from "./_components/AppShell";

/**
 * Public personal-kiosk landing.
 *
 * The URL carries a per-tenant `PersonalKioskToken` UUID. No admin
 * login required on the tablet — pairing happens once via the settings
 * page (admin generates the token, pastes it into the tablet URL bar).
 *
 * Screen state machine:
 *   search      → search for a worker
 *   pin         → enter PIN (verification only, no shift start)
 *   home        → WorkerHome hub with explicit Clock in/out button
 *                 + tiles to Performance / Reputation / Stations
 *   performance → dedicated 14-day trend view
 *   reputation  → dedicated tier + event history view
 *   stations    → dedicated searchable station launcher
 *
 * Auth persistence: verify-pin mints a 24h server session, the
 * FE caches { session_token, expires_at, worker_id } in localStorage,
 * and the page hydrates from that cache on refresh — the worker only
 * enters their PIN once every 24h (or until they hit Log out).
 */

type Screen =
    | "search"
    | "pin"
    | "home"
    | "performance"
    | "reputation"
    | "stations"
    | "station"
    | "qc"
    | "history"
    | "jobs";

interface CachedSession {
    session_token: string;
    worker_id: number;
    expires_at: string;
}

export default function PersonalKioskTokenPage() {
    const params = useParams<{ token: string }>();
    const token = params.token;

    const [tokenValid, setTokenValid] = useState<boolean | null>(null);
    const [tokenError, setTokenError] = useState<string | null>(null);

    const [screen, setScreen] = useState<Screen>("search");
    const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
    const [sessionToken, setSessionToken] = useState<string | null>(null);
    // Which workstation the StationView is currently pointing at.
    // Cleared when we navigate away.
    const [openStationId, setOpenStationId] = useState<number | null>(null);
    // When the worker jumped to StationView from the Jobs list, remember
    // the MO step so PspStartPanel can preselect + auto-start.
    const [preselectedJob, setPreselectedJob] = useState<{
        mo_uuid: string;
        step_uuid: string;
    } | null>(null);

    const [activeShift, setActiveShift] = useState<WorkerShift | null>(null);
    const [pinError, setPinError] = useState<string | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isClocking, setIsClocking] = useState(false);
    // Hydrating from localStorage on first mount — suppress the
    // search-screen flash until we know whether we have a session.
    const [isHydrating, setIsHydrating] = useState(true);

    const deviceId = useMemo(() => getOrCreateDeviceId(), []);

    /* -------- token probe + session hydrate -------- */

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                await personalKioskService.getRoster(token, "");
                if (cancelled) return;
                setTokenValid(true);
                setTokenError(null);
            } catch (err) {
                if (cancelled) return;
                setTokenValid(false);
                setTokenError(getMsg(err));
                setIsHydrating(false);
                return;
            }

            // Token valid — try to restore a cached session.
            const cached = loadCachedSession(token);
            if (!cached) {
                if (!cancelled) setIsHydrating(false);
                return;
            }
            try {
                const payload = await personalKioskService.getSession(
                    token,
                    cached.session_token,
                );
                if (cancelled) return;
                setSelectedWorker(payload.worker);
                setSessionToken(payload.session_token);
                storeCachedSession(token, {
                    session_token: payload.session_token,
                    worker_id: payload.worker.id,
                    expires_at: payload.expires_at,
                });
                setScreen("home");
                // Kick off active-shift lookup in the background so
                // the CTA switches to Clock Out if one is open.
                void refetchActiveShift(payload.worker.id);
            } catch (err: unknown) {
                if (cancelled) return;
                // 401 = expired / revoked → clear + fall through to
                // the search screen. Any other error, silently ignore
                // (a bad network shouldn't lock the worker out).
                if (extractStatus(err) === 401) {
                    clearCachedSession(token);
                }
            } finally {
                if (!cancelled) setIsHydrating(false);
            }
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    /* -------- selection + PIN -------- */

    const handlePickWorker = (worker: Worker) => {
        setSelectedWorker(worker);
        setPinError(null);
        setScreen("pin");
    };

    const handleVerifyPin = async (pin: string) => {
        if (!selectedWorker) return;
        setIsVerifying(true);
        setPinError(null);
        try {
            const payload = await personalKioskService.verifyPin(
                token,
                selectedWorker.id,
                pin,
                deviceId,
            );
            setSelectedWorker(payload.worker);
            setSessionToken(payload.session_token);
            storeCachedSession(token, {
                session_token: payload.session_token,
                worker_id: payload.worker.id,
                expires_at: payload.expires_at,
            });
            setScreen("home");
            void refetchActiveShift(payload.worker.id);
        } catch (err: unknown) {
            const s = extractStatus(err);
            if (s === 401) {
                setPinError("Incorrect PIN. Try again.");
            } else {
                setPinError(getMsg(err));
            }
            throw err;
        } finally {
            setIsVerifying(false);
        }
    };

    const refetchActiveShift = useCallback(
        async (workerId: number) => {
            try {
                const shift = await personalKioskService.getActiveShift(
                    token,
                    workerId,
                );
                setActiveShift(shift);
            } catch (err) {
                addToast({
                    title: "Couldn’t check shift",
                    description: getMsg(err),
                    color: "danger",
                });
            }
        },
        [token],
    );

    /* -------- clock in / out -------- */

    const handleClockIn = async () => {
        if (!selectedWorker || !sessionToken) return;
        setIsClocking(true);
        try {
            const shift = await personalKioskService.startShift(
                token,
                selectedWorker.id,
                { sessionToken, deviceId },
            );
            setActiveShift(shift);
            addToast({
                title: "Clocked in",
                description: "Every session today will link to this shift.",
                color: "success",
            });
        } catch (err: unknown) {
            const s = extractStatus(err);
            if (s === 409) {
                const existing = extractExistingShift(err);
                if (existing) {
                    setActiveShift(existing);
                    return;
                }
            }
            if (s === 401) {
                // Session expired mid-flight — send them back to PIN
                // rather than silently failing.
                clearCachedSession(token);
                setSessionToken(null);
                setPinError("Session expired. Please re-enter your PIN.");
                setScreen("pin");
                return;
            }
            addToast({
                title: "Clock in failed",
                description: getMsg(err),
                color: "danger",
            });
        } finally {
            setIsClocking(false);
        }
    };

    const handleClockOut = async () => {
        if (!activeShift) return;
        setIsClocking(true);
        try {
            await personalKioskService.endShift(token, activeShift.id);
            addToast({
                title: "Clocked out",
                description: `${selectedWorker?.full_name ?? "Worker"} — shift closed.`,
                color: "success",
            });
            setActiveShift(null);
        } catch (err) {
            addToast({
                title: "Clock out failed",
                description: getMsg(err),
                color: "danger",
            });
        } finally {
            setIsClocking(false);
        }
    };

    /* -------- navigation -------- */

    const handleLogout = async () => {
        const cached = sessionToken;
        clearCachedSession(token);
        setSessionToken(null);
        setSelectedWorker(null);
        setActiveShift(null);
        setPinError(null);
        setScreen("search");
        if (cached) {
            // Fire-and-forget — the local cache is already gone so a
            // slow revoke doesn't block the UI.
            personalKioskService
                .logoutSession(token, cached)
                .catch(() => {});
        }
    };

    const goHome = () => setScreen("home");

    /* -------- renders -------- */

    if (tokenValid === false) {
        return (
            <div className="flex min-h-dvh items-center justify-center bg-background px-4">
                <div className="w-full max-w-sm space-y-3 rounded-2xl border border-danger/40 bg-danger/5 p-8 text-center">
                    <p className="text-xs font-semibold uppercase tracking-widest text-danger">
                        Invalid kiosk link
                    </p>
                    <p className="text-sm text-text">
                        {tokenError ??
                            "This tablet's pairing token isn't recognised."}
                    </p>
                    <p className="text-xs text-muted">
                        A supervisor can regenerate the link on the Workers
                        page.
                    </p>
                </div>
            </div>
        );
    }

    if (tokenValid === null || isHydrating) {
        return <FullScreenLoader label="Loading kiosk…" />;
    }

    if (screen === "pin" && selectedWorker) {
        return (
            <div className="min-h-dvh bg-background">
                <PinKeypad
                    worker={selectedWorker}
                    isLoading={isVerifying}
                    error={pinError}
                    skipPin={!selectedWorker.has_pin}
                    onSubmit={handleVerifyPin}
                    onCancel={handleLogout}
                />
            </div>
        );
    }

    // Authenticated screens all live inside the persistent AppShell so
    // the top bar (worker chip, Home, Log out) is always one tap away.
    if (selectedWorker && screen !== "search") {
        const inner = (() => {
            switch (screen) {
                case "home":
                    return (
                        <WorkerHome
                            token={token}
                            worker={selectedWorker}
                            shift={activeShift}
                            isClocking={isClocking}
                            onClockIn={handleClockIn}
                            onClockOut={handleClockOut}
                            onOpenPerformance={() => setScreen("performance")}
                            onOpenReputation={() => setScreen("reputation")}
                            onOpenStations={() => setScreen("stations")}
                            onOpenStation={(id) => {
                                setPreselectedJob(null);
                                setOpenStationId(id);
                                setScreen("station");
                            }}
                            onOpenHistory={() => setScreen("history")}
                            onOpenJobs={() => setScreen("jobs")}
                        />
                    );
                case "performance":
                    return (
                        <PerformancePage
                            token={token}
                            workerId={selectedWorker.id}
                            workerName={selectedWorker.full_name}
                        />
                    );
                case "reputation":
                    return (
                        <ReputationPage
                            token={token}
                            workerId={selectedWorker.id}
                            workerName={selectedWorker.full_name}
                        />
                    );
                case "stations":
                    return (
                        <StationsPage
                            token={token}
                            workerId={selectedWorker.id}
                            workerName={selectedWorker.full_name}
                            isClockedIn={!!activeShift}
                            onOpenStation={(id) => {
                                setPreselectedJob(null);
                                setOpenStationId(id);
                                setScreen("station");
                            }}
                            onOpenQC={() => setScreen("qc")}
                        />
                    );
                case "jobs":
                    if (!sessionToken) return null;
                    return (
                        <JobsPage
                            token={token}
                            sessionToken={sessionToken}
                            workerName={selectedWorker.full_name}
                            isClockedIn={!!activeShift}
                            onOpenJob={(row) => {
                                setPreselectedJob({
                                    mo_uuid: row.mo_uuid,
                                    step_uuid: row.step_uuid,
                                });
                                setOpenStationId(row.workstation_id);
                                setScreen("station");
                            }}
                        />
                    );
                case "qc":
                    if (!sessionToken) return null;
                    return (
                        <QCPage
                            token={token}
                            sessionToken={sessionToken}
                        />
                    );
                case "history":
                    if (!sessionToken) return null;
                    return (
                        <HistoryPage
                            token={token}
                            sessionToken={sessionToken}
                            workerId={selectedWorker.id}
                            workerName={selectedWorker.full_name}
                        />
                    );
                case "station":
                    if (!sessionToken || openStationId == null) {
                        return null;
                    }
                    return (
                        <StationView
                            token={token}
                            sessionToken={sessionToken}
                            workstationId={openStationId}
                            preselectedMoUuid={preselectedJob?.mo_uuid ?? null}
                            preselectedStepUuid={
                                preselectedJob?.step_uuid ?? null
                            }
                            isClockedIn={!!activeShift}
                            onBack={() =>
                                setScreen(preselectedJob ? "jobs" : "stations")
                            }
                        />
                    );
                default:
                    return null;
            }
        })();

        return (
            <AppShell
                worker={selectedWorker}
                shift={activeShift}
                currentScreen={screen}
                onGoHome={goHome}
                onLogout={handleLogout}
            >
                {inner}
            </AppShell>
        );
    }

    // Fallback / initial: search screen.
    return (
        <div className="min-h-dvh bg-background px-4 py-6">
            <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
                <header>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                        Personal kiosk
                    </p>
                    <h1 className="mt-1 text-2xl font-black text-text">
                        Who’s here?
                    </h1>
                    <p className="mt-1 text-xs text-muted">
                        Sign in to view your stats or clock in for the day.
                        Your PIN keeps you signed in for 24 hours.
                    </p>
                </header>

                <WorkerPicker token={token} onPick={handlePickWorker} />
            </div>
        </div>
    );
}

/* ================================================================== */
/*                            Helpers                                   */
/* ================================================================== */

function FullScreenLoader({ label }: { label: string }) {
    return (
        <div className="flex min-h-dvh items-center justify-center bg-background">
            <div className="flex items-center gap-2 text-muted">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-sm">{label}</span>
            </div>
        </div>
    );
}

function getOrCreateDeviceId(): string {
    if (typeof window === "undefined") return "";
    const KEY = "vp:personal-kiosk:device-id";
    const existing = window.localStorage.getItem(KEY);
    if (existing) return existing;
    const id = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2))
        .replace(/-/g, "")
        .slice(0, 12);
    window.localStorage.setItem(KEY, id);
    return id;
}

/* --------- session cache (scoped per URL token) --------- */
// Scoping the storage key by URL token means rotating the tablet
// pairing token also invalidates every cached session on the device.

function cacheKey(kioskToken: string): string {
    return `vp:personal-kiosk:${kioskToken}:auth`;
}

function loadCachedSession(kioskToken: string): CachedSession | null {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(cacheKey(kioskToken));
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as CachedSession;
        if (!parsed?.session_token || !parsed?.expires_at) return null;
        if (new Date(parsed.expires_at).getTime() <= Date.now()) {
            window.localStorage.removeItem(cacheKey(kioskToken));
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

function storeCachedSession(kioskToken: string, session: CachedSession) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(cacheKey(kioskToken), JSON.stringify(session));
}

function clearCachedSession(kioskToken: string) {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(cacheKey(kioskToken));
}

function extractStatus(err: unknown): number | null {
    if (typeof err !== "object" || err === null) return null;
    return (err as { status?: number }).status ?? null;
}

function extractExistingShift(err: unknown): WorkerShift | null {
    if (typeof err !== "object" || err === null) return null;
    return (err as { body?: { shift?: WorkerShift } }).body?.shift ?? null;
}

function getMsg(err: unknown): string {
    if (err instanceof Error) return err.message;
    return "Unknown error.";
}
