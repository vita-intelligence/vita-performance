"use client";

import { useState } from "react";
import { Worker } from "@/types/worker";
import { useSettings } from "@/hooks/useSettings";
import { formatCurrency } from "@/lib/utils/number.utils";
import WorkerDetailsDrawer from "./WorkerDetailsDrawer";

interface WorkerTableProps {
    workers: Worker[];
    onEdit: (worker: Worker) => void;
}

export default function WorkerTable({ workers, onEdit }: WorkerTableProps) {
    const { settings } = useSettings();
    const [detailsWorker, setDetailsWorker] = useState<Worker | null>(null);

    return (
        <>
            <div className="hidden md:block border border-border overflow-hidden">
                <table className="w-full text-sm table-fixed">
                    <thead>
                        <tr className="border-b border-border bg-surface">
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted w-[35%]">Name</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted w-[30%]">Group</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted w-[20%]">Hourly Rate</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted w-[15%]">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {workers.map((worker, index) => (
                            <tr
                                key={worker.id}
                                onClick={() => setDetailsWorker(worker)}
                                className={`border-b border-border hover:bg-surface transition-colors cursor-pointer ${index % 2 === 0 ? "bg-background" : "bg-surface/50"}`}
                            >
                                <td className="px-4 py-3 font-medium text-text truncate">{worker.full_name}</td>
                                <td className="px-4 py-3 text-muted truncate">{worker.group_name || "—"}</td>
                                <td className="px-4 py-3 text-text truncate">
                                    {formatCurrency(Number(worker.hourly_rate), settings)}/hr
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`text-xs font-semibold uppercase tracking-widest px-3 py-1 border whitespace-nowrap ${worker.is_active
                                        ? "border-success text-success"
                                        : "border-error text-error"
                                        }`}>
                                        {worker.is_active ? "Active" : "Inactive"}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <WorkerDetailsDrawer
                worker={detailsWorker}
                onClose={() => setDetailsWorker(null)}
                onEdit={onEdit}
            />
        </>
    );
}
