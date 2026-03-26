"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSessions } from "@/hooks/useSessions";
import { useDebounce } from "@/hooks/useDebounce";
import { WorkSession } from "@/types/session";
import SessionsHeader from "./_components/SessionsHeader";
import SessionTable from "./_components/SessionTable";
import EditSessionDrawer from "./_components/EditSessionDrawer";
import SessionCards from "./_components/SessionCards";

const STATUS_OPTIONS = [
    { value: "", label: "All Statuses" },
    { value: "completed", label: "Completed" },
    { value: "verified", label: "Verified" },
];

export default function SessionsPage() {
    const [searchInput, setSearchInput] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const debouncedSearch = useDebounce(searchInput, 300);

    const {
        sessions,
        isSessionsLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useSessions(debouncedSearch || undefined, statusFilter || undefined);

    const [selectedSession, setSelectedSession] = useState<WorkSession | null>(null);
    const loadMoreRef = useRef<HTMLDivElement | null>(null);

    const completedSessions = sessions?.filter((s) => s.status === "completed" || s.status === "verified") || [];

    // Infinite Scroll Observer
    useEffect(() => {
        if (!hasNextPage) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    fetchNextPage();
                }
            },
            { threshold: 1 }
        );

        const el = loadMoreRef.current;
        if (el) observer.observe(el);
        return () => { if (el) observer.unobserve(el); };
    }, [fetchNextPage, hasNextPage]);

    return (
        <main className="bg-background px-4 py-12 sm:px-8 lg:px-16">
            <div className="max-w-6xl mx-auto flex flex-col gap-10">
                <SessionsHeader />

                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search by workstation, worker, or item..."
                        className="flex-1 border border-border bg-background text-text px-4 py-3 text-sm outline-none focus:border-text transition-colors"
                    />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="border border-border bg-background text-text px-4 py-3 text-sm outline-none focus:border-text transition-colors sm:w-48"
                    >
                        {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>

                {isSessionsLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <p className="text-muted text-sm uppercase tracking-widest">Loading...</p>
                    </div>
                ) : !completedSessions.length ? (
                    <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border gap-4">
                        <p className="text-muted text-sm uppercase tracking-widest">
                            {debouncedSearch || statusFilter ? "No sessions found" : "No sessions yet"}
                        </p>
                        {!debouncedSearch && !statusFilter && (
                            <Link
                                href="/sessions/new"
                                className="text-xs font-semibold uppercase tracking-widest text-text underline"
                            >
                                Log your first session
                            </Link>
                        )}
                    </div>
                ) : (
                    <>
                        <SessionTable sessions={completedSessions} onEdit={setSelectedSession} />
                        <SessionCards sessions={completedSessions} onEdit={setSelectedSession} />

                        {/* Sentinel */}
                        <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
                            {isFetchingNextPage && (
                                <p className="text-muted text-xs uppercase tracking-widest">
                                    Loading more...
                                </p>
                            )}
                        </div>
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
