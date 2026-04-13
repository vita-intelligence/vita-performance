"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { FileText } from "lucide-react";
import { KioskWorker, KioskItem, KioskActiveSession } from "@/types/kiosk";
import { kioskService } from "@/services/kiosk.service";
import PinPad from "./PinPad";
import ItemStep from "./ItemStep";
import SOPViewer from "@/components/shared/SOPViewer";

type Step = "workers" | "pin" | "item" | "review";

interface KioskIdleProps {
    token: string;
    workstationName: string;
    workers: KioskWorker[];
    onStart: (workerIds: number[], itemId?: number | null) => void;
    sop: { content: string; updated_at: string | null } | null;
    isSOPLoading: boolean;
    onFetchSOP: () => void;
    isSubmitting?: boolean;
    isGeneral?: boolean;
    onResumeSession?: (session: KioskActiveSession) => void;
}

export default function KioskIdle({
    token,
    workstationName,
    workers,
    onStart,
    sop,
    isSOPLoading,
    onFetchSOP,
    isSubmitting,
    isGeneral,
    onResumeSession,
}: KioskIdleProps) {
    const [step, setStep] = useState<Step>("workers");
    const [checkedIn, setCheckedIn] = useState<{ id: number; name: string }[]>([]);
    const [selectingWorker, setSelectingWorker] = useState<KioskWorker | null>(null);
    const [selectedItem, setSelectedItem] = useState<KioskItem | null>(null);
    const [showSOP, setShowSOP] = useState(false);

    const handleWorkerTap = (worker: KioskWorker) => {
        if (checkedIn.find((w) => w.id === worker.id)) return;
        setSelectingWorker(worker);
        setStep("pin");
    };

    const handlePinSuccess = async (worker: { id: number; name: string }) => {
        if (isGeneral && onResumeSession) {
            const existing = await kioskService.getActiveSession(token, worker.id);
            if (existing) {
                onResumeSession(existing);
                return;
            }
        }
        setCheckedIn((prev) => [...prev, worker]);
        setSelectingWorker(null);
        setStep("workers");
    };

    const handleRemove = (id: number) => {
        setCheckedIn((prev) => prev.filter((w) => w.id !== id));
    };

    const handleStart = () => {
        onStart(checkedIn.map((w) => w.id), selectedItem?.id ?? null);
    };

    const handleSOPPress = () => {
        onFetchSOP();
        setShowSOP(true);
    };

    if (step === "workers") {
        return (
            <>
                <div className="flex flex-col h-full overflow-hidden">
                    {/* Header */}
                    <div className="px-4 pt-6 pb-4 border-b border-border shrink-0">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted">Workstation</p>
                        <h1 className="text-xl sm:text-3xl font-black text-text uppercase tracking-tight">{workstationName}</h1>
                    </div>

                    {/* Checked in bar */}
                    {checkedIn.length > 0 && (
                        <div className="px-6 py-3 bg-success/10 border-b border-success/30 flex items-center justify-between gap-3 flex-wrap shrink-0">
                            <div className="flex items-center gap-3 flex-wrap">
                                <p className="text-xs font-semibold uppercase tracking-widest text-success">Checked in:</p>
                                {checkedIn.map((w) => (
                                    <div key={w.id} className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-success">{w.name}</span>
                                        <button
                                            onClick={() => handleRemove(w.id)}
                                            className="text-xs text-muted hover:text-error transition-colors"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <Button
                                onPress={handleSOPPress}
                                isLoading={isSOPLoading}
                                variant="bordered"
                                size="sm"
                                className="rounded-none border-border text-muted hover:text-text text-xs font-semibold uppercase tracking-widest shrink-0"
                                startContent={!isSOPLoading ? <FileText size={12} /> : undefined}
                            >
                                SOP
                            </Button>
                        </div>
                    )}

                    {/* Worker list — scrollable */}
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-1">
                            Tap your name to check in
                        </p>
                        {workers.map((worker) => {
                            const isCheckedIn = !!checkedIn.find((w) => w.id === worker.id);
                            return (
                                <Button
                                    key={worker.id}
                                    onPress={() => handleWorkerTap(worker)}
                                    isDisabled={isCheckedIn}
                                    variant="bordered"
                                    className={`w-full justify-start px-4 h-12 sm:h-16 text-base sm:text-lg font-black uppercase tracking-wide rounded-none border transition-colors shrink-0 ${isCheckedIn
                                        ? "border-success bg-success/10 text-success opacity-60"
                                        : "border-border text-text hover:border-text hover:bg-surface"
                                        }`}
                                >
                                    {worker.name}
                                    {isCheckedIn && (
                                        <span className="ml-auto text-xs font-semibold uppercase tracking-widest text-success">
                                            ✓
                                        </span>
                                    )}
                                </Button>
                            );
                        })}
                    </div>

                    {/* Footer — always visible */}
                    <div className="p-4 border-t border-border shrink-0">
                        <Button
                            onPress={() => setStep("item")}
                            isDisabled={checkedIn.length === 0}
                            className="w-full h-12 sm:h-14 bg-text text-background text-sm font-black uppercase tracking-widest hover:opacity-80 rounded-none disabled:opacity-30"
                        >
                            Continue
                        </Button>
                    </div>
                </div>

                {showSOP && sop?.content && (
                    <SOPViewer
                        sop={{
                            id: 0,
                            content: sop.content,
                            created_at: "",
                            updated_at: sop.updated_at || "",
                        }}
                        workstationName={workstationName}
                        onClose={() => setShowSOP(false)}
                    />
                )}
            </>
        );
    }

    if (step === "pin" && selectingWorker) {
        return (
            <div className="flex flex-col h-full overflow-hidden">
                <div className="px-4 pt-6 pb-4 border-b border-border shrink-0">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted">Workstation</p>
                    <h1 className="text-xl sm:text-3xl font-black text-text uppercase tracking-tight">{workstationName}</h1>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto flex flex-col justify-center">
                    <PinPad
                        token={token}
                        worker={selectingWorker}
                        onSuccess={handlePinSuccess}
                        onCancel={() => { setSelectingWorker(null); setStep("workers"); }}
                    />
                </div>
            </div>
        );
    }

    if (step === "item") {
        return (
            <div className="flex flex-col h-full overflow-hidden">
                <div className="px-4 pt-6 pb-4 border-b border-border shrink-0">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted">Workstation</p>
                    <h1 className="text-xl sm:text-3xl font-black text-text uppercase tracking-tight">{workstationName}</h1>
                </div>
                <div className="flex-1 min-h-0 flex flex-col">
                    <ItemStep
                        token={token}
                        selected={selectedItem}
                        onSelect={setSelectedItem}
                        onNext={() => setStep("review")}
                        onBack={() => setStep("workers")}
                    />
                </div>
            </div>
        );
    }

    if (step === "review") {
        return (
            <>
                <div className="flex flex-col h-full overflow-hidden">
                    <div className="px-4 pt-6 pb-4 border-b border-border shrink-0">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted">Workstation</p>
                        <h1 className="text-xl sm:text-3xl font-black text-text uppercase tracking-tight">{workstationName}</h1>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-6">
                        <div className="flex flex-col gap-2">
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Workers</p>
                            {checkedIn.map((w) => (
                                <div key={w.id} className="flex items-center gap-3 px-4 py-3 border border-success">
                                    <div className="w-2 h-2 rounded-full bg-success" />
                                    <span className="text-base sm:text-lg font-black text-success uppercase">{w.name}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col gap-2">
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Item</p>
                            <div className="px-4 py-3 border border-border">
                                <span className="text-base sm:text-lg font-black text-text uppercase">
                                    {selectedItem ? selectedItem.name : <span className="text-muted font-normal text-sm">No item selected</span>}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t border-border flex flex-col gap-2 shrink-0">
                        <Button
                            onPress={handleStart}
                            isDisabled={isSubmitting}
                            isLoading={isSubmitting}
                            className="w-full h-12 sm:h-14 bg-text text-background text-sm font-black uppercase tracking-widest hover:opacity-80 rounded-none"
                        >
                            Start Session
                        </Button>
                        <Button
                            onPress={handleSOPPress}
                            isLoading={isSOPLoading}
                            variant="bordered"
                            className="w-full h-10 sm:h-12 rounded-none border-border text-muted text-xs font-semibold uppercase tracking-widest hover:border-text hover:text-text"
                            startContent={!isSOPLoading ? <FileText size={14} /> : undefined}
                        >
                            Read SOP
                        </Button>
                        <Button
                            onPress={() => setStep("item")}
                            variant="bordered"
                            className="w-full h-10 sm:h-12 rounded-none border-border text-muted text-xs font-semibold uppercase tracking-widest hover:border-text hover:text-text"
                        >
                            Back
                        </Button>
                    </div>
                </div>

                {showSOP && sop?.content && (
                    <SOPViewer
                        sop={{
                            id: 0,
                            content: sop.content,
                            created_at: "",
                            updated_at: sop.updated_at || "",
                        }}
                        workstationName={workstationName}
                        onClose={() => setShowSOP(false)}
                    />
                )}
            </>
        );
    }

    return null;
}