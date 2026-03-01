"use client";

import { Worker } from "@/types/worker";
import { useWorkers } from "@/hooks/useWorkers";
import { useSettings } from "@/hooks/useSettings";
import { formatCurrency } from "@/lib/utils/number.utils";

interface WorkerTableProps {
    workers: Worker[];
    onEdit: (worker: Worker) => void;
}

export default function WorkerTable({ workers, onEdit }: WorkerTableProps) {
    const { updateWorker, deleteWorker, isDeletingWorker } = useWorkers();
    const { settings } = useSettings();

    const handleToggleActive = async (worker: Worker) => {
        await updateWorker({ id: worker.id, payload: { is_active: !worker.is_active } });
    };

    return (
        <div className="hidden md:block border border-border overflow-hidden">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-border bg-surface">
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Name</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Group</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Hourly Rate</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {workers.map((worker, index) => (
                        <tr
                            key={worker.id}
                            className={`border-b border-border hover:bg-surface transition-colors ${index % 2 === 0 ? "bg-background" : "bg-surface/50"}`}
                        >
                            <td className="px-4 py-3 font-medium text-text">{worker.full_name}</td>
                            <td className="px-4 py-3 text-muted">{worker.group_name || "—"}</td>
                            <td className="px-4 py-3 text-text">
                                {formatCurrency(Number(worker.hourly_rate), settings)}/hr
                            </td>
                            <td className="px-4 py-3">
                                <button
                                    onClick={() => handleToggleActive(worker)}
                                    className={`text-xs font-semibold uppercase tracking-widest px-3 py-1 border transition-colors ${worker.is_active
                                        ? "border-success text-success hover:bg-success hover:text-background"
                                        : "border-error text-error hover:bg-error hover:text-background"
                                        }`}
                                >
                                    {worker.is_active ? "Active" : "Inactive"}
                                </button>
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => onEdit(worker)}
                                        className="text-xs font-semibold uppercase tracking-widest text-muted hover:text-text transition-colors"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => deleteWorker(worker.id)}
                                        disabled={isDeletingWorker}
                                        className="text-xs font-semibold uppercase tracking-widest text-muted hover:text-error transition-colors disabled:opacity-50"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}