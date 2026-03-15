"use client";

import { SessionFormResponse, FormField } from "@/types/dynamic-form";
import { useSessionForms } from "@/hooks/useSessionForms";
import Drawer from "@/components/ui/Drawer";
import { formatDateTime } from "@/lib/utils/date.utils";
import { useSettings } from "@/hooks/useSettings";

interface SessionFormsDrawerProps {
    sessionId: number | null;
    onClose: () => void;
}

function AnswerValue({ field, value }: { field: FormField; value: any }) {
    if (value === undefined || value === null || value === "") {
        return <span className="text-muted text-sm">—</span>;
    }

    if (field.type === "signature") {
        return (
            <img
                src={value}
                alt="Signature"
                className="border border-border max-w-full h-24 object-contain bg-white"
            />
        );
    }

    if (field.type === "rating") {
        return (
            <div className="flex items-center gap-1">
                {Array.from({ length: field.max_rating || 5 }, (_, i) => i + 1).map((n) => (
                    <span key={n} className={`text-lg ${value >= n ? "text-secondary" : "text-border"}`}>
                        ★
                    </span>
                ))}
                <span className="text-sm text-muted ml-2">{value} / {field.max_rating || 5}</span>
            </div>
        );
    }

    if (field.type === "yes_no") {
        return (
            <span className={`text-sm font-semibold uppercase tracking-widest ${value === "yes" ? "text-success" : "text-error"
                }`}>
                {value}
            </span>
        );
    }

    if (field.type === "checkbox" && Array.isArray(value)) {
        return (
            <div className="flex flex-col gap-1">
                {value.map((v: string, i: number) => (
                    <span key={i} className="text-sm text-text">• {v}</span>
                ))}
            </div>
        );
    }

    return <span className="text-sm text-text">{String(value)}</span>;
}

function FormResponseCard({ response, settings }: { response: SessionFormResponse; settings: any }) {
    const triggerLabel = {
        start: "Session Start",
        end: "Session End",
        both: "Both",
    }[response.trigger];

    const triggerColor = {
        start: "border-success text-success",
        end: "border-warning text-warning",
        both: "border-primary text-primary",
    }[response.trigger];

    return (
        <div className="border border-border flex flex-col gap-0">
            {/* Form header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
                <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-black text-text uppercase">{response.form_name}</p>
                    <p className="text-xs text-muted">
                        Submitted {formatDateTime(response.submitted_at, settings)}
                    </p>
                </div>
                <span className={`text-xs font-semibold uppercase tracking-widest px-2 py-0.5 border ${triggerColor}`}>
                    {triggerLabel}
                </span>
            </div>

            {/* Answers */}
            <div className="flex flex-col divide-y divide-border">
                {response.schema.map((field) => {
                    const value = response.answers[field.id];
                    return (
                        <div key={field.id} className="px-4 py-3 flex flex-col gap-1.5">
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                                {field.label}
                                {field.required && <span className="text-error ml-1">*</span>}
                            </p>
                            <AnswerValue field={field} value={value} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function SessionFormsDrawer({ sessionId, onClose }: SessionFormsDrawerProps) {
    const { responses, isLoading } = useSessionForms(sessionId);
    const { settings } = useSettings();

    return (
        <Drawer
            isOpen={!!sessionId}
            onClose={onClose}
            title="Form Responses"
        >
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <p className="text-muted text-xs uppercase tracking-widest">Loading...</p>
                </div>
            ) : !responses?.length ? (
                <div className="flex items-center justify-center py-20">
                    <p className="text-muted text-xs uppercase tracking-widest">No form responses</p>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {responses.map((response) => (
                        <FormResponseCard
                            key={response.id}
                            response={response}
                            settings={settings}
                        />
                    ))}
                </div>
            )}
        </Drawer>
    );
}