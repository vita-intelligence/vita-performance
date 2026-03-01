"use client";

import { useState } from "react";
import Link from "next/link";
import { useSessions } from "@/hooks/useSessions";
import { WorkSession } from "@/types/session";
import ActiveSessionsHeader from "./_components/ActiveSessionsHeader";
import ActiveSessionCard from "./_components/ActiveSessionCard";
import StopSessionDrawer from "./_components/StopSessionDrawer";

export default function ActiveSessionsPage() {
    const { activeSessions, isActiveSessionsLoading } = useSessions();
    const [selectedSession, setSelectedSession] = useState<WorkSession | null>(null);

    return (
        <main className="bg-background px-4 py-12 sm:px-8 lg:px-16">
            <div className="max-w-6xl mx-auto flex flex-col gap-10">
                <ActiveSessionsHeader />

                {isActiveSessionsLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <p className="text-muted text-sm uppercase tracking-widest">Loading...</p>
                    </div>
                ) : !activeSessions?.length ? (
                    <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border gap-4">
                        <p className="text-muted text-sm uppercase tracking-widest">No active sessions</p>
                        <Link
                            href="/sessions/new"
                            className="text-xs font-semibold uppercase tracking-widest text-text underline"
                        >
                            Start a new session
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeSessions.map((session) => (
                            <ActiveSessionCard
                                key={session.id}
                                session={session}
                                onStop={setSelectedSession}
                            />
                        ))}
                    </div>
                )}
            </div>

            <StopSessionDrawer
                session={selectedSession}
                onClose={() => setSelectedSession(null)}
            />
        </main>
    );
}