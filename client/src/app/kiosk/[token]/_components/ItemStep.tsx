"use client";

import { useEffect, useState } from "react";
import { Button } from "@heroui/react";
import { PlugZap, Info, FileText } from "lucide-react";
import { KioskItem, KioskMO, KioskSelection } from "@/types/kiosk";
import { kioskService } from "@/services/kiosk.service";
import { useDebounce } from "@/hooks/useDebounce";
import OperationViewer from "./OperationViewer";

interface ItemStepProps {
    token: string;
    selected: KioskSelection | null;
    onSelect: (selection: KioskSelection | null) => void;
    onNext: () => void;
    onBack: () => void;
}

/**
 * Two behaviours depending on the workstation's PSP link:
 *
 *   * `psp_source_of_truth = true`   →  render only the MOs whose
 *     current routing step is on THIS workstation. No search — the
 *     list is already scoped. Operators can't clock into work that
 *     isn't dispatched to them.
 *
 *   * `psp_source_of_truth = false`  →  fall back to legacy free-text
 *     Item search (the pre-integration UX). Empty state prompts
 *     ops to wire the workstation up if that wasn't the intent.
 */
export default function ItemStep({ token, selected, onSelect, onNext, onBack }: ItemStepProps) {
    const [isLoadingMOs, setIsLoadingMOs] = useState(true);
    const [pspSourceOfTruth, setPspSourceOfTruth] = useState(false);
    const [mos, setMOs] = useState<KioskMO[]>([]);

    /** Which MO's operation description is currently being viewed
     *  in the modal. Null = no modal. */
    const [viewingOp, setViewingOp] = useState<KioskMO | null>(null);

    // Legacy fallback state.
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<KioskItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const debouncedQuery = useDebounce(query, 300);

    // Fire the scoped MO fetch on mount. The response's flag tells us
    // whether to show the MO picker or defer to the legacy search.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await kioskService.listMOs(token);
                if (cancelled) return;
                setPspSourceOfTruth(res.psp_source_of_truth);
                setMOs(res.items);
            } catch {
                if (cancelled) return;
                setPspSourceOfTruth(false);
                setMOs([]);
            } finally {
                if (!cancelled) setIsLoadingMOs(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [token]);

    // Legacy search — only used when the workstation isn't PSP-linked.
    useEffect(() => {
        if (pspSourceOfTruth) return;
        if (!debouncedQuery.trim()) {
            setResults([]);
            return;
        }
        (async () => {
            setIsSearching(true);
            try {
                const items = await kioskService.searchItems(token, debouncedQuery);
                setResults(items);
            } catch {
                setResults([]);
            } finally {
                setIsSearching(false);
            }
        })();
    }, [debouncedQuery, token, pspSourceOfTruth]);

    return (
        <div className="flex flex-col h-full min-h-0 px-4 py-6 gap-4">
            <div className="flex flex-col gap-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                    {pspSourceOfTruth ? "Pick a manufacturing order" : "Select Item"}
                </p>
                <p className="text-sm text-muted">
                    {pspSourceOfTruth
                        ? "Only MOs currently routed to this workstation are shown."
                        : "What are you producing this session?"}
                </p>
            </div>

            {selected && (
                <div className="flex items-center justify-between px-4 py-3 border border-success bg-success/10">
                    <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-base sm:text-lg font-black text-success uppercase truncate">
                            {selected.kind === "item"
                                ? selected.item.name
                                : selected.mo.item_name ?? selected.mo.step_name ?? "MO"}
                        </span>
                        {selected.kind === "mo" && (
                            <span className="text-[10px] uppercase tracking-widest text-success/80 font-semibold">
                                {selected.mo.step_name ?? "step"} · qty {selected.mo.quantity ?? "—"}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={() => onSelect(null)}
                        className="text-xs text-muted hover:text-error transition-colors uppercase tracking-widest font-semibold shrink-0 pl-3"
                    >
                        Clear
                    </button>
                </div>
            )}

            {/* PSP branch — scoped MO list */}
            {pspSourceOfTruth ? (
                <div className="flex flex-col gap-2 overflow-y-auto flex-1 min-h-0">
                    {isLoadingMOs && (
                        <p className="text-xs text-muted uppercase tracking-widest">Loading MOs…</p>
                    )}
                    {!isLoadingMOs && mos.length === 0 && (
                        <div className="flex items-start gap-3 border border-border bg-surface p-4">
                            <Info className="size-4 text-muted mt-0.5 shrink-0" />
                            <div className="flex flex-col gap-1">
                                <p className="text-sm font-semibold text-text">
                                    Nothing routed to this workstation right now.
                                </p>
                                <p className="text-xs text-muted">
                                    Ask a supervisor to route an MO step here on PSP,
                                    or pick a non-MO activity from the previous
                                    screen.
                                </p>
                            </div>
                        </div>
                    )}
                    {mos.map((mo) => {
                        const hasOp = Boolean(mo.step_name?.trim());
                        // Group name is short + operator-recognisable
                        // ("Weighing", "Bottling"). Falls back to the
                        // op description's first line when missing so
                        // the badge is never blank.
                        const groupLabel =
                            mo.workstation_group_name ??
                            mo.step_name?.split(/[.\n]/)[0].slice(0, 40) ??
                            "step";
                        return (
                            <div
                                key={`${mo.mo_uuid}:${mo.step_uuid}`}
                                onClick={() => onSelect({ kind: "mo", mo })}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        onSelect({ kind: "mo", mo });
                                    }
                                }}
                                className="text-left w-full border border-border bg-background hover:border-text hover:bg-surface transition-colors px-4 py-3 flex flex-col gap-2 cursor-pointer"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <span className="min-w-0 break-words font-black text-text uppercase text-base leading-tight">
                                        {mo.item_name ?? "Untitled item"}
                                    </span>
                                    <span className="text-[10px] uppercase tracking-widest text-muted whitespace-nowrap shrink-0">
                                        qty {mo.quantity ?? "—"}
                                    </span>
                                </div>
                                {/* Two-row layout on narrow screens
                                    keeps the Operation button on its
                                    own line so it's always thumb-
                                    reachable, not pushed off-screen
                                    by the other badges. */}
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
                                    <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-widest text-muted">
                                        <span className="inline-flex items-center gap-1 border border-border px-2 py-0.5">
                                            <PlugZap className="size-3" />
                                            {groupLabel}
                                        </span>
                                        {mo.mo_status && (
                                            <span className="border border-border px-2 py-0.5">
                                                MO {mo.mo_status}
                                            </span>
                                        )}
                                        {mo.due_date && (
                                            <span className="border border-border px-2 py-0.5">
                                                due {mo.due_date}
                                            </span>
                                        )}
                                    </div>
                                    {hasOp && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                // Don't fall through
                                                // to the card select.
                                                e.stopPropagation();
                                                setViewingOp(mo);
                                            }}
                                            className="inline-flex items-center justify-center gap-1 h-8 px-3 border border-border text-[10px] uppercase tracking-widest text-muted hover:border-text hover:text-text transition-colors sm:ml-auto sm:h-auto sm:px-2 sm:py-0.5"
                                        >
                                            <FileText className="size-3" />
                                            Operation
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {viewingOp && (
                        <OperationViewer
                            heading={
                                (viewingOp.item_name ?? "Item") +
                                " · " +
                                (viewingOp.workstation_group_name ?? "step")
                            }
                            body={viewingOp.step_name ?? ""}
                            onClose={() => setViewingOp(null)}
                        />
                    )}
                </div>
            ) : (
                <>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search items..."
                        className="w-full px-4 py-3 text-base bg-surface border border-border focus:border-text outline-none text-text placeholder:text-muted"
                    />

                    {isSearching && (
                        <p className="text-xs text-muted uppercase tracking-widest">Searching...</p>
                    )}
                    <div className="flex flex-col gap-2 overflow-y-auto flex-1 min-h-0">
                        {results.map((item) => (
                            <Button
                                key={item.id}
                                onPress={() => {
                                    onSelect({ kind: "item", item });
                                    setQuery("");
                                    setResults([]);
                                }}
                                variant="bordered"
                                className="w-full justify-start px-4 h-12 sm:h-14 text-base font-black uppercase tracking-wide rounded-none border-border text-text hover:border-text hover:bg-surface shrink-0"
                            >
                                {item.name}
                            </Button>
                        ))}
                    </div>
                </>
            )}

            <div className="shrink-0 flex flex-col gap-2">
                <Button
                    onPress={onNext}
                    isDisabled={pspSourceOfTruth && !selected}
                    className="w-full h-12 sm:h-14 bg-text text-background text-sm font-black uppercase tracking-widest hover:opacity-80 rounded-none disabled:opacity-40"
                >
                    {selected ? "Continue" : pspSourceOfTruth ? "Pick an MO to continue" : "Skip"}
                </Button>
                <Button
                    onPress={onBack}
                    variant="bordered"
                    className="w-full h-10 sm:h-12 rounded-none border-border text-muted text-xs font-semibold uppercase tracking-widest hover:border-text hover:text-text"
                >
                    Back
                </Button>
            </div>
        </div>
    );
}
