"use client";

import { useParams } from "next/navigation";
import { useQC } from "@/hooks/useQC";
import QCWorkerSelect from "./_components/QCWorkerSelect";
import QCWorkstationList from "./_components/QCWorkstationList";
import QCSessionList from "./_components/QCSessionList";

export default function QCPage() {
    const { token } = useParams<{ token: string }>();
    const {
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
        backToWorkstations
    } = useQC(token);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <p className="text-muted text-xs uppercase tracking-widest">Loading...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <p className="text-error text-sm uppercase tracking-widest font-semibold">{error}</p>
            </div>
        );
    }

    return (
        <div className="h-screen bg-background flex flex-col overflow-hidden">
            {/* No worker logged in — show worker selection */}
            {!state.worker && (
                <QCWorkerSelect
                    token={token}
                    workers={workers}
                    onVerified={verifyPin}
                />
            )}

            {/* Worker logged in, no workstation selected */}
            {state.worker && !state.workstation && (
                <QCWorkstationList
                    worker={state.worker}
                    workstations={workstations}
                    onSelect={selectWorkstation}
                    onLogout={logout}
                />
            )}

            {/* Worker logged in, workstation selected */}
            {state.worker && state.workstation && (
                <QCSessionList
                    worker={state.worker}
                    workstation={state.workstation}
                    sessions={sessions}
                    onVerify={verifySession}
                    onBack={backToWorkstations}
                    onLogout={logout}
                />
            )}
        </div>
    );
}