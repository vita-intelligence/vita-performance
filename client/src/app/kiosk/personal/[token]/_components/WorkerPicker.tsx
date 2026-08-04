"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { Loader2, Search, UserRound, X } from "lucide-react";
import { personalKioskService } from "@/services/personal-kiosk.service";
import { Worker } from "@/types/worker";

interface WorkerPickerProps {
    token: string;
    onPick: (worker: Worker) => void;
}

/**
 * Search-first roster picker. Explicit Search button (not debounced)
 * so slow / one-finger typers on the tablet don't fire the API on
 * every keystroke while still mid-word. Enter key on the input also
 * fires the search.
 *
 * Empty state, no-match state, and error state all surface distinctly
 * so an operator never sees a blank frame and wonders if the tablet's
 * frozen. Server hard-caps at 5 rows.
 */
export default function WorkerPicker({ token, onPick }: WorkerPickerProps) {
    const [query, setQuery] = useState("");
    // The query that produced `results` — used for "no matches for X"
    // copy so the message reflects what was actually searched, not
    // what the operator has typed since (they might be retyping).
    const [committedQuery, setCommittedQuery] = useState("");
    const [results, setResults] = useState<Worker[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    const runSearch = async () => {
        const trimmed = query.trim();
        if (!trimmed) return;
        setLoading(true);
        setError(null);
        setCommittedQuery(trimmed);
        try {
            const r = await personalKioskService.getRoster(token, trimmed);
            setResults(r);
            setHasSearched(true);
        } catch (err) {
            setError(getMsg(err));
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        setQuery("");
        setResults([]);
        setError(null);
        setHasSearched(false);
        setCommittedQuery("");
    };

    const canSearch = query.trim().length > 0 && !loading;

    return (
        <div className="flex flex-col gap-4">
            {/* Search bar + button — big tap targets for tablet use. */}
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    if (canSearch) void runSearch();
                }}
                className="flex flex-col gap-2 sm:flex-row"
            >
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted" />
                    <input
                        type="text"
                        autoFocus
                        inputMode="search"
                        autoComplete="off"
                        autoCorrect="off"
                        placeholder="Type your name, then tap Search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full h-14 rounded-2xl border border-border bg-background pl-12 pr-11 text-lg text-text placeholder:text-muted focus:border-primary focus:outline-none"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={handleClear}
                            aria-label="Clear search"
                            className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex size-8 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-text"
                        >
                            <X className="size-4" />
                        </button>
                    )}
                </div>
                <Button
                    type="submit"
                    color="primary"
                    size="lg"
                    isLoading={loading}
                    isDisabled={!canSearch}
                    startContent={
                        !loading ? <Search className="size-4" /> : undefined
                    }
                    className="h-14 sm:w-32"
                >
                    Search
                </Button>
            </form>

            {/* Results / empty state / error. */}
            {error && (
                <div className="rounded-2xl border border-danger/40 bg-danger/5 p-4 text-sm text-danger">
                    {error}
                </div>
            )}

            {!error && !hasSearched && !loading && (
                <EmptyState
                    icon={<Search className="size-6 opacity-50" />}
                    title="Type your name to begin"
                    body="Enter your name in the box above, then tap Search. We’ll show up to 5 matches."
                />
            )}

            {!error && hasSearched && !loading && results.length === 0 && (
                <EmptyState
                    icon={<UserRound className="size-6 opacity-50" />}
                    title="No matches"
                    body={`No active worker matches "${committedQuery}". Try a different spelling or ask your supervisor.`}
                />
            )}

            {loading && (
                <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface p-6 text-sm text-muted">
                    <Loader2 className="size-4 animate-spin" />
                    Searching…
                </div>
            )}

            {!loading && results.length > 0 && (
                <ul className="flex flex-col gap-2">
                    {results.map((w) => (
                        <li key={w.id}>
                            <button
                                type="button"
                                onClick={() => onPick(w)}
                                className="flex w-full items-center gap-4 rounded-2xl border border-border bg-background p-4 text-left transition-colors hover:border-primary/50 hover:bg-surface active:scale-[0.99]"
                            >
                                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary">
                                    {initials(w.full_name)}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-base font-semibold text-text">
                                        {w.full_name}
                                    </p>
                                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                                        {w.group_name && (
                                            <span className="truncate">{w.group_name}</span>
                                        )}
                                        {!w.has_pin && (
                                            <span className="rounded-full bg-warning/15 px-2 py-0.5 font-semibold uppercase tracking-wider text-warning">
                                                No PIN
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function EmptyState({
    icon,
    title,
    body,
}: {
    icon: React.ReactNode;
    title: string;
    body: string;
}) {
    return (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-background p-8 text-center text-muted">
            {icon}
            <p className="text-sm font-semibold text-text">{title}</p>
            <p className="text-xs">{body}</p>
        </div>
    );
}

function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getMsg(err: unknown): string {
    if (err instanceof Error) return err.message;
    return "Search failed.";
}
