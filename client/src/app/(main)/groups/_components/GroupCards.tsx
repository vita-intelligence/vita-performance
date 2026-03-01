"use client";

import { WorkerGroup } from "@/types/worker";
import { useWorkers } from "@/hooks/useWorkers";

interface GroupCardsProps {
    groups: WorkerGroup[];
    onEdit: (group: WorkerGroup) => void;
}

export default function GroupCards({ groups, onEdit }: GroupCardsProps) {
    const { deleteGroup, isDeletingGroup } = useWorkers();

    return (
        <div className="flex flex-col gap-4 md:hidden">
            {groups.map((group) => (
                <div key={group.id} className="border border-border bg-background p-4 flex flex-col gap-4">

                    {/* Header */}
                    <div className="flex flex-col gap-1">
                        <p className="font-semibold text-text">{group.name}</p>
                        {group.description && (
                            <p className="text-xs text-muted">{group.description}</p>
                        )}
                    </div>

                    {/* Details */}
                    <div className="border-t border-border pt-4">
                        <div className="flex flex-col gap-1">
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Workers</p>
                            <p className="text-sm text-text">{group.workers_count}</p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 border-t border-border pt-4">
                        <button
                            onClick={() => onEdit(group)}
                            className="flex-1 text-xs font-semibold uppercase tracking-widest text-muted hover:text-text transition-colors py-2 border border-border hover:border-text"
                        >
                            Edit
                        </button>
                        <button
                            onClick={() => deleteGroup(group.id)}
                            disabled={isDeletingGroup}
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