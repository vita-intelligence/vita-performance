"use client";

import { RangeKey, RANGES } from "@/constants/filters.constants";

interface RangeSelectorProps {
    value: RangeKey;
    onChange: (range: RangeKey) => void;
}

export default function RangeSelector({ value, onChange }: RangeSelectorProps) {
    return (
        <div className="flex border border-border overflow-x-auto shrink-0">
            {RANGES.map((r) => (
                <button
                    key={r.key}
                    onClick={() => onChange(r.key)}
                    className={`flex-1 py-3 px-4 text-xs font-semibold uppercase tracking-widest whitespace-nowrap transition-colors ${value === r.key
                        ? "bg-text text-background"
                        : "bg-background text-muted hover:text-text"
                        }`}
                >
                    {r.label}
                </button>
            ))}
        </div>
    );
}