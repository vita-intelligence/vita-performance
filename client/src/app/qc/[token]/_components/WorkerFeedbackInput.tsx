"use client";

import { ThumbsUp, ThumbsDown } from "lucide-react";

export type FeedbackMark = "positive" | "negative" | null;

export interface FeedbackState {
    mark: FeedbackMark;
    reason: string;
}

interface WorkerFeedbackInputProps {
    workerName: string;
    state: FeedbackState;
    onChange: (state: FeedbackState) => void;
    error?: string;
}

export default function WorkerFeedbackInput({ workerName, state, onChange, error }: WorkerFeedbackInputProps) {
    const setMark = (mark: FeedbackMark) => {
        onChange({ ...state, mark: state.mark === mark ? null : mark });
    };
    const setReason = (reason: string) => {
        onChange({ ...state, reason });
    };

    return (
        <div className="border border-border p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-black uppercase tracking-wide text-text truncate">
                    {workerName}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={() => setMark("positive")}
                        className={`flex items-center justify-center w-10 h-10 border transition-colors ${state.mark === "positive"
                            ? "border-success bg-success text-background"
                            : "border-border text-muted hover:border-success hover:text-success"
                            }`}
                    >
                        <ThumbsUp size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setMark("negative")}
                        className={`flex items-center justify-center w-10 h-10 border transition-colors ${state.mark === "negative"
                            ? "border-error bg-error text-background"
                            : "border-border text-muted hover:border-error hover:text-error"
                            }`}
                    >
                        <ThumbsDown size={16} />
                    </button>
                </div>
            </div>
            {state.mark && (
                <input
                    type="text"
                    value={state.reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason (required)"
                    className="w-full px-3 py-2 text-sm bg-surface border border-border focus:border-text outline-none text-text placeholder:text-muted"
                />
            )}
            {error && (
                <p className="text-xs text-error font-semibold uppercase tracking-widest">{error}</p>
            )}
        </div>
    );
}
