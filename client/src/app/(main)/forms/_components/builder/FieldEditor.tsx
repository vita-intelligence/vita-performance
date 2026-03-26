"use client";

import { useState } from "react";
import { FormField, FieldOption, DynamicForm } from "@/types/dynamic-form";
import { Switch } from "@heroui/react";
import { Trash2, GripVertical, Plus, X } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface FieldEditorProps {
    field: FormField;
    allFields: FormField[];
    onChange: (updated: FormField) => void;
    onDelete: () => void;
}

export default function FieldEditor({ field, allFields, onChange, onDelete }: FieldEditorProps) {
    const [expanded, setExpanded] = useState(true);

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: field.id,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const updateField = (updates: Partial<FormField>) => {
        onChange({ ...field, ...updates });
    };

    const addOption = () => {
        const options = field.options || [];
        const newOption = field.type === "task_select"
            ? { id: crypto.randomUUID(), label: "", target_quantity: undefined, target_duration: undefined }
            : { id: crypto.randomUUID(), label: "" };
        onChange({
            ...field,
            options: [...options, newOption],
        });
    };

    const updateOption = (id: string, updates: Partial<FieldOption>) => {
        onChange({
            ...field,
            options: (field.options || []).map((o) => o.id === id ? { ...o, ...updates } : o),
        });
    };

    const removeOption = (id: string) => {
        onChange({
            ...field,
            options: (field.options || []).filter((o) => o.id !== id),
        });
    };

    const conditionFields = allFields.filter((f) =>
        f.id !== field.id && ["yes_no", "dropdown", "checkbox"].includes(f.type)
    );

    return (
        <div ref={setNodeRef} style={style} className="border border-border bg-background">
            {/* Field header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <button {...attributes} {...listeners} className="text-muted hover:text-text cursor-grab active:cursor-grabbing">
                    <GripVertical size={16} />
                </button>
                <button
                    onClick={() => setExpanded((e) => !e)}
                    className="flex-1 text-left text-sm font-semibold text-text truncate"
                >
                    {field.label || `Untitled ${field.type} field`}
                </button>
                <span className="text-xs font-semibold uppercase tracking-widest text-muted px-2 py-0.5 border border-border shrink-0">
                    {field.type.replace("_", " ")}
                </span>
                <button onClick={onDelete} className="text-muted hover:text-error transition-colors shrink-0">
                    <Trash2 size={14} />
                </button>
            </div>

            {/* Field config */}
            {expanded && (
                <div className="p-4 flex flex-col gap-4">
                    {/* Label */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold uppercase tracking-widest text-muted">Label</label>
                        <input
                            type="text"
                            value={field.label}
                            onChange={(e) => updateField({ label: e.target.value })}
                            placeholder="Enter field label..."
                            className="border border-border bg-background text-text px-3 py-2 text-sm outline-none focus:border-text transition-colors"
                        />
                    </div>

                    {/* Placeholder — text and number only */}
                    {(field.type === "text" || field.type === "number") && (
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold uppercase tracking-widest text-muted">Placeholder</label>
                            <input
                                type="text"
                                value={field.placeholder || ""}
                                onChange={(e) => updateField({ placeholder: e.target.value })}
                                placeholder="Optional placeholder..."
                                className="border border-border bg-background text-text px-3 py-2 text-sm outline-none focus:border-text transition-colors"
                            />
                        </div>
                    )}

                    {/* Max rating */}
                    {field.type === "rating" && (
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold uppercase tracking-widest text-muted">Max Rating</label>
                            <select
                                value={field.max_rating || 5}
                                onChange={(e) => updateField({ max_rating: Number(e.target.value) })}
                                className="border border-border bg-background text-text px-3 py-2 text-sm outline-none focus:border-text transition-colors"
                            >
                                {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                                    <option key={n} value={n}>{n} stars</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Options — checkbox and dropdown */}
                    {(field.type === "checkbox" || field.type === "dropdown") && (
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold uppercase tracking-widest text-muted">Options</label>
                            {(field.options || []).map((option) => (
                                <div key={option.id} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={option.label}
                                        onChange={(e) => updateOption(option.id, { label: e.target.value })}
                                        placeholder="Option label..."
                                        className="flex-1 border border-border bg-background text-text px-3 py-2 text-sm outline-none focus:border-text transition-colors"
                                    />
                                    <button
                                        onClick={() => removeOption(option.id)}
                                        className="text-muted hover:text-error transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={addOption}
                                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted hover:text-text transition-colors py-2"
                            >
                                <Plus size={12} />
                                Add Option
                            </button>
                        </div>
                    )}

                    {/* Task select options — with target quantity and duration */}
                    {field.type === "task_select" && (
                        <div className="flex flex-col gap-3">
                            <label className="text-xs font-semibold uppercase tracking-widest text-muted">Tasks</label>
                            <p className="text-xs text-muted">Each task overrides the workstation output targets for performance calculation.</p>
                            {(field.options || []).map((option) => (
                                <div key={option.id} className="flex flex-col gap-2 p-3 border border-border">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={option.label}
                                            onChange={(e) => updateOption(option.id, { label: e.target.value })}
                                            placeholder="Task name (e.g. V-Blender Room)..."
                                            className="flex-1 border border-border bg-background text-text px-3 py-2 text-sm outline-none focus:border-text transition-colors"
                                        />
                                        <button
                                            onClick={() => removeOption(option.id)}
                                            className="text-muted hover:text-error transition-colors shrink-0"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            value={option.target_quantity ?? ""}
                                            onChange={(e) => updateOption(option.id, { target_quantity: e.target.value ? Number(e.target.value) : undefined })}
                                            placeholder="Target qty"
                                            className="flex-1 border border-border bg-background text-text px-3 py-2 text-sm outline-none focus:border-text transition-colors"
                                        />
                                        <input
                                            type="number"
                                            value={option.target_duration ?? ""}
                                            onChange={(e) => updateOption(option.id, { target_duration: e.target.value ? Number(e.target.value) : undefined })}
                                            placeholder="Target hours"
                                            className="flex-1 border border-border bg-background text-text px-3 py-2 text-sm outline-none focus:border-text transition-colors"
                                        />
                                    </div>
                                </div>
                            ))}
                            <button
                                onClick={addOption}
                                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted hover:text-text transition-colors py-2"
                            >
                                <Plus size={12} />
                                Add Task
                            </button>
                        </div>
                    )}

                    {/* Required toggle */}
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-0.5">
                            <p className="text-sm font-semibold text-text">Required</p>
                            <p className="text-xs text-muted">Worker must answer this field.</p>
                        </div>
                        <Switch
                            isSelected={field.required}
                            onValueChange={(val) => updateField({ required: val })}
                        />
                    </div>

                    {/* Condition */}
                    {conditionFields.length > 0 && (
                        <div className="flex flex-col gap-2 border-t border-border pt-4">
                            <label className="text-xs font-semibold uppercase tracking-widest text-muted">
                                Show only if
                            </label>
                            <div className="flex items-center gap-2 flex-wrap">
                                <select
                                    value={field.condition?.field_id || ""}
                                    onChange={(e) => {
                                        if (!e.target.value) {
                                            updateField({ condition: null });
                                        } else {
                                            updateField({
                                                condition: {
                                                    field_id: e.target.value,
                                                    operator: field.condition?.operator || "equals",
                                                    value: field.condition?.value || "",
                                                },
                                            });
                                        }
                                    }}
                                    className="flex-1 border border-border bg-background text-text px-3 py-2 text-sm outline-none focus:border-text transition-colors"
                                >
                                    <option value="">No condition</option>
                                    {conditionFields.map((f) => (
                                        <option key={f.id} value={f.id}>
                                            {f.label || `Untitled ${f.type}`}
                                        </option>
                                    ))}
                                </select>
                                {field.condition?.field_id && (() => {
                                    const condField = allFields.find((f) => f.id === field.condition?.field_id);
                                    const valueOptions: string[] = [];

                                    if (condField?.type === "yes_no") {
                                        valueOptions.push("yes", "no");
                                    } else if ((condField?.type === "dropdown" || condField?.type === "checkbox") && condField.options) {
                                        condField.options.forEach((o) => {
                                            if (o.label) valueOptions.push(o.label);
                                        });
                                    }

                                    return (
                                        <>
                                            <select
                                                value={field.condition!.operator}
                                                onChange={(e) => updateField({
                                                    condition: {
                                                        ...field.condition!,
                                                        operator: e.target.value as "equals" | "not_equals",
                                                    },
                                                })}
                                                className="border border-border bg-background text-text px-3 py-2 text-sm outline-none focus:border-text transition-colors"
                                            >
                                                <option value="equals">equals</option>
                                                <option value="not_equals">not equals</option>
                                            </select>
                                            {valueOptions.length > 0 ? (
                                                <select
                                                    value={field.condition!.value}
                                                    onChange={(e) => updateField({
                                                        condition: {
                                                            ...field.condition!,
                                                            value: e.target.value,
                                                        },
                                                    })}
                                                    className="flex-1 border border-border bg-background text-text px-3 py-2 text-sm outline-none focus:border-text transition-colors"
                                                >
                                                    <option value="">Select value...</option>
                                                    {valueOptions.map((v) => (
                                                        <option key={v} value={v}>{v}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <input
                                                    type="text"
                                                    value={field.condition!.value}
                                                    onChange={(e) => updateField({
                                                        condition: {
                                                            ...field.condition!,
                                                            value: e.target.value,
                                                        },
                                                    })}
                                                    placeholder="Value..."
                                                    className="flex-1 border border-border bg-background text-text px-3 py-2 text-sm outline-none focus:border-text transition-colors"
                                                />
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}