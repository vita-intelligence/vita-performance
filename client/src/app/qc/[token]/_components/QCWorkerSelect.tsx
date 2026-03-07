"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { QCWorker } from "@/types/qc";
import QCPinPad from "./QCPinPad";

interface QCWorkerSelectProps {
    token: string;
    workers: QCWorker[];
    onVerified: (workerId: number) => void;
}

export default function QCWorkerSelect({ token, workers, onVerified }: QCWorkerSelectProps) {
    const [selecting, setSelecting] = useState<QCWorker | null>(null);

    if (selecting) {
        return (
            <div className="flex flex-col h-full">
                <div className="px-6 pt-8 pb-6 border-b border-border">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted">Quality Control</p>
                    <h1 className="text-3xl font-black text-text uppercase tracking-tight">Verify Identity</h1>
                </div>
                <div className="flex-1 flex flex-col justify-center">
                    <QCPinPad
                        token={token}
                        worker={selecting}
                        onSuccess={() => onVerified(selecting.id)}
                        onCancel={() => setSelecting(null)}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="px-6 pt-8 pb-6 border-b border-border">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted">Quality Control</p>
                <h1 className="text-3xl font-black text-text uppercase tracking-tight">Who are you?</h1>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-2">
                    Select your name to continue
                </p>
                {workers.length === 0 && (
                    <p className="text-sm text-muted">No QC workers assigned. Ask your manager to set up QC access.</p>
                )}
                {workers.map((worker) => (
                    <Button
                        key={worker.id}
                        onPress={() => setSelecting(worker)}
                        variant="bordered"
                        className="w-full justify-start px-6 h-16 text-lg font-black uppercase tracking-wide rounded-none border-border text-text hover:border-text hover:bg-surface"
                    >
                        {worker.name}
                    </Button>
                ))}
            </div>
        </div>
    );
}