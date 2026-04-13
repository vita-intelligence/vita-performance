"use client";

import { DynamicForm } from "@/types/dynamic-form";
import { useDynamicForms } from "@/hooks/useDynamicForms";
import { useSettings } from "@/hooks/useSettings";
import { formatDateTime } from "@/lib/utils/date.utils";
import Drawer from "@/components/ui/Drawer";
import { Wrench, Pencil, Trash2 } from "lucide-react";

interface FormDetailsDrawerProps {
    form: DynamicForm | null;
    onClose: () => void;
    onEdit: (form: DynamicForm) => void;
    onBuild: (form: DynamicForm) => void;
}

const TRIGGER_LABELS = {
    start: { label: "Session Start", className: "border-success text-success" },
    end: { label: "Session End", className: "border-warning text-warning" },
    both: { label: "Both", className: "border-primary text-primary" },
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="px-4 py-3 flex flex-col gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</p>
            <div className="text-sm text-text">{children}</div>
        </div>
    );
}

export default function FormDetailsDrawer({ form, onClose, onEdit, onBuild }: FormDetailsDrawerProps) {
    const { deleteForm, isDeleting } = useDynamicForms();
    const { settings } = useSettings();

    const handleDelete = () => {
        if (!form) return;
        if (confirm("Delete this form? This action cannot be undone.")) {
            deleteForm(form.id);
            onClose();
        }
    };

    const trigger = form ? TRIGGER_LABELS[form.trigger] : null;

    return (
        <Drawer isOpen={!!form} onClose={onClose} title="Form Details">
            {!form || !trigger ? null : (
                <div className="flex flex-col gap-6">
                    <div className="border border-border flex flex-col divide-y divide-border">
                        <Field label="Name">{form.name}</Field>
                        <Field label="Trigger">
                            <span className={`text-xs font-semibold uppercase tracking-widest px-2 py-1 border ${trigger.className}`}>
                                {trigger.label}
                            </span>
                        </Field>
                        <Field label="Workstation">
                            {form.workstation_name || (
                                <span className="text-xs text-muted">All workstations</span>
                            )}
                        </Field>
                        <Field label="Status">
                            <span className={`text-xs font-semibold uppercase tracking-widest ${form.is_active ? "text-success" : "text-error"
                                }`}>
                                {form.is_active ? "Active" : "Inactive"}
                            </span>
                        </Field>
                        <Field label="Fields">{form.schema?.length ?? 0}</Field>
                        <Field label="Created">{formatDateTime(form.created_at, settings)}</Field>
                        <Field label="Last Updated">{formatDateTime(form.updated_at, settings)}</Field>
                    </div>

                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => { onBuild(form); onClose(); }}
                            className="flex items-center justify-center gap-2 px-4 py-3 border border-border text-xs font-semibold uppercase tracking-widest text-text hover:bg-surface transition-colors"
                        >
                            <Wrench size={14} />
                            Build Form
                        </button>
                        <button
                            onClick={() => { onEdit(form); onClose(); }}
                            className="flex items-center justify-center gap-2 px-4 py-3 border border-border text-xs font-semibold uppercase tracking-widest text-text hover:bg-surface transition-colors"
                        >
                            <Pencil size={14} />
                            Edit Form
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="flex items-center justify-center gap-2 px-4 py-3 border border-error text-xs font-semibold uppercase tracking-widest text-error hover:bg-error hover:text-background transition-colors disabled:opacity-50"
                        >
                            <Trash2 size={14} />
                            Delete Form
                        </button>
                    </div>
                </div>
            )}
        </Drawer>
    );
}
