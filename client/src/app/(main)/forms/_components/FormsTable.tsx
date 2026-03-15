"use client";

import { DynamicForm } from "@/types/dynamic-form";
import { useDynamicForms } from "@/hooks/useDynamicForms";

interface FormsTableProps {
    forms: DynamicForm[];
    onEdit: (form: DynamicForm) => void;
    onBuild: (form: DynamicForm) => void;
}

const TRIGGER_LABELS = {
    start: { label: "Session Start", className: "border-success text-success" },
    end: { label: "Session End", className: "border-warning text-warning" },
    both: { label: "Both", className: "border-primary text-primary" },
};

export default function FormsTable({ forms, onEdit, onBuild }: FormsTableProps) {
    const { deleteForm, isDeleting } = useDynamicForms();

    return (
        <div className="hidden md:block border border-border overflow-hidden">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-border bg-surface">
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Name</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Trigger</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Workstation</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {forms.map((form, index) => {
                        const trigger = TRIGGER_LABELS[form.trigger];
                        return (
                            <tr
                                key={form.id}
                                className={`border-b border-border hover:bg-surface transition-colors ${index % 2 === 0 ? "bg-background" : "bg-surface/50"
                                    }`}
                            >
                                <td className="px-4 py-3 font-medium text-text">{form.name}</td>
                                <td className="px-4 py-3">
                                    <span className={`text-xs font-semibold uppercase tracking-widest px-2 py-1 border ${trigger.className}`}>
                                        {trigger.label}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-muted">
                                    {form.workstation_name || <span className="text-xs">All workstations</span>}
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`text-xs font-semibold uppercase tracking-widest ${form.is_active ? "text-success" : "text-error"
                                        }`}>
                                        {form.is_active ? "Active" : "Inactive"}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => onBuild(form)}
                                            className="text-xs font-semibold uppercase tracking-widest text-muted hover:text-text transition-colors"
                                        >
                                            Build
                                        </button>
                                        <button
                                            onClick={() => onEdit(form)}
                                            className="text-xs font-semibold uppercase tracking-widest text-muted hover:text-text transition-colors"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => deleteForm(form.id)}
                                            disabled={isDeleting}
                                            className="text-xs font-semibold uppercase tracking-widest text-muted hover:text-error transition-colors disabled:opacity-50"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}