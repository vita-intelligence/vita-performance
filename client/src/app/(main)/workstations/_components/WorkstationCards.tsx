"use client";

import { Workstation } from "@/types/workstation";
import { useWorkstations } from "@/hooks/useWorkstations";

interface WorkstationCardsProps {
    workstations: Workstation[];
    onEdit: (workstation: Workstation) => void;
}

export default function WorkstationCards({ workstations, onEdit }: WorkstationCardsProps) {
    const { updateWorkstation, deleteWorkstation, isDeleting } = useWorkstations();

    const handleToggleActive = async (workstation: Workstation) => {
        await updateWorkstation({ id: workstation.id, payload: { is_active: !workstation.is_active } });
    };

    return (
        <div className="flex flex-col gap-4 md:hidden">
            {workstations.map((workstation) => (
                <div key={workstation.id} className="border border-border bg-background p-4 flex flex-col gap-4">

                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex flex-col gap-1">
                            <p className="font-semibold text-text">{workstation.name}</p>
                            {workstation.description && (
                                <p className="text-xs text-muted">{workstation.description}</p>
                            )}
                        </div>
                        <button
                            onClick={() => handleToggleActive(workstation)}
                            className={`text-xs font-semibold uppercase tracking-widest px-3 py-1 border transition-colors shrink-0 ${workstation.is_active
                                    ? "border-success text-success hover:bg-success hover:text-background"
                                    : "border-error text-error hover:bg-error hover:text-background"
                                }`}
                        >
                            {workstation.is_active ? "Active" : "Inactive"}
                        </button>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
                        <div className="flex flex-col gap-1">
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Hours/Day</p>
                            <p className="text-sm text-text">
                                {workstation.working_hours_per_day
                                    ? `${workstation.working_hours_per_day}h`
                                    : <span className="text-muted text-xs">Global</span>
                                }
                            </p>
                        </div>
                        <div className="flex flex-col gap-1">
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Overtime</p>
                            <p className="text-sm text-text">
                                {workstation.overtime_threshold
                                    ? `After ${workstation.overtime_threshold}h (×${workstation.overtime_multiplier})`
                                    : <span className="text-muted text-xs">Global</span>
                                }
                            </p>
                        </div>
                        <div className="flex flex-col gap-1">
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Week Starts</p>
                            <p className="text-sm text-text capitalize">
                                {workstation.week_starts_on || <span className="text-muted text-xs">Global</span>}
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 border-t border-border pt-4">
                        <button
                            onClick={() => onEdit(workstation)}
                            className="flex-1 text-xs font-semibold uppercase tracking-widest text-muted hover:text-text transition-colors py-2 border border-border hover:border-text"
                        >
                            Edit
                        </button>
                        <button
                            onClick={() => deleteWorkstation(workstation.id)}
                            disabled={isDeleting}
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