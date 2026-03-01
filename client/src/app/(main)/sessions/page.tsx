"use client";

import { useState } from "react";
import Link from "next/link";
import { useSessions } from "@/hooks/useSessions";
import { WorkSession } from "@/types/session";
import SessionsHeader from "./_components/SessionsHeader";
import SessionTable from "./_components/SessionTable";
import EditSessionDrawer from "./_components/EditSessionDrawer";
import SessionCards from "./_components/SessionCards";

export default function SessionsPage() {
    const { sessions, isSessionsLoading } = useSessions();
    const [selectedSession, setSelectedSession] = useState<WorkSession | null>(null);

    const completedSessions = sessions?.filter((s) => s.status === "completed") || [];

    return (
        <main className="min-h-screen bg-background px-4 py-12 sm:px-8 lg:px-16">
            <div className="max-w-6xl mx-auto flex flex-col gap-10">
                <SessionsHeader />

                {isSessionsLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <p className="text-muted text-sm uppercase tracking-widest">Loading...</p>
                    </div>
                ) : !completedSessions.length ? (
                    <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border gap-4">
                        <p className="text-muted text-sm uppercase tracking-widest">No sessions yet</p>
                        <Link
                            href="/sessions/new"
                            className="text-xs font-semibold uppercase tracking-widest text-text underline"
                        >
                            Log your first session
                        </Link>
                    </div>
                ) : (
                    <>
                        <SessionTable sessions={completedSessions} onEdit={setSelectedSession} />
                        <SessionCards sessions={completedSessions} onEdit={setSelectedSession} />
                    </>
                )}
            </div>

            <EditSessionDrawer
                session={selectedSession}
                onClose={() => setSelectedSession(null)}
            />
        </main>
    );
}