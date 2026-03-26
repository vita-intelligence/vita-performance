"use client";

import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@heroui/react";
import { X, Star, RotateCcw, ShieldCheck } from "lucide-react";
import { KioskForm, FormField } from "@/types/dynamic-form";
import { kioskService } from "@/services/kiosk.service";

interface FormRendererProps {
    form: KioskForm;
    onSubmit: (answers: Record<string, any>) => void;
    onClose: () => void;
    sessionId: number;
    isSubmitting?: boolean;
    token?: string;
}

function isFieldVisible(field: FormField, answers: Record<string, any>): boolean {
    if (!field.condition || !field.condition.field_id) return true;
    const { field_id, operator, value } = field.condition;
    const answer = String(answers[field_id] ?? "").toLowerCase();
    const expected = String(value).toLowerCase();
    if (operator === "equals") return answer === expected;
    if (operator === "not_equals") return answer !== expected;
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

function QCApprovalField({ field, value, onChange, error, token }: FieldProps & { token: string }) {
    const [step, setStep] = useState<"idle" | "select" | "pin">("idle");
    const [qcWorkers, setQcWorkers] = useState<{ id: number; name: string; has_pin: boolean }[]>([]);
    const [selectedWorker, setSelectedWorker] = useState<{ id: number; name: string; has_pin: boolean } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [pin, setPin] = useState("");
    const [pinError, setPinError] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);

    const fetchQCWorkers = async () => {
        setIsLoading(true);
        try {
            const workers = await kioskService.getQCWorkers(token);
            setQcWorkers(workers);
            setStep("select");
        } catch {
            // ignore
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectWorker = (worker: { id: number; name: string; has_pin: boolean }) => {
        setSelectedWorker(worker);
        setPin("");
        setPinError("");
        setStep("pin");
    };

    const handlePinKey = async (key: string) => {
        if (key === "DEL") {
            setPin((p) => p.slice(0, -1));
            setPinError("");
            return;
        }

        const next = pin + key;
        setPin(next);
        setPinError("");

        if (next.length === 4 && selectedWorker) {
            setIsVerifying(true);
            try {
                await kioskService.verifyPin(token, selectedWorker.id, next);
                onChange({
                    worker_id: selectedWorker.id,
                    worker_name: selectedWorker.name,
                    approved: true,
                });
                setStep("idle");
            } catch {
                setPinError("Incorrect PIN");
                setPin("");
            } finally {
                setIsVerifying(false);
            }
        }
    };

    const handleClear = () => {
        onChange(null);
        setSelectedWorker(null);
        setPin("");
        setStep("idle");
    };

    const pinKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "DEL"];

    // Approved state
    if (value?.approved) {
        return (
            <div className="flex items-center justify-between px-4 py-3 border-2 border-success bg-success/10">
                <div className="flex items-center gap-3">
                    <ShieldCheck size={20} className="text-success" />
                    <div className="flex flex-col">
                        <span className="text-sm font-black text-success uppercase">{value.worker_name}</span>
                        <span className="text-xs text-success/70 uppercase tracking-widest">Approved</span>
                    </div>
                </div>
                <button
                    onClick={handleClear}
                    className="text-xs text-muted hover:text-error transition-colors uppercase tracking-widest font-semibold"
                >
                    Clear
                </button>
            </div>
        );
    }

    // Select QC worker
    if (step === "select") {
        return (
            <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted">Select QC Inspector</p>
                {qcWorkers.length === 0 ? (
                    <p className="text-xs text-muted py-4 text-center uppercase tracking-widest">No QC workers available</p>
                ) : (
                    qcWorkers.map((w) => (
                        <button
                            key={w.id}
                            onClick={() => handleSelectWorker(w)}
                            className="w-full text-left px-4 py-3 border-2 border-border text-sm font-semibold text-text hover:border-text transition-colors"
                        >
                            {w.name}
                        </button>
                    ))
                )}
                <button
                    onClick={() => setStep("idle")}
                    className="text-xs font-semibold uppercase tracking-widest text-muted hover:text-text transition-colors py-2"
                >
                    Cancel
                </button>
            </div>
        );
    }

    // PIN entry
    if (step === "pin" && selectedWorker) {
        return (
            <div className="flex flex-col gap-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                    Enter PIN for {selectedWorker.name}
                </p>
                <div className="flex items-center justify-center gap-4">
                    {[0, 1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${i < pin.length ? "bg-text border-text scale-110" : "bg-background border-border"
                                }`}
                        />
                    ))}
                </div>
                {pinError && (
                    <p className="text-xs text-error font-semibold uppercase tracking-widest text-center">{pinError}</p>
                )}
                <div className="grid grid-cols-3 gap-2 max-w-[280px] mx-auto">
                    {pinKeys.map((key, i) => (
                        <button
                            key={i}
                            onClick={() => key && handlePinKey(key)}
                            disabled={isVerifying || !key || pin.length === 4}
                            className={`h-12 text-xl font-black transition-colors border ${key === "DEL"
                                ? "border-border text-error hover:bg-error hover:text-background text-sm"
                                : key
                                    ? "border-border text-text hover:bg-surface"
                                    : "border-transparent pointer-events-none opacity-0"
                                } disabled:opacity-30`}
                        >
                            {key}
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => { setStep("select"); setPin(""); setPinError(""); }}
                    className="text-xs font-semibold uppercase tracking-widest text-muted hover:text-text transition-colors py-2 text-center"
                >
                    Back
                </button>
            </div>
        );
    }

    // Default — tap to approve button
    return (
        <button
            onClick={fetchQCWorkers}
            disabled={isLoading}
            className={`w-full px-4 py-4 border-2 ${error ? "border-error" : "border-border"
                } text-sm font-semibold uppercase tracking-widest text-muted hover:border-text hover:text-text transition-colors flex items-center justify-center gap-2`}
        >
            {isLoading ? (
                "Loading..."
            ) : (
                <>
                    <ShieldCheck size={16} />
                    Tap to get QC approval
                </>
            )}
        </button>
    );
}

function TaskSelectField({ field, value, onChange, error }: FieldProps) {
    return (
        <div className="flex flex-col gap-2">
            {(field.options || []).map((option) => (
                <button
                    key={option.id}
                    onClick={() => onChange({
                        label: option.label,
                        target_quantity: option.target_quantity,
                        target_duration: option.target_duration,
                    })}
                    className={`w-full text-left px-4 py-3 border-2 text-sm font-semibold transition-colors ${value?.label === option.label
                        ? "border-text bg-text text-background"
                        : "border-border text-text hover:border-text"
                        }`}
                >
                    <span>{option.label}</span>
                    {(option.target_quantity || option.target_duration) && (
                        <span className="block text-xs font-normal mt-0.5 opacity-70">
                            {option.target_quantity && `${option.target_quantity} units`}
                            {option.target_quantity && option.target_duration && " / "}
                            {option.target_duration && `${option.target_duration}h`}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}

export default function FormRenderer({ form, onSubmit, onClose, sessionId, isSubmitting, token }: FormRendererProps) {
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
            let isEmpty;
            if (field.type === "qc_approval") {
                isEmpty = !val?.approved;
            } else if (field.type === "task_select") {
                isEmpty = !val?.label;
            } else {
                isEmpty =
                    val === undefined ||
                    val === null ||
                    val === "" ||
                    (Array.isArray(val) && val.length === 0);
            }
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
            case "qc_approval": return <QCApprovalField {...props} token={token || ""} />;
            case "task_select": return <TaskSelectField {...props} />;
            default: return null;
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[200] bg-background flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border shrink-0">
                <div className="flex flex-col gap-0.5">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted">Form</p>
                    <p className="text-base sm:text-lg font-black text-text uppercase">{form.name}</p>
                </div>
                <button onClick={onClose} className="text-muted hover:text-text transition-colors">
                    <X size={18} />
                </button>
            </div>

            {/* Fields */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6">
                <div className="max-w-lg mx-auto flex flex-col gap-6">
                    {visibleFields.map((field) => (
                        <div key={field.id} className="flex flex-col gap-2">
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
            <div className="p-4 sm:p-6 border-t border-border shrink-0">
                <Button
                    onPress={handleSubmit}
                    isDisabled={isSubmitting}
                    isLoading={isSubmitting}
                    className="w-full h-12 sm:h-14 bg-text text-background text-sm font-black uppercase tracking-widest hover:opacity-80 rounded-none"
                >
                    Submit
                </Button>
            </div>
        </div>,
        document.body
    );
}