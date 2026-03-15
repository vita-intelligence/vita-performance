"use client";

import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@heroui/react";
import { X, Star, RotateCcw } from "lucide-react";
import { KioskForm, FormField } from "@/types/dynamic-form";

interface FormRendererProps {
    form: KioskForm;
    onSubmit: (answers: Record<string, any>) => void;
    onClose: () => void;
    sessionId: number;
}

function isFieldVisible(field: FormField, answers: Record<string, any>): boolean {
    if (!field.condition || !field.condition.field_id) return true;
    const { field_id, operator, value } = field.condition;
    const answer = answers[field_id];
    if (operator === "equals") return String(answer) === String(value);
    if (operator === "not_equals") return String(answer) !== String(value);
    return true;
}

interface FieldProps {
    field: FormField;
    value: any;
    onChange: (value: any) => void;
    error: boolean;
}

function TextField({ field, value, onChange, error }: FieldProps) {
    return (
        <input
            type="text"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || "Type your answer..."}
            className={`w-full border ${error ? "border-error" : "border-border"} bg-background text-text px-4 py-3 text-sm outline-none focus:border-text transition-colors`}
        />
    );
}

function NumberField({ field, value, onChange, error }: FieldProps) {
    return (
        <input
            type="number"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || "Enter a number..."}
            className={`w-full border ${error ? "border-error" : "border-border"} bg-background text-text px-4 py-3 text-sm outline-none focus:border-text transition-colors`}
        />
    );
}

function YesNoField({ field, value, onChange, error }: FieldProps) {
    return (
        <div className="flex gap-3">
            <button
                onClick={() => onChange("yes")}
                className={`flex-1 py-4 text-sm font-black uppercase tracking-widest border-2 transition-colors ${value === "yes"
                        ? "border-success bg-success/10 text-success"
                        : "border-border text-muted hover:border-text"
                    }`}
            >
                Yes
            </button>
            <button
                onClick={() => onChange("no")}
                className={`flex-1 py-4 text-sm font-black uppercase tracking-widest border-2 transition-colors ${value === "no"
                        ? "border-error bg-error/10 text-error"
                        : "border-border text-muted hover:border-text"
                    }`}
            >
                No
            </button>
        </div>
    );
}

function CheckboxField({ field, value, onChange, error }: FieldProps) {
    const selected: string[] = value || [];
    const toggle = (label: string) => {
        if (selected.includes(label)) {
            onChange(selected.filter((v) => v !== label));
        } else {
            onChange([...selected, label]);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            {(field.options || []).map((option) => (
                <button
                    key={option.id}
                    onClick={() => toggle(option.label)}
                    className={`w-full text-left px-4 py-3 border-2 text-sm font-semibold transition-colors ${selected.includes(option.label)
                            ? "border-text bg-text text-background"
                            : "border-border text-text hover:border-text"
                        }`}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}

function DropdownField({ field, value, onChange, error }: FieldProps) {
    return (
        <div className="flex flex-col gap-2">
            {(field.options || []).map((option) => (
                <button
                    key={option.id}
                    onClick={() => onChange(option.label)}
                    className={`w-full text-left px-4 py-3 border-2 text-sm font-semibold transition-colors ${value === option.label
                            ? "border-text bg-text text-background"
                            : "border-border text-text hover:border-text"
                        }`}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}

function RatingField({ field, value, onChange, error }: FieldProps) {
    const max = field.max_rating || 5;
    return (
        <div className="flex gap-2 flex-wrap">
            {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
                <button
                    key={n}
                    onClick={() => onChange(n)}
                    className="transition-colors"
                >
                    <Star
                        size={36}
                        className={`transition-colors ${value >= n ? "text-secondary fill-secondary" : "text-border"
                            }`}
                    />
                </button>
            ))}
        </div>
    );
}

function SignatureField({ field, value, onChange, error }: FieldProps) {
    const sigRef = useRef<SignatureCanvas>(null);

    const handleClear = () => {
        sigRef.current?.clear();
        onChange(null);
    };

    const handleEnd = () => {
        if (sigRef.current) {
            onChange(sigRef.current.toDataURL());
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <div className={`border-2 ${error ? "border-error" : "border-border"} bg-white`}>
                <SignatureCanvas
                    ref={sigRef}
                    penColor="black"
                    canvasProps={{
                        className: "w-full",
                        height: 200,
                    }}
                    onEnd={handleEnd}
                />
            </div>
            <button
                onClick={handleClear}
                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted hover:text-text transition-colors"
            >
                <RotateCcw size={12} />
                Clear signature
            </button>
        </div>
    );
}

export default function FormRenderer({ form, onSubmit, onClose, sessionId }: FormRendererProps) {
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [errors, setErrors] = useState<Record<string, boolean>>({});

    const handleChange = (fieldId: string, value: any) => {
        setAnswers((prev) => ({ ...prev, [fieldId]: value }));
        setErrors((prev) => ({ ...prev, [fieldId]: false }));
    };

    const handleSubmit = () => {
        const newErrors: Record<string, boolean> = {};
        let hasError = false;

        form.schema.forEach((field) => {
            if (!isFieldVisible(field, answers)) return;
            if (!field.required) return;
            const val = answers[field.id];
            const isEmpty =
                val === undefined ||
                val === null ||
                val === "" ||
                (Array.isArray(val) && val.length === 0);
            if (isEmpty) {
                newErrors[field.id] = true;
                hasError = true;
            }
        });

        if (hasError) {
            setErrors(newErrors);
            return;
        }

        onSubmit(answers);
    };

    const visibleFields = form.schema.filter((f) => isFieldVisible(f, answers));

    const renderField = (field: FormField) => {
        const props = {
            field,
            value: answers[field.id],
            onChange: (val: any) => handleChange(field.id, val),
            error: !!errors[field.id],
        };

        switch (field.type) {
            case "text": return <TextField {...props} />;
            case "number": return <NumberField {...props} />;
            case "yes_no": return <YesNoField {...props} />;
            case "checkbox": return <CheckboxField {...props} />;
            case "dropdown": return <DropdownField {...props} />;
            case "rating": return <RatingField {...props} />;
            case "signature": return <SignatureField {...props} />;
            default: return null;
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[200] bg-background flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                <div className="flex flex-col gap-0.5">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted">Form</p>
                    <p className="text-lg font-black text-text uppercase">{form.name}</p>
                </div>
                <button onClick={onClose} className="text-muted hover:text-text transition-colors">
                    <X size={18} />
                </button>
            </div>

            {/* Fields */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
                <div className="max-w-lg mx-auto flex flex-col gap-8">
                    {visibleFields.map((field) => (
                        <div key={field.id} className="flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-black text-text uppercase tracking-wide">
                                    {field.label}
                                </p>
                                {field.required && (
                                    <span className="text-error text-sm">*</span>
                                )}
                            </div>
                            {renderField(field)}
                            {errors[field.id] && (
                                <p className="text-xs text-error font-semibold uppercase tracking-widest">
                                    This field is required.
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border shrink-0">
                <Button
                    onPress={handleSubmit}
                    className="w-full h-14 bg-text text-background text-sm font-black uppercase tracking-widest hover:opacity-80 rounded-none"
                >
                    Submit
                </Button>
            </div>
        </div>,
        document.body
    );
}