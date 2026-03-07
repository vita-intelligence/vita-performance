"use client";

import { useParams } from "next/navigation";
import { useKiosk } from "@/hooks/useKiosk";
import KioskIdle from "./_components/KioskIdle";
import KioskActive from "./_components/KioskActive";

export default function KioskPage() {
    const { token } = useParams<{ token: string }>();
    const { state, workers, isLoading, error, startSession, stopSession } = useKiosk(token);

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

    return (
        <div className="h-screen bg-background flex flex-col overflow-hidden">
            {state.active_session ? (
                <KioskActive
                    token={token}
                    session={state.active_session}
                    workers={workers}
                    onStop={stopSession}
                />
            ) : (
                <KioskIdle
                    token={token}
                    workstationName={state.workstation.name}
                    workers={workers}
                    onStart={startSession}
                />
            )}
        </div>
    );
}