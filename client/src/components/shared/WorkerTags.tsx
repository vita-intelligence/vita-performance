"use client";

import { useState } from "react";
import { Worker } from "@/types/worker";

interface WorkerTagsProps {
    workers: Worker[];
    max?: number;
}

export default function WorkerTags({ workers, max = 2 }: WorkerTagsProps) {
    const [expanded, setExpanded] = useState(false);
    const visible = expanded ? workers : workers?.slice(0, max);
    const overflow = (workers?.length ?? 0) - max;

    return (
        <div className="flex items-center gap-1 flex-wrap">
            {visible?.map((w) => (
                <span key={w.id} className="px-2 py-1 text-xs border border-border whitespace-nowrap">
                    {w.full_name}
                </span>
            ))}
            {!expanded && overflow > 0 && (
                <button
                    onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
                    className="px-2 py-1 text-xs border border-border text-muted hover:text-text hover:border-text transition-colors"
                >
                    +{overflow} more
                </button>
            )}
            {expanded && overflow > 0 && (
                <button
                    onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
                    className="px-2 py-1 text-xs border border-border text-muted hover:text-text hover:border-text transition-colors"
                >
                    Less
                </button>
            )}
        </div>
    );
}