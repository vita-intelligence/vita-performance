"use client";

import { Worker } from "@/types/worker";
import { useWorkers } from "@/hooks/useWorkers";
import { useSettings } from "@/hooks/useSettings";
import { formatCurrency } from "@/lib/utils/number.utils";
import { useRouter } from "next/navigation";

interface WorkerCardsProps {
    workers: Worker[];
    onEdit: (worker: Worker) => void;
}

export default function WorkerCards({ workers, onEdit }: WorkerCardsProps) {
    const { updateWorker, deleteWorker, isDeletingWorker } = useWorkers();
    const { settings } = useSettings();
    const router = useRouter();

    const handleToggleActive = async (worker: Worker) => {
        await updateWorker({ id: worker.id, payload: { is_active: !worker.is_active } });
    };

    return (
        <div className="flex flex-col gap-4 md:hidden">
            {workers.map((worker) => (
                <div key={worker.id} className="border border-border bg-background p-4 flex flex-col gap-4">

                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex flex-col gap-1">
                            <p className="font-semibold text-text">{worker.full_name}</p>
                            <p className="text-xs text-muted">{worker.group_name || "No Group"}</p>
                        </div>
                        <button
                            onClick={() => handleToggleActive(worker)}
                            className={`text-xs font-semibold uppercase tracking-widest px-3 py-1 border transition-colors shrink-0 ${worker.is_active
                                ? "border-success text-success hover:bg-success hover:text-background"
                                : "border-error text-error hover:bg-error hover:text-background"
                                }`}
                        >
                            {worker.is_active ? "Active" : "Inactive"}
                        </button>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
                        <div className="flex flex-col gap-1">
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Hourly Rate</p>
                            <p className="text-sm text-text">
                                {formatCurrency(Number(worker.hourly_rate), settings)}/hr
                            </p>
                        </div>
                        <div className="flex flex-col gap-1">
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Kiosk PIN</p>
                            <p className={`text-sm font-semibold ${worker.has_pin ? "text-success" : "text-error"}`}>
                                {worker.has_pin ? "Set" : "Not set"}
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 border-t border-border pt-4">
                        <button
                            onClick={() => router.push(`/workers/${worker.id}`)}
                            className="flex-1 text-xs font-semibold uppercase tracking-widest text-muted hover:text-text transition-colors py-2 border border-border hover:border-text"
                        >
                            Stats
                        </button>
                        <button
                            onClick={() => onEdit(worker)}
                            className="flex-1 text-xs font-semibold uppercase tracking-widest text-muted hover:text-text transition-colors py-2 border border-border hover:border-text"
                        >
                            Edit
                        </button>
                        <button
                            onClick={() => deleteWorker(worker.id)}
                            disabled={isDeletingWorker}
                            className="flex-1 text-xs font-semibold uppercase tracking-widest text-muted hover:text-error transition-colors py-2 border border-border hover:border-error disabled:opacity-50"
                        >
                            Delete
                        </button>
                    </div>

                </div>
            ))}
        </div>
    );
}