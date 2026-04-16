"use client";

import { WorkstationItemBreakdown } from "@/types/workstation";
import { useSettings } from "@/hooks/useSettings";
import { formatNumber } from "@/lib/utils/number.utils";

interface WorkstationItemsBreakdownProps {
    items: WorkstationItemBreakdown[];
}

export default function WorkstationItemsBreakdown({ items }: WorkstationItemsBreakdownProps) {
    const { settings } = useSettings();

    const maxQuantity = items.length > 0
        ? Math.max(...items.map((i) => i.total_quantity))
        : 0;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted whitespace-nowrap">
                    Items Produced
                </h2>
                <div className="h-px bg-border flex-1" />
            </div>

            {!items.length ? (
                <div className="flex items-center justify-center py-12 border border-dashed border-border">
                    <p className="text-muted text-xs uppercase tracking-widest">No item data</p>
                </div>
            ) : (
                <div className="border border-border divide-y divide-border">
                    {items.map((item) => (
                        <div key={item.id ?? "none"} className="px-4 py-3 flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-text truncate">{item.name}</p>
                                    <p className="text-xs text-muted">
                                        {item.sessions_count} sessions
                                        {item.avg_performance !== null && (
                                            <span className={`ml-2 font-semibold ${item.avg_performance >= 100
                                                ? "text-success"
                                                : item.avg_performance >= 75
                                                    ? "text-secondary"
                                                    : "text-error"
                                                }`}>
                                                {item.avg_performance}% avg
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <span className="text-sm font-black text-text shrink-0">
                                    {formatNumber(item.total_quantity, settings)}
                                </span>
                            </div>
                            {maxQuantity > 0 && (
                                <div className="w-full bg-surface h-1.5">
                                    <div
                                        className="bg-text h-1.5 transition-all duration-500"
                                        style={{ width: `${(item.total_quantity / maxQuantity) * 100}%` }}
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
