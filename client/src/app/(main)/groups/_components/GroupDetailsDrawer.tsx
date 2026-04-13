"use client";

import { WorkerGroup } from "@/types/worker";
import { useWorkers } from "@/hooks/useWorkers";
import { useSettings } from "@/hooks/useSettings";
import { formatDateTime } from "@/lib/utils/date.utils";
import Drawer from "@/components/ui/Drawer";
import { Pencil, Trash2 } from "lucide-react";

interface GroupDetailsDrawerProps {
    group: WorkerGroup | null;
    onClose: () => void;
    onEdit: (group: WorkerGroup) => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="px-4 py-3 flex flex-col gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</p>
            <div className="text-sm text-text">{children}</div>
        </div>
    );
}

export default function GroupDetailsDrawer({ group, onClose, onEdit }: GroupDetailsDrawerProps) {
    const { deleteGroup, isDeletingGroup } = useWorkers();
    const { settings } = useSettings();

    const handleDelete = () => {
        if (!group) return;
        if (confirm("Delete this group? This action cannot be undone.")) {
            deleteGroup(group.id);
            onClose();
        }
    };

    return (
        <Drawer isOpen={!!group} onClose={onClose} title="Group Details">
            {!group ? null : (
                <div className="flex flex-col gap-6">
                    <div className="border border-border flex flex-col divide-y divide-border">
                        <Field label="Name">{group.name}</Field>
                        <Field label="Description">
                            {group.description ? (
                                <span className="whitespace-pre-wrap">{group.description}</span>
                            ) : "—"}
                        </Field>
                        <Field label="Workers">{group.workers_count}</Field>
                        <Field label="Created">{formatDateTime(group.created_at, settings)}</Field>
                        <Field label="Last Updated">{formatDateTime(group.updated_at, settings)}</Field>
                    </div>

                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => { onEdit(group); onClose(); }}
                            className="flex items-center justify-center gap-2 px-4 py-3 border border-border text-xs font-semibold uppercase tracking-widest text-text hover:bg-surface transition-colors"
                        >
                            <Pencil size={14} />
                            Edit Group
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={isDeletingGroup}
                            className="flex items-center justify-center gap-2 px-4 py-3 border border-error text-xs font-semibold uppercase tracking-widest text-error hover:bg-error hover:text-background transition-colors disabled:opacity-50"
                        >
                            <Trash2 size={14} />
                            Delete Group
                        </button>
                    </div>
                </div>
            )}
        </Drawer>
    );
}
