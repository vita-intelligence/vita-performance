"use client";

import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Worker, ReputationTimelineFilters } from "@/types/worker";
import { useDebounce } from "@/hooks/useDebounce";

interface ReputationFiltersProps {
    workers: Worker[];
    filters: ReputationTimelineFilters;
    onChange: (filters: ReputationTimelineFilters) => void;
    hideWorkerSelect?: boolean;
}

export default function ReputationFilters({ workers, filters, onChange, hideWorkerSelect = false }: ReputationFiltersProps) {
    const [searchInput, setSearchInput] = useState(filters.search || "");
    const debounced = useDebounce(searchInput, 300);

    useEffect(() => {
        if ((filters.search || "") !== debounced) {
            onChange({ ...filters, search: debounced || undefined });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debounced]);

    const hasActive = Boolean(
        filters.search ||
        filters.worker ||
        filters.category ||
        filters.sign ||
        filters.date_from ||
        filters.date_to
    );

    const clear = () => {
        setSearchInput("");
        onChange({});
    };

    return (
        <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[220px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search worker, reason, inspector, station..."
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

            {!hideWorkerSelect && (
                <select
                    value={filters.worker || 0}
                    onChange={(e) => onChange({ ...filters, worker: Number(e.target.value) || null })}
                    className="px-3 py-2 text-sm bg-surface border border-border focus:border-text outline-none text-text"
                >
                    <option value={0}>All workers</option>
                    {workers.map((w) => (
                        <option key={w.id} value={w.id}>{w.full_name}</option>
                    ))}
                </select>
            )}

            <select
                value={filters.category || ""}
                onChange={(e) => onChange({ ...filters, category: (e.target.value || null) as 'auto' | 'manual' | null })}
                className="px-3 py-2 text-sm bg-surface border border-border focus:border-text outline-none text-text"
            >
                <option value="">All sources</option>
                <option value="auto">Automatic</option>
                <option value="manual">Manual feedback</option>
            </select>

            <select
                value={filters.sign || ""}
                onChange={(e) => onChange({ ...filters, sign: (e.target.value || null) as 'positive' | 'negative' | null })}
                className="px-3 py-2 text-sm bg-surface border border-border focus:border-text outline-none text-text"
            >
                <option value="">+ and −</option>
                <option value="positive">Positive only</option>
                <option value="negative">Negative only</option>
            </select>

            <input
                type="date"
                value={filters.date_from || ""}
                onChange={(e) => onChange({ ...filters, date_from: e.target.value || undefined })}
                className="px-3 py-2 text-sm bg-surface border border-border focus:border-text outline-none text-text"
            />
            <input
                type="date"
                value={filters.date_to || ""}
                onChange={(e) => onChange({ ...filters, date_to: e.target.value || undefined })}
                className="px-3 py-2 text-sm bg-surface border border-border focus:border-text outline-none text-text"
            />

            {hasActive && (
                <button
                    onClick={clear}
                    className="flex items-center gap-1 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-muted hover:text-text border border-border hover:border-text"
                >
                    <X size={12} />
                    Clear
                </button>
            )}
        </div>
    );
}
