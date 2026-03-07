"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { QCWorker, QCWorkstation, QCSession } from "@/types/qc";

interface QCSessionListProps {
    worker: QCWorker;
    workstation: QCWorkstation;
    sessions: QCSession[];
    onVerify: (sessionId: number, quantityRejected: number) => void;
    onBack: () => void;
    onLogout: () => void;
}

export default function QCSessionList({ worker, workstation, sessions, onVerify, onBack, onLogout }: QCSessionListProps) {
    const [selected, setSelected] = useState<QCSession | null>(null);
    const [quantityRejected, setQuantityRejected] = useState("");
    const [error, setError] = useState("");

    const handleVerify = () => {
        if (!selected) return;
        const rejected = Number(quantityRejected);
        if (isNaN(rejected) || rejected < 0) {
            setError("Please enter a valid number.");
            return;
        }
        if (selected.quantity_produced && rejected > selected.quantity_produced) {
            setError("Rejected quantity cannot exceed produced quantity.");
            return;
        }
        onVerify(selected.id, rejected);
    };

    const handleSelect = (session: QCSession) => {
        setSelected(session);
        setQuantityRejected("");
        setError("");
    };

    const handleBack = () => {
        setSelected(null);
        setQuantityRejected("");
        setError("");
    };

    // Verify drawer
    if (selected) {
        return (
            <div className="flex flex-col h-full">
                <div className="px-6 pt-8 pb-6 border-b border-border flex items-start justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted">{workstation.name}</p>
                        <h1 className="text-3xl font-black text-text uppercase tracking-tight">Verify Session</h1>
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-success">{worker.name}</p>
                </div>

                <div className="flex-1 p-6 flex flex-col gap-6">
                    {/* Session info */}
                    <div className="flex flex-col gap-3 border border-border p-4">
                        <div className="flex flex-col gap-1">
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Workers</p>
                            <p className="text-sm font-semibold text-text">
                                {selected.workers.map((w) => w.name).join(", ")}
                            </p>
                        </div>
                        {selected.item_name && (
                            <div className="flex flex-col gap-1">
                                <p className="text-xs font-semibold uppercase tracking-widest text-muted">Item</p>
                                <p className="text-sm font-semibold text-text">{selected.item_name}</p>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                                <p className="text-xs font-semibold uppercase tracking-widest text-muted">Produced</p>
                                <p className="text-sm font-semibold text-text">{selected.quantity_produced ?? "—"}</p>
                            </div>
                            <div className="flex flex-col gap-1">
                                <p className="text-xs font-semibold uppercase tracking-widest text-muted">Duration</p>
                                <p className="text-sm font-semibold text-text">
                                    {selected.duration_hours ? `${selected.duration_hours}h` : "—"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Rejected input */}
                    <div className="flex flex-col gap-2">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                            Units Rejected
                        </p>
                        <input
                            type="number"
                            value={quantityRejected}
                            onChange={(e) => { setQuantityRejected(e.target.value); setError(""); }}
                            placeholder="0"
                            className="text-5xl font-black text-text bg-transparent border-b-2 border-border focus:border-text outline-none pb-2 w-full"
                            autoFocus
                        />
                        {error && (
                            <p className="text-xs text-error font-semibold uppercase tracking-widest">{error}</p>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-border flex flex-col gap-3">
                    <Button
                        onPress={handleVerify}
                        isDisabled={quantityRejected === ""}
                        className="w-full h-14 bg-text text-background text-sm font-black uppercase tracking-widest hover:opacity-80 rounded-none disabled:opacity-30"
                    >
                        Verify Session
                    </Button>
                    <Button
                        onPress={handleBack}
                        variant="bordered"
                        className="w-full h-12 rounded-none border-border text-muted text-xs font-semibold uppercase tracking-widest hover:border-text hover:text-text"
                    >
                        Back
                    </Button>
                </div>
            </div>
        );
    }

    // Session list
    return (
        <div className="flex flex-col h-full">
            <div className="px-6 pt-8 pb-6 border-b border-border flex items-start justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted">{workstation.name}</p>
                    <h1 className="text-3xl font-black text-text uppercase tracking-tight">Pending QC</h1>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <p className="text-xs font-semibold uppercase tracking-widest text-success">{worker.name}</p>
                    <Button
                        onPress={onLogout}
                        variant="light"
                        className="text-xs font-semibold uppercase tracking-widest text-muted hover:text-error rounded-none h-auto p-0 min-w-0"
                    >
                        Finish
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3">
                {sessions.length === 0 ? (
                    <p className="text-sm text-muted">No pending sessions for this station.</p>
                ) : (
                    sessions.map((session) => (
                        <Button
                            key={session.id}
                            onPress={() => handleSelect(session)}
                            variant="bordered"
                            className="w-full justify-start px-6 py-5 h-auto flex-col items-start rounded-none border-border hover:border-text hover:bg-surface gap-2"
                        >
                            <div className="flex items-center justify-between w-full">
                                <span className="text-sm font-black uppercase tracking-wide text-text">
                                    {session.workers.map((w) => w.name).join(", ")}
                                </span>
                                <span className="text-xs font-semibold uppercase tracking-widest text-muted">
                                    {session.duration_hours ? `${session.duration_hours}h` : "—"}
                                </span>
                            </div>
                            <div className="flex items-center gap-4 w-full">
                                {session.item_name && (
                                    <span className="text-xs text-muted uppercase tracking-widest">{session.item_name}</span>
                                )}
                                <span className="text-xs text-muted uppercase tracking-widest ml-auto">
                                    {session.quantity_produced ? `${session.quantity_produced} units` : "—"}
                                </span>
                            </div>
                        </Button>
                    ))
                )}
            </div>

            <div className="p-6 border-t border-border">
                <Button
                    onPress={onBack}
                    variant="bordered"
                    className="w-full h-12 rounded-none border-border text-muted text-xs font-semibold uppercase tracking-widest hover:border-text hover:text-text"
                >
                    Back to Stations
                </Button>
            </div>
        </div>
    );
}