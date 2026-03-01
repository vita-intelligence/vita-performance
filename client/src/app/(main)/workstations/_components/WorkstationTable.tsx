"use client";

import { Workstation } from "@/types/workstation";
import { useWorkstations } from "@/hooks/useWorkstations";

interface WorkstationTableProps {
    workstations: Workstation[];
    onEdit: (workstation: Workstation) => void;
}

export default function WorkstationTable({ workstations, onEdit }: WorkstationTableProps) {
    const { updateWorkstation, deleteWorkstation, isDeleting } = useWorkstations();

    const handleToggleActive = async (workstation: Workstation) => {
        await updateWorkstation({ id: workstation.id, payload: { is_active: !workstation.is_active } });
    };

    return (
        <div className="hidden md:block border border-border overflow-hidden">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-border bg-surface">
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Name</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Description</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Hours/Day</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Overtime</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {workstations.map((workstation, index) => (
                        <tr
                            key={workstation.id}
                            className={`border-b border-border hover:bg-surface transition-colors ${index % 2 === 0 ? "bg-background" : "bg-surface/50"}`}
                        >
                            <td className="px-4 py-3 font-medium text-text">{workstation.name}</td>
                            <td className="px-4 py-3 text-muted">{workstation.description || "—"}</td>
                            <td className="px-4 py-3 text-text">
                                {workstation.working_hours_per_day
                                    ? `${workstation.working_hours_per_day}h`
                                    : <span className="text-muted text-xs">Global</span>
                                }
                            </td>
                            <td className="px-4 py-3 text-text">
                                {workstation.overtime_threshold
                                    ? `After ${workstation.overtime_threshold}h (×${workstation.overtime_multiplier})`
                                    : <span className="text-muted text-xs">Global</span>
                                }
                            </td>
                            <td className="px-4 py-3">
                                <button
                                    onClick={() => handleToggleActive(workstation)}
                                    className={`text-xs font-semibold uppercase tracking-widest px-3 py-1 border transition-colors ${workstation.is_active
                                            ? "border-success text-success hover:bg-success hover:text-background"
                                            : "border-error text-error hover:bg-error hover:text-background"
                                        }`}
                                >
                                    {workstation.is_active ? "Active" : "Inactive"}
                                </button>
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => onEdit(workstation)}
                                        className="text-xs font-semibold uppercase tracking-widest text-muted hover:text-text transition-colors"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => deleteWorkstation(workstation.id)}
                                        disabled={isDeleting}
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