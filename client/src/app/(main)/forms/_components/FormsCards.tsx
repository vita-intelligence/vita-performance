"use client";

import { DynamicForm } from "@/types/dynamic-form";
import { useDynamicForms } from "@/hooks/useDynamicForms";

interface FormsCardsProps {
    forms: DynamicForm[];
    onEdit: (form: DynamicForm) => void;
    onBuild: (form: DynamicForm) => void;
}

const TRIGGER_LABELS = {
    start: { label: "Session Start", className: "border-success text-success" },
    end: { label: "Session End", className: "border-warning text-warning" },
    both: { label: "Both", className: "border-primary text-primary" },
};

export default function FormsCards({ forms, onEdit, onBuild }: FormsCardsProps) {
    const { deleteForm, isDeleting } = useDynamicForms();

    return (
        <div className="flex flex-col gap-4 md:hidden">
            {forms.map((form) => {
                const trigger = TRIGGER_LABELS[form.trigger];
                return (
                    <div key={form.id} className="border border-border bg-background p-4 flex flex-col gap-4">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex flex-col gap-1">
                                <p className="font-semibold text-text">{form.name}</p>
                                <p className="text-xs text-muted">
                                    {form.workstation_name || "All workstations"}
                                </p>
                            </div>
                            <span className={`text-xs font-semibold uppercase tracking-widest px-2 py-1 border shrink-0 ${trigger.className}`}>
                                {trigger.label}
                            </span>
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
                            <div className="flex flex-col gap-1">
                                <p className="text-xs font-semibold uppercase tracking-widest text-muted">Status</p>
                                <p className={`text-sm font-semibold ${form.is_active ? "text-success" : "text-error"}`}>
                                    {form.is_active ? "Active" : "Inactive"}
                                </p>
                            </div>
                            <div className="flex flex-col gap-1">
                                <p className="text-xs font-semibold uppercase tracking-widest text-muted">Questions</p>
                                <p className="text-sm text-text">
                                    {form.schema?.pages?.[0]?.elements?.length ?? 0} fields
                                </p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 border-t border-border pt-4">
                            <button
                                onClick={() => onBuild(form)}
                                className="flex-1 text-xs font-semibold uppercase tracking-widest text-muted hover:text-text transition-colors py-2 border border-border hover:border-text"
                            >
                                Build
                            </button>
                            <button
                                onClick={() => onEdit(form)}
                                className="flex-1 text-xs font-semibold uppercase tracking-widest text-muted hover:text-text transition-colors py-2 border border-border hover:border-text"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => deleteForm(form.id)}
                                disabled={isDeleting}
                                className="flex-1 text-xs font-semibold uppercase tracking-widest text-muted hover:text-error transition-colors py-2 border border-border hover:border-error disabled:opacity-50"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}