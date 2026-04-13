"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@heroui/react";
import { LogOut, Search, X, ChevronLeft, ChevronRight, Loader2, MessageSquarePlus } from "lucide-react";
import { QCWorker, QCWorkstation, QCSession, QCSessionFilters, QCFeedbackMark } from "@/types/qc";
import { useDebounce } from "@/hooks/useDebounce";
import QCVerifyDrawer from "./QCVerifyDrawer";
import QCGeneralFeedbackDrawer from "./QCGeneralFeedbackDrawer";

interface QCDashboardProps {
    token: string;
    worker: QCWorker;
    allWorkers: QCWorker[];
    workstations: QCWorkstation[];
    sessions: QCSession[];
    count: number;
    page: number;
    totalPages: number;
    filters: QCSessionFilters;
    isLoadingSessions: boolean;
    isVerifying: boolean;
    onUpdateFilters: (next: Partial<QCSessionFilters>) => void;
    onGoToPage: (page: number) => void;
    onVerify: (sessionId: number, quantityRejected: number, feedback: QCFeedbackMark[]) => Promise<void> | void;
    onLogout: () => void;
    onFeedbackSubmitted: () => void;
}

function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" }) +
        " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export default function QCDashboard({
    token,
    worker,
    allWorkers,
    workstations,
    sessions,
    count,
    page,
    totalPages,
    filters,
    isLoadingSessions,
    isVerifying,
    onUpdateFilters,
    onGoToPage,
    onVerify,
    onLogout,
    onFeedbackSubmitted,
}: QCDashboardProps) {
    const [searchInput, setSearchInput] = useState(filters.search || "");
    const debouncedSearch = useDebounce(searchInput, 300);
    const [selected, setSelected] = useState<QCSession | null>(null);
    const [generalOpen, setGeneralOpen] = useState(false);

    useEffect(() => {
        if ((filters.search || "") !== debouncedSearch) {
            onUpdateFilters({ search: debouncedSearch || undefined });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch]);

    const workstationOptions = useMemo(
        () => [{ id: 0, name: "All workstations" }, ...workstations],
        [workstations]
    );

    const handleClearFilters = () => {
        setSearchInput("");
        onUpdateFilters({
            search: undefined,
            workstation: null,
            date_from: undefined,
            date_to: undefined,
        });
    };

    const hasActiveFilters = Boolean(
        filters.search || filters.workstation || filters.date_from || filters.date_to
    );

    return (
        <>
            <div className="flex flex-col h-full overflow-hidden">
                {/* Header */}
                <div className="px-4 sm:px-6 pt-6 pb-4 border-b border-border flex items-start justify-between gap-4 shrink-0">
                    <div className="flex flex-col gap-0.5">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted">Quality Control</p>
                        <h1 className="text-2xl sm:text-3xl font-black text-text uppercase tracking-tight">
                            Pending QC ({count})
                        </h1>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <p className="text-xs font-semibold uppercase tracking-widest text-success">{worker.name}</p>
                        <div className="flex items-center gap-3">
                            <Button
                                onPress={() => setGeneralOpen(true)}
                                variant="bordered"
                                className="rounded-none border-text text-text text-xs font-semibold uppercase tracking-widest hover:bg-text hover:text-background h-9 px-3"
                                startContent={<MessageSquarePlus size={12} />}
                            >
                                Feedback
                            </Button>
                            <Button
                                onPress={onLogout}
                                variant="light"
                                className="text-xs font-semibold uppercase tracking-widest text-muted hover:text-error rounded-none h-auto p-0 min-w-0"
                                startContent={<LogOut size={12} />}
                            >
                                Logout
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Filter bar */}
                <div className="px-4 sm:px-6 py-3 border-b border-border flex flex-wrap gap-2 shrink-0">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search workstation, worker, or item..."
                            className="w-full pl-9 pr-9 py-2 text-sm bg-surface border border-border focus:border-text outline-none text-text placeholder:text-muted"
                        />
                        {searchInput && (
                            <button
                                onClick={() => setSearchInput("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <select
                        value={filters.workstation || 0}
                        onChange={(e) => onUpdateFilters({ workstation: Number(e.target.value) || null })}
                        className="px-3 py-2 text-sm bg-surface border border-border focus:border-text outline-none text-text"
                    >
                        {workstationOptions.map((w) => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                    </select>

                    <input
                        type="date"
                        value={filters.date_from || ""}
                        onChange={(e) => onUpdateFilters({ date_from: e.target.value || undefined })}
                        className="px-3 py-2 text-sm bg-surface border border-border focus:border-text outline-none text-text"
                    />
                    <input
                        type="date"
                        value={filters.date_to || ""}
                        onChange={(e) => onUpdateFilters({ date_to: e.target.value || undefined })}
                        className="px-3 py-2 text-sm bg-surface border border-border focus:border-text outline-none text-text"
                    />

                    {hasActiveFilters && (
                        <Button
                            onPress={handleClearFilters}
                            variant="bordered"
                            className="rounded-none border-border text-muted text-xs font-semibold uppercase tracking-widest hover:border-text hover:text-text px-3"
                            startContent={<X size={12} />}
                        >
                            Clear
                        </Button>
                    )}
                </div>

                {/* Session list */}
                <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 flex flex-col gap-2">
                    {isLoadingSessions && sessions.length === 0 ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 size={24} className="animate-spin text-muted" />
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-2">
                            <p className="text-sm text-muted uppercase tracking-widest">No pending sessions</p>
                            {hasActiveFilters && (
                                <p className="text-xs text-muted">Try clearing filters</p>
                            )}
                        </div>
                    ) : (
                        sessions.map((session) => (
                            <button
                                key={session.id}
                                onClick={() => setSelected(session)}
                                className="w-full text-left px-4 py-4 border border-border hover:border-text hover:bg-surface transition-colors flex flex-col gap-2 shrink-0"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-sm font-black uppercase tracking-wide text-text truncate">
                                        {session.workers.map((w) => w.name).join(", ")}
                                    </span>
                                    <span className="text-xs font-semibold uppercase tracking-widest text-muted shrink-0">
                                        {session.duration_hours ? `${session.duration_hours}h` : "—"}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-3 text-xs text-muted uppercase tracking-widest">
                                    <span className="truncate">{session.workstation_name || "—"}</span>
                                    <span className="shrink-0">
                                        {session.quantity_produced
                                            ? `${session.quantity_produced} ${session.workstation_uom || "units"}`
                                            : "—"}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-3 text-xs text-muted">
                                    <span className="truncate">{session.item_name || "—"}</span>
                                    <span className="shrink-0">{formatDate(session.start_time)}</span>
                                </div>
                            </button>
                        ))
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-4 sm:px-6 py-3 border-t border-border flex items-center justify-between gap-3 shrink-0">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                            Page {page} of {totalPages}
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                onPress={() => onGoToPage(page - 1)}
                                isDisabled={page <= 1 || isLoadingSessions}
                                variant="bordered"
                                className="rounded-none border-border text-text text-xs font-semibold uppercase tracking-widest hover:border-text disabled:opacity-30 px-3"
                            >
                                <ChevronLeft size={14} />
                            </Button>
                            <Button
                                onPress={() => onGoToPage(page + 1)}
                                isDisabled={page >= totalPages || isLoadingSessions}
                                variant="bordered"
                                className="rounded-none border-border text-text text-xs font-semibold uppercase tracking-widest hover:border-text disabled:opacity-30 px-3"
                            >
                                <ChevronRight size={14} />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <QCVerifyDrawer
                session={selected}
                isVerifying={isVerifying}
                onClose={() => setSelected(null)}
                onVerify={async (id, rejected, feedback) => {
                    await onVerify(id, rejected, feedback);
                    setSelected(null);
                }}
            />

            <QCGeneralFeedbackDrawer
                token={token}
                isOpen={generalOpen}
                inspector={worker}
                workers={allWorkers}
                onClose={() => setGeneralOpen(false)}
                onSubmitted={onFeedbackSubmitted}
            />
        </>
    );
}
