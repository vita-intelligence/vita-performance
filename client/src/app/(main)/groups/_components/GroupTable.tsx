"use client";

import { useState } from "react";
import { WorkerGroup } from "@/types/worker";
import GroupDetailsDrawer from "./GroupDetailsDrawer";

interface GroupTableProps {
    groups: WorkerGroup[];
    onEdit: (group: WorkerGroup) => void;
}

export default function GroupTable({ groups, onEdit }: GroupTableProps) {
    const [detailsGroup, setDetailsGroup] = useState<WorkerGroup | null>(null);

    return (
        <>
            <div className="hidden md:block border border-border overflow-hidden">
                <table className="w-full text-sm table-fixed">
                    <thead>
                        <tr className="border-b border-border bg-surface">
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted w-[30%]">Name</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted w-[55%]">Description</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted w-[15%]">Workers</th>
                        </tr>
                    </thead>
                    <tbody>
                        {groups.map((group, index) => (
                            <tr
                                key={group.id}
                                onClick={() => setDetailsGroup(group)}
                                className={`border-b border-border hover:bg-surface transition-colors cursor-pointer ${index % 2 === 0 ? "bg-background" : "bg-surface/50"}`}
                            >
                                <td className="px-4 py-3 font-medium text-text truncate">{group.name}</td>
                                <td className="px-4 py-3 text-muted truncate">{group.description || "—"}</td>
                                <td className="px-4 py-3 text-text">{group.workers_count}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <GroupDetailsDrawer
                group={detailsGroup}
                onClose={() => setDetailsGroup(null)}
                onEdit={onEdit}
            />
        </>
    );
}
