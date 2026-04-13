"use client";

import { useState, useEffect } from "react";
import { Button } from "@heroui/react";
import { CheckCircle2 } from "lucide-react";
import { QCSession, QCFeedbackMark } from "@/types/qc";
import Drawer from "@/components/ui/Drawer";
import WorkerFeedbackInput, { FeedbackState } from "./WorkerFeedbackInput";

interface QCVerifyDrawerProps {
    session: QCSession | null;
    isVerifying: boolean;
    onClose: () => void;
    onVerify: (sessionId: number, quantityRejected: number, feedback: QCFeedbackMark[]) => Promise<void> | void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="px-4 py-3 flex flex-col gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</p>
            <div className="text-sm text-text">{children}</div>
        </div>
    );
}

function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString();
}

export default function QCVerifyDrawer({ session, isVerifying, onClose, onVerify }: QCVerifyDrawerProps) {
    const [quantityRejected, setQuantityRejected] = useState("");
    const [error, setError] = useState("");
    const [feedback, setFeedback] = useState<Record<number, FeedbackState>>({});
    const [feedbackErrors, setFeedbackErrors] = useState<Record<number, string>>({});

    useEffect(() => {
        setQuantityRejected("");
        setError("");
        setFeedback({});
        setFeedbackErrors({});
    }, [session?.id]);

    const handleVerify = async () => {
        if (!session) return;
        const rejected = Number(quantityRejected);
        if (quantityRejected === "" || isNaN(rejected) || rejected < 0) {
            setError("Please enter a valid number.");
            return;
        }
        if (session.quantity_produced && rejected > session.quantity_produced) {
            setError("Rejected quantity cannot exceed produced quantity.");
            return;
        }

        // Validate feedback: any worker with a mark must have a non-empty reason.
        const errors: Record<number, string> = {};
        const cleaned: QCFeedbackMark[] = [];
        for (const worker of session.workers) {
            const f = feedback[worker.id];
            if (!f || f.mark === null) continue;
            if (!f.reason.trim()) {
                errors[worker.id] = "Reason required";
                continue;
            }
            cleaned.push({
                worker_id: worker.id,
                mark: f.mark,
                reason: f.reason.trim(),
            });
        }
        if (Object.keys(errors).length) {
            setFeedbackErrors(errors);
            return;
        }
        setFeedbackErrors({});

        await onVerify(session.id, rejected, cleaned);
    };

    const uomLabel = session?.workstation_uom || "units";

    return (
        <Drawer isOpen={!!session} onClose={onClose} title="Verify Session">
            {!session ? null : (
                <div className="flex flex-col gap-6">
                    <div className="border border-border flex flex-col divide-y divide-border">
                        <Field label="Workstation">{session.workstation_name || "—"}</Field>
                        <Field label="Workers">
                            {session.workers.map((w) => w.name).join(", ")}
                        </Field>
                        <Field label="Item">{session.item_name || "—"}</Field>
                        <Field label="Quantity Produced">
                            {session.quantity_produced !== null && session.quantity_produced !== undefined
                                ? `${session.quantity_produced} ${uomLabel}`
                                : "—"}
                        </Field>
                        <Field label="Duration">
                            {session.duration_hours ? `${session.duration_hours}h` : "—"}
                        </Field>
                        <Field label="Start Time">{formatDate(session.start_time)}</Field>
                        {session.end_time && (
                            <Field label="End Time">{formatDate(session.end_time)}</Field>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                            {uomLabel.charAt(0).toUpperCase() + uomLabel.slice(1)} Rejected
                        </p>
                        <div className="flex items-baseline gap-2 border-b-2 border-border focus-within:border-text pb-2">
                            <input
                                type="number"
                                value={quantityRejected}
                                onChange={(e) => { setQuantityRejected(e.target.value); setError(""); }}
                                placeholder="0"
                                className="flex-1 min-w-0 w-0 text-5xl font-black text-text bg-transparent outline-none"
                                autoFocus
                            />
                            <span className="shrink-0 text-base font-semibold uppercase tracking-widest text-muted">
                                {uomLabel}
                            </span>
                        </div>
                        {error && (
                            <p className="text-xs text-error font-semibold uppercase tracking-widest">{error}</p>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                            Worker Feedback (optional)
                        </p>
                        <p className="text-xs text-muted">
                            Tap a thumb to leave a reputation mark. Reason required when set.
                        </p>
                        <div className="flex flex-col gap-2">
                            {session.workers.map((worker) => (
                                <WorkerFeedbackInput
                                    key={worker.id}
                                    workerName={worker.name}
                                    state={feedback[worker.id] ?? { mark: null, reason: "" }}
                                    onChange={(next) =>
                                        setFeedback((prev) => ({ ...prev, [worker.id]: next }))
                                    }
                                    error={feedbackErrors[worker.id]}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Button
                            onPress={handleVerify}
                            isDisabled={quantityRejected === "" || isVerifying}
                            isLoading={isVerifying}
                            className="w-full h-14 bg-text text-background text-sm font-black uppercase tracking-widest hover:opacity-80 rounded-none disabled:opacity-30"
                            startContent={!isVerifying ? <CheckCircle2 size={16} /> : undefined}
                        >
                            Verify Session
                        </Button>
                        <Button
                            onPress={onClose}
                            isDisabled={isVerifying}
                            variant="bordered"
                            className="w-full h-12 rounded-none border-border text-muted text-xs font-semibold uppercase tracking-widest hover:border-text hover:text-text"
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            )}
        </Drawer>
    );
}
