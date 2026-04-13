"use client";

import { useParams } from "next/navigation";
import { useQC } from "@/hooks/useQC";
import QCWorkerSelect from "./_components/QCWorkerSelect";
import QCDashboard from "./_components/QCDashboard";

export default function QCPage() {
    const { token } = useParams<{ token: string }>();
    const {
        state,
        workers,
        allWorkers,
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
        reloadAfterFeedback,
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
            {!state.worker ? (
                <QCWorkerSelect
                    token={token}
                    workers={workers}
                    onVerified={verifyPin}
                />
            ) : (
                <QCDashboard
                    token={token}
                    worker={state.worker}
                    allWorkers={allWorkers}
                    workstations={workstations}
                    sessions={sessions}
                    count={count}
                    page={page}
                    totalPages={totalPages}
                    filters={filters}
                    isLoadingSessions={isLoadingSessions}
                    isVerifying={isVerifying}
                    onUpdateFilters={updateFilters}
                    onGoToPage={goToPage}
                    onVerify={verifySession}
                    onLogout={logout}
                    onFeedbackSubmitted={reloadAfterFeedback}
                />
            )}
        </div>
    );
}
