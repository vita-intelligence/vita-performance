"use client";

import { Button } from "@heroui/react";
import { QCWorker, QCWorkstation } from "@/types/qc";

interface QCWorkstationListProps {
    worker: QCWorker;
    workstations: QCWorkstation[];
    onSelect: (workstation: QCWorkstation) => void;
    onLogout: () => void;
}

export default function QCWorkstationList({ worker, workstations, onSelect, onLogout }: QCWorkstationListProps) {
    return (
        <div className="flex flex-col h-full">
            <div className="px-6 pt-8 pb-6 border-b border-border flex items-start justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted">Quality Control</p>
                    <h1 className="text-3xl font-black text-text uppercase tracking-tight">Select Station</h1>
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
                {workstations.length === 0 ? (
                    <p className="text-sm text-muted">No stations with pending QC sessions.</p>
                ) : (
                    <>
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-2">
                            Stations with pending sessions
                        </p>
                        {workstations.map((w) => (
                            <Button
                                key={w.id}
                                onPress={() => onSelect(w)}
                                variant="bordered"
                                className="w-full justify-start px-6 h-16 text-lg font-black uppercase tracking-wide rounded-none border-border text-text hover:border-text hover:bg-surface"
                            >
                                {w.name}
                            </Button>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}