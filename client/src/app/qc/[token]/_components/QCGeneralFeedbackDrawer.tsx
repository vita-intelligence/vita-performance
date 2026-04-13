"use client";

import { useState, useEffect } from "react";
import { Button } from "@heroui/react";
import { ThumbsUp, ThumbsDown, CheckCircle2 } from "lucide-react";
import { QCWorker } from "@/types/qc";
import Drawer from "@/components/ui/Drawer";
import { qcService } from "@/services/qc.service";

interface QCGeneralFeedbackDrawerProps {
    token: string;
    isOpen: boolean;
    inspector: QCWorker;
    workers: QCWorker[];
    onClose: () => void;
    onSubmitted: () => void;
}

export default function QCGeneralFeedbackDrawer({
    token,
    isOpen,
    inspector,
    workers,
    onClose,
    onSubmitted,
}: QCGeneralFeedbackDrawerProps) {
    const [workerId, setWorkerId] = useState<number | null>(null);
    const [mark, setMark] = useState<"positive" | "negative" | null>(null);
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (isOpen) {
            setWorkerId(null);
            setMark(null);
            setReason("");
            setError("");
        }
    }, [isOpen]);

    const handleSubmit = async () => {
        setError("");
        if (!workerId) {
            setError("Pick a worker.");
            return;
        }
        if (!mark) {
            setError("Pick positive or negative.");
            return;
        }
        if (!reason.trim()) {
            setError("Reason is required.");
            return;
        }
        setSubmitting(true);
        try {
            await qcService.leaveGeneralFeedback(token, {
                worker_id: workerId,
                mark,
                reason: reason.trim(),
                qc_inspector_id: inspector.id,
            });
            onSubmitted();
            onClose();
        } catch (e: any) {
            setError(e?.response?.data?.detail || "Failed to record feedback.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Drawer isOpen={isOpen} onClose={onClose} title="General Feedback">
            <div className="flex flex-col gap-6">
                <p className="text-xs text-muted">
                    Leave a reputation mark on any worker, even if not tied to a session.
                </p>

                <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                        Worker
                    </p>
                    <select
                        value={workerId ?? ""}
                        onChange={(e) => setWorkerId(Number(e.target.value) || null)}
                        className="w-full px-3 py-3 text-sm bg-surface border border-border focus:border-text outline-none text-text"
                    >
                        <option value="">— Select worker —</option>
                        {workers.map((w) => (
                            <option key={w.id} value={w.id}>
                                {w.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                        Mark
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => setMark("positive")}
                            className={`flex items-center justify-center gap-2 px-4 py-4 border transition-colors ${mark === "positive"
                                ? "border-success bg-success text-background"
                                : "border-border text-muted hover:border-success hover:text-success"
                                }`}
                        >
                            <ThumbsUp size={16} />
                            <span className="text-xs font-semibold uppercase tracking-widest">Positive</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setMark("negative")}
                            className={`flex items-center justify-center gap-2 px-4 py-4 border transition-colors ${mark === "negative"
                                ? "border-error bg-error text-background"
                                : "border-border text-muted hover:border-error hover:text-error"
                                }`}
                        >
                            <ThumbsDown size={16} />
                            <span className="text-xs font-semibold uppercase tracking-widest">Negative</span>
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                        Reason
                    </p>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="What happened?"
                        rows={4}
                        className="w-full px-3 py-2 text-sm bg-surface border border-border focus:border-text outline-none text-text placeholder:text-muted resize-none"
                    />
                </div>

                {error && (
                    <p className="text-xs text-error font-semibold uppercase tracking-widest">{error}</p>
                )}

                <div className="flex flex-col gap-2">
                    <Button
                        onPress={handleSubmit}
                        isDisabled={submitting}
                        isLoading={submitting}
                        className="w-full h-14 bg-text text-background text-sm font-black uppercase tracking-widest hover:opacity-80 rounded-none disabled:opacity-30"
                        startContent={!submitting ? <CheckCircle2 size={16} /> : undefined}
                    >
                        Record Feedback
                    </Button>
                    <Button
                        onPress={onClose}
                        isDisabled={submitting}
                        variant="bordered"
                        className="w-full h-12 rounded-none border-border text-muted text-xs font-semibold uppercase tracking-widest hover:border-text hover:text-text"
                    >
                        Cancel
                    </Button>
                </div>
            </div>
        </Drawer>
    );
}
