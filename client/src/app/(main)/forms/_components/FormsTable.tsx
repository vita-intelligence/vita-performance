"use client";

import { useState } from "react";
import { DynamicForm } from "@/types/dynamic-form";
import FormDetailsDrawer from "./FormDetailsDrawer";

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
    const [detailsForm, setDetailsForm] = useState<DynamicForm | null>(null);

    return (
        <>
            <div className="hidden md:block border border-border overflow-hidden">
                <table className="w-full text-sm table-fixed">
                    <thead>
                        <tr className="border-b border-border bg-surface">
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted w-[35%]">Name</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted w-[20%]">Trigger</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted w-[30%]">Workstation</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted w-[15%]">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {forms.map((form, index) => {
                            const trigger = TRIGGER_LABELS[form.trigger];
                            return (
                                <tr
                                    key={form.id}
                                    onClick={() => setDetailsForm(form)}
                                    className={`border-b border-border hover:bg-surface transition-colors cursor-pointer ${index % 2 === 0 ? "bg-background" : "bg-surface/50"
                                        }`}
                                >
                                    <td className="px-4 py-3 font-medium text-text truncate">{form.name}</td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs font-semibold uppercase tracking-widest px-2 py-1 border whitespace-nowrap ${trigger.className}`}>
                                            {trigger.label}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-muted truncate">
                                        {form.workstation_name || <span className="text-xs">All workstations</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs font-semibold uppercase tracking-widest ${form.is_active ? "text-success" : "text-error"
                                            }`}>
                                            {form.is_active ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <FormDetailsDrawer
                form={detailsForm}
                onClose={() => setDetailsForm(null)}
                onEdit={onEdit}
                onBuild={onBuild}
            />
        </>
    );
}
