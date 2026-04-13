"use client";

import { useState } from "react";
import { Workstation } from "@/types/workstation";
import { useWorkstations } from "@/hooks/useWorkstations";
import { useSOP } from "@/hooks/useSOP";
import { useSettings } from "@/hooks/useSettings";
import { formatNumber } from "@/lib/utils/number.utils";
import { formatDateTime } from "@/lib/utils/date.utils";
import Drawer from "@/components/ui/Drawer";
import KioskLink from "@/components/shared/KioskLink";
import SOPViewer from "@/components/shared/SOPViewer";
import { FileText, Pencil, Trash2 } from "lucide-react";

interface WorkstationDetailsDrawerProps {
    workstation: Workstation | null;
    onClose: () => void;
    onEdit: (workstation: Workstation) => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="px-4 py-3 flex flex-col gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</p>
            <div className="text-sm text-text">{children}</div>
        </div>
    );
}

export default function WorkstationDetailsDrawer({ workstation, onClose, onEdit }: WorkstationDetailsDrawerProps) {
    const { updateWorkstation, deleteWorkstation, isDeleting } = useWorkstations();
    const { settings } = useSettings();
    const [viewingSOP, setViewingSOP] = useState(false);
    const { sop } = useSOP(viewingSOP && workstation ? workstation.id : null);

    const handleToggleActive = () => {
        if (!workstation) return;
        updateWorkstation({ id: workstation.id, payload: { is_active: !workstation.is_active } });
    };

    const handleDelete = () => {
        if (!workstation) return;
        if (confirm("Delete this workstation? This action cannot be undone.")) {
            deleteWorkstation(workstation.id);
            onClose();
        }
    };

    return (
        <>
            <Drawer isOpen={!!workstation} onClose={onClose} title="Workstation Details">
                {!workstation ? null : (
                    <div className="flex flex-col gap-6">
                        <div className="border border-border flex flex-col divide-y divide-border">
                            <Field label="Name">{workstation.name}</Field>
                            <Field label="Description">
                                {workstation.description ? (
                                    <span className="whitespace-pre-wrap">{workstation.description}</span>
                                ) : "—"}
                            </Field>
                            <Field label="Type">
                                {workstation.is_general ? "General" : "Standard"}
                            </Field>
                            <Field label="Target Output">
                                {workstation.target_quantity && workstation.target_duration
                                    ? `${formatNumber(Number(workstation.target_quantity), settings)} ${workstation.uom || "units"} / ${workstation.target_duration}h`
                                    : "—"}
                            </Field>
                            <Field label="Unit of Measure">
                                {workstation.uom || <span className="text-muted text-xs">units (default)</span>}
                            </Field>
                            <Field label="Working Hours / Day">
                                {workstation.working_hours_per_day
                                    ? `${workstation.working_hours_per_day}h`
                                    : <span className="text-muted text-xs">Global ({workstation.effective_settings.working_hours_per_day}h)</span>}
                            </Field>
                            <Field label="Overtime Threshold">
                                {workstation.overtime_threshold
                                    ? `After ${workstation.overtime_threshold}h`
                                    : <span className="text-muted text-xs">Global ({workstation.effective_settings.overtime_threshold}h)</span>}
                            </Field>
                            <Field label="Overtime Multiplier">
                                {workstation.overtime_multiplier
                                    ? `×${workstation.overtime_multiplier}`
                                    : <span className="text-muted text-xs">Global (×{workstation.effective_settings.overtime_multiplier})</span>}
                            </Field>
                            <Field label="Week Starts On">
                                {workstation.week_starts_on
                                    ? workstation.week_starts_on
                                    : <span className="text-muted text-xs">Global ({workstation.effective_settings.week_starts_on})</span>}
                            </Field>
                            <Field label="Status">
                                <button
                                    onClick={handleToggleActive}
                                    className={`text-xs font-semibold uppercase tracking-widest px-3 py-1 border transition-colors ${workstation.is_active
                                        ? "border-success text-success hover:bg-success hover:text-background"
                                        : "border-error text-error hover:bg-error hover:text-background"
                                        }`}
                                >
                                    {workstation.is_active ? "Active" : "Inactive"}
                                </button>
                            </Field>
                            <Field label="Kiosk Link">
                                <KioskLink token={workstation.kiosk_token} />
                            </Field>
                            <Field label="Created">{formatDateTime(workstation.created_at, settings)}</Field>
                            <Field label="Last Updated">{formatDateTime(workstation.updated_at, settings)}</Field>
                        </div>

                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => setViewingSOP(true)}
                                className="flex items-center justify-center gap-2 px-4 py-3 border border-border text-xs font-semibold uppercase tracking-widest text-text hover:bg-surface transition-colors"
                            >
                                <FileText size={14} />
                                View SOP
                            </button>
                            <button
                                onClick={() => { onEdit(workstation); onClose(); }}
                                className="flex items-center justify-center gap-2 px-4 py-3 border border-border text-xs font-semibold uppercase tracking-widest text-text hover:bg-surface transition-colors"
                            >
                                <Pencil size={14} />
                                Edit Workstation
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="flex items-center justify-center gap-2 px-4 py-3 border border-error text-xs font-semibold uppercase tracking-widest text-error hover:bg-error hover:text-background transition-colors disabled:opacity-50"
                            >
                                <Trash2 size={14} />
                                Delete Workstation
                            </button>
                        </div>
                    </div>
                )}
            </Drawer>
            {viewingSOP && workstation && sop && (
                <SOPViewer
                    sop={sop}
                    workstationName={workstation.name}
                    onClose={() => setViewingSOP(false)}
                />
            )}
        </>
    );
}
