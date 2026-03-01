"use client";

import { WorkerGroup } from "@/types/worker";
import { useWorkers } from "@/hooks/useWorkers";

interface GroupTableProps {
    groups: WorkerGroup[];
    onEdit: (group: WorkerGroup) => void;
}

export default function GroupTable({ groups, onEdit }: GroupTableProps) {
    const { deleteGroup, isDeletingGroup } = useWorkers();

    return (
        <div className="hidden md:block border border-border overflow-hidden">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-border bg-surface">
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Name</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Description</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Workers</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {groups.map((group, index) => (
                        <tr
                            key={group.id}
                            className={`border-b border-border hover:bg-surface transition-colors ${index % 2 === 0 ? "bg-background" : "bg-surface/50"}`}
                        >
                            <td className="px-4 py-3 font-medium text-text">{group.name}</td>
                            <td className="px-4 py-3 text-muted">{group.description || "—"}</td>
                            <td className="px-4 py-3 text-text">{group.workers_count}</td>
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => onEdit(group)}
                                        className="text-xs font-semibold uppercase tracking-widest text-muted hover:text-text transition-colors"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => deleteGroup(group.id)}
                                        disabled={isDeletingGroup}
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