"use client";

import { useRouter } from "next/navigation";
import { Worker } from "@/types/worker";
import { useWorkers } from "@/hooks/useWorkers";
import { useSettings } from "@/hooks/useSettings";
import { formatCurrency } from "@/lib/utils/number.utils";
import { formatDateTime } from "@/lib/utils/date.utils";
import Drawer from "@/components/ui/Drawer";
import { BarChart3, Pencil, Trash2 } from "lucide-react";

interface WorkerDetailsDrawerProps {
    worker: Worker | null;
    onClose: () => void;
    onEdit: (worker: Worker) => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="px-4 py-3 flex flex-col gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</p>
            <div className="text-sm text-text">{children}</div>
        </div>
    );
}

export default function WorkerDetailsDrawer({ worker, onClose, onEdit }: WorkerDetailsDrawerProps) {
    const { updateWorker, deleteWorker, isDeletingWorker } = useWorkers();
    const { settings } = useSettings();
    const router = useRouter();

    const handleToggleActive = () => {
        if (!worker) return;
        updateWorker({ id: worker.id, payload: { is_active: !worker.is_active } });
    };

    const handleDelete = () => {
        if (!worker) return;
        if (confirm("Delete this worker? This action cannot be undone.")) {
            deleteWorker(worker.id);
            onClose();
        }
    };

    return (
        <Drawer isOpen={!!worker} onClose={onClose} title="Worker Details">
            {!worker ? null : (
                <div className="flex flex-col gap-6">
                    <div className="border border-border flex flex-col divide-y divide-border">
                        <Field label="Name">{worker.full_name}</Field>
                        <Field label="Group">{worker.group_name || "—"}</Field>
                        <Field label="Hourly Rate">
                            {formatCurrency(Number(worker.hourly_rate), settings)}/hr
                        </Field>
                        <Field label="PIN">
                            <span className={`text-xs font-semibold uppercase tracking-widest ${worker.has_pin ? "text-success" : "text-error"}`}>
                                {worker.has_pin ? "Set" : "No PIN"}
                            </span>
                        </Field>
                        <Field label="QC Inspector">
                            {worker.is_qa ? (
                                <span className="text-xs font-semibold uppercase tracking-widest text-accent">Yes</span>
                            ) : "No"}
                        </Field>
                        <Field label="Status">
                            <button
                                onClick={handleToggleActive}
                                className={`text-xs font-semibold uppercase tracking-widest px-3 py-1 border transition-colors ${worker.is_active
                                    ? "border-success text-success hover:bg-success hover:text-background"
                                    : "border-error text-error hover:bg-error hover:text-background"
                                    }`}
                            >
                                {worker.is_active ? "Active" : "Inactive"}
                            </button>
                        </Field>
                        <Field label="Created">{formatDateTime(worker.created_at, settings)}</Field>
                        <Field label="Last Updated">{formatDateTime(worker.updated_at, settings)}</Field>
                    </div>

                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => router.push(`/workers/${worker.id}`)}
                            className="flex items-center justify-center gap-2 px-4 py-3 border border-border text-xs font-semibold uppercase tracking-widest text-text hover:bg-surface transition-colors"
                        >
                            <BarChart3 size={14} />
                            View Stats
                        </button>
                        <button
                            onClick={() => { onEdit(worker); onClose(); }}
                            className="flex items-center justify-center gap-2 px-4 py-3 border border-border text-xs font-semibold uppercase tracking-widest text-text hover:bg-surface transition-colors"
                        >
                            <Pencil size={14} />
                            Edit Worker
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={isDeletingWorker}
                            className="flex items-center justify-center gap-2 px-4 py-3 border border-error text-xs font-semibold uppercase tracking-widest text-error hover:bg-error hover:text-background transition-colors disabled:opacity-50"
                        >
                            <Trash2 size={14} />
                            Delete Worker
                        </button>
                    </div>
                </div>
            )}
        </Drawer>
    );
}
