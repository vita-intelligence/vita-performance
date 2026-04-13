"use client";

import { useState } from "react";
import { Workstation } from "@/types/workstation";
import { useSettings } from "@/hooks/useSettings";
import { formatNumber } from "@/lib/utils/number.utils";
import WorkstationDetailsDrawer from "./WorkstationDetailsDrawer";

interface WorkstationTableProps {
    workstations: Workstation[];
    onEdit: (workstation: Workstation) => void;
}

export default function WorkstationTable({ workstations, onEdit }: WorkstationTableProps) {
    const { settings } = useSettings();
    const [detailsWorkstation, setDetailsWorkstation] = useState<Workstation | null>(null);

    return (
        <>
            <div className="hidden md:block border border-border overflow-hidden">
                <table className="w-full text-sm table-fixed">
                    <thead>
                        <tr className="border-b border-border bg-surface">
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted w-[25%]">Name</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted w-[35%]">Description</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted w-[25%]">Target Output</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted w-[15%]">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {workstations.map((workstation, index) => (
                            <tr
                                key={workstation.id}
                                onClick={() => setDetailsWorkstation(workstation)}
                                className={`border-b border-border hover:bg-surface transition-colors cursor-pointer ${index % 2 === 0 ? "bg-background" : "bg-surface/50"}`}
                            >
                                <td className="px-4 py-3 font-medium text-text truncate">{workstation.name}</td>
                                <td className="px-4 py-3 text-muted truncate">{workstation.description || "—"}</td>
                                <td className="px-4 py-3 text-text truncate">
                                    {workstation.target_quantity && workstation.target_duration
                                        ? `${formatNumber(Number(workstation.target_quantity), settings)} ${workstation.uom || "units"} / ${workstation.target_duration}h`
                                        : <span className="text-muted text-xs">—</span>
                                    }
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`text-xs font-semibold uppercase tracking-widest px-3 py-1 border whitespace-nowrap ${workstation.is_active
                                        ? "border-success text-success"
                                        : "border-error text-error"
                                        }`}>
                                        {workstation.is_active ? "Active" : "Inactive"}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <WorkstationDetailsDrawer
                workstation={detailsWorkstation}
                onClose={() => setDetailsWorkstation(null)}
                onEdit={onEdit}
            />
        </>
    );
}
