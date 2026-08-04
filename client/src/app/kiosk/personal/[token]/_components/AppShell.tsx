"use client";

import { useEffect, useState } from "react";
import { Button } from "@heroui/react";
import { Clock, Home, LogOut } from "lucide-react";
import { Worker, WorkerShift } from "@/types/worker";

type Screen =
    | "search"
    | "pin"
    | "home"
    | "performance"
    | "reputation"
    | "stations"
    | "station"
    | "qc"
    | "history";

interface AppShellProps {
    worker: Worker;
    shift: WorkerShift | null;
    currentScreen: Screen;
    onGoHome: () => void;
    onLogout: () => void;
    children: React.ReactNode;
}

const SCREEN_TITLE: Record<Exclude<Screen, "search" | "pin">, string> = {
    home: "Home",
    performance: "Performance",
    reputation: "Reputation",
    stations: "Stations",
    station: "Workstation",
    qc: "QC review",
    history: "History",
};

/**
 * Persistent app shell rendered around every post-auth screen.
 *
 * Mirrors the workstation-kiosk + QC-kiosk layout skeleton (fixed top
 * strip with worker identity + logout on the right) so the personal
 * kiosk feels like part of the same product family. The worker chip
 * on the left doubles as the Home shortcut — one tap from anywhere
 * back to the hub.
 *
 * When a shift is open, the shift timer lives in the top bar so the
 * worker always knows how long they've been clocked in, even from
 * inside a sub-screen.
 */
export default function AppShell({
    worker,
    shift,
    currentScreen,
    onGoHome,
    onLogout,
    children,
}: AppShellProps) {
    const [nowMs, setNowMs] = useState(() => Date.now());
    useEffect(() => {
        if (!shift) return;
        const id = setInterval(() => setNowMs(Date.now()), 1000);
        return () => clearInterval(id);
    }, [shift]);

    const isHome = currentScreen === "home";
    const title =
        currentScreen in SCREEN_TITLE
            ? SCREEN_TITLE[currentScreen as keyof typeof SCREEN_TITLE]
            : "";

    return (
        <div className="min-h-dvh bg-background">
            <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
                <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3">
                    {/* Worker chip → Home. Tap target is the entire
                        chip so tablet users can hit it without aiming. */}
                    <button
                        type="button"
                        onClick={onGoHome}
                        aria-label="Home"
                        className={`group flex min-w-0 items-center gap-2 rounded-2xl border px-3 py-2 transition-colors ${
                            isHome
                                ? "border-primary/40 bg-primary/10"
                                : "border-border bg-background hover:bg-surface"
                        }`}
                    >
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-black text-primary">
                            {initials(worker.full_name)}
                        </div>
                        <div className="min-w-0 text-left">
                            <p className="truncate text-sm font-black text-text">
                                {firstName(worker.full_name)}
                            </p>
                            <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted">
                                {isHome ? "Home" : `${title} · tap for home`}
                            </p>
                        </div>
                        {!isHome && (
                            <Home className="size-4 shrink-0 text-muted transition-colors group-hover:text-text" />
                        )}
                    </button>

                    {/* Shift ticker — only visible when clocked in. */}
                    {shift && (
                        <div className="hidden sm:flex items-center gap-2 rounded-full border border-success/40 bg-success/5 px-3 py-1.5 text-success">
                            <span className="relative flex size-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                                <span className="relative inline-flex size-2 rounded-full bg-success" />
                            </span>
                            <Clock className="size-3.5" />
                            <span className="text-xs font-black tabular-nums">
                                {formatElapsed(nowMs, shift.clocked_in_at)}
                            </span>
                        </div>
                    )}

                    <div className="ml-auto">
                        <Button
                            size="sm"
                            variant="light"
                            color="danger"
                            startContent={<LogOut className="size-4" />}
                            onPress={onLogout}
                        >
                            Log out
                        </Button>
                    </div>
                </div>

                {/* Mobile-only shift ticker under the chip so it never
                    gets clipped on narrow tablets. */}
                {shift && (
                    <div className="sm:hidden flex items-center justify-center gap-2 border-t border-border/50 bg-success/5 px-4 py-1.5 text-success">
                        <span className="relative flex size-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                            <span className="relative inline-flex size-2 rounded-full bg-success" />
                        </span>
                        <Clock className="size-3.5" />
                        <span className="text-xs font-black tabular-nums">
                            On shift · {formatElapsed(nowMs, shift.clocked_in_at)}
                        </span>
                    </div>
                )}
            </header>

            {children}
        </div>
    );
}

/* -------- helpers -------- */

function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function firstName(full: string): string {
    return full.trim().split(/\s+/)[0] || full;
}

function formatElapsed(nowMs: number, clockedInIso: string): string {
    const startMs = new Date(clockedInIso).getTime();
    const seconds = Math.max(0, Math.floor((nowMs - startMs) / 1000));
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
        return `${h}h ${m.toString().padStart(2, "0")}m`;
    }
    return `${m}m ${s.toString().padStart(2, "0")}s`;
}
