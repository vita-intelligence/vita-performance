"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { KioskItem } from "@/types/kiosk";
import { kioskService } from "@/services/kiosk.service";
import { useDebounce } from "@/hooks/useDebounce";
import { useEffect } from "react";

interface ItemStepProps {
    token: string;
    selected: KioskItem | null;
    onSelect: (item: KioskItem | null) => void;
    onNext: () => void;
    onBack: () => void;
}

export default function ItemStep({ token, selected, onSelect, onNext, onBack }: ItemStepProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<KioskItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const debouncedQuery = useDebounce(query, 300);

    useEffect(() => {
        if (!debouncedQuery.trim()) {
            setResults([]);
            return;
        }
        const search = async () => {
            setIsSearching(true);
            try {
                const items = await kioskService.searchItems(token, debouncedQuery);
                setResults(items);
            } catch {
                setResults([]);
            } finally {
                setIsSearching(false);
            }
        };
        search();
    }, [debouncedQuery, token]);

    return (
        <div className="flex flex-col h-full min-h-0 px-4 py-6 gap-4">
            <div className="flex flex-col gap-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted">Select Item</p>
                <p className="text-sm text-muted">What are you producing this session?</p>
            </div>

            {selected && (
                <div className="flex items-center justify-between px-4 py-3 border border-success bg-success/10">
                    <span className="text-base sm:text-lg font-black text-success uppercase">{selected.name}</span>
                    <button
                        onClick={() => onSelect(null)}
                        className="text-xs text-muted hover:text-error transition-colors uppercase tracking-widest font-semibold"
                    >
                        Clear
                    </button>
                </div>
            )}

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
                        onPress={() => { onSelect(item); setQuery(""); setResults([]); }}
                        variant="bordered"
                        className="w-full justify-start px-4 h-12 sm:h-14 text-base font-black uppercase tracking-wide rounded-none border-border text-text hover:border-text hover:bg-surface shrink-0"
                    >
                        {item.name}
                    </Button>
                ))}
            </div>

            <div className="shrink-0 flex flex-col gap-2">
                <Button
                    onPress={onNext}
                    className="w-full h-12 sm:h-14 bg-text text-background text-sm font-black uppercase tracking-widest hover:opacity-80 rounded-none"
                >
                    {selected ? "Continue" : "Skip"}
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