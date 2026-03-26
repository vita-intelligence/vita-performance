"use client";

import { useState, useEffect } from "react";
import { Button } from "@heroui/react";
import { FileText } from "lucide-react";
import { KioskActiveSession, KioskWorker } from "@/types/kiosk";
import PinPad from "./PinPad";
import SOPViewer from "@/components/shared/SOPViewer";

type StopStep = "confirm" | "pin" | "quantity";

interface KioskActiveProps {
    token: string;
    session: KioskActiveSession;
    workers: KioskWorker[];
    onStop: (workerId: number, pin: string, quantity: number, notes: string) => void;
    sop: { content: string; updated_at: string | null } | null;
    isSOPLoading: boolean;
    onFetchSOP: () => void;
    workstationName: string;
    isSubmitting?: boolean;
}

export default function KioskActive({
    token,
    session,
    workers,
    onStop,
    sop,
    isSOPLoading,
    onFetchSOP,
    workstationName,
    isSubmitting,
}: KioskActiveProps) {
    const [elapsed, setElapsed] = useState("");
    const [stopping, setStopping] = useState(false);
    const [stopStep, setStopStep] = useState<StopStep>("confirm");
    const [selectedWorker, setSelectedWorker] = useState<KioskWorker | null>(null);
    const [verifiedPin, setVerifiedPin] = useState("");
    const [quantity, setQuantity] = useState("");
    const [notes, setNotes] = useState("");
    const [showSOP, setShowSOP] = useState(false);

    useEffect(() => {
        const calc = () => {
            const diff = Math.floor((Date.now() - new Date(session.start_time).getTime()) / 1000);
            const h = Math.floor(diff / 3600);
            const m = Math.floor((diff % 3600) / 60);
            const s = diff % 60;
            setElapsed(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
        };
        calc();
        const interval = setInterval(calc, 1000);
        return () => clearInterval(interval);
    }, [session.start_time]);

    const sessionWorkers = workers.filter((w) => session.workers.find((sw) => sw.id === w.id));

    const handlePinSuccess = (_worker: { id: number; name: string }, pin: string) => {
        setVerifiedPin(pin);
        setStopStep("quantity");
    };

    const handleStop = () => {
        if (!selectedWorker || !quantity) return;
        onStop(selectedWorker.id, verifiedPin, Number(quantity), notes);
    };

    const handleCancelStop = () => {
        setStopping(false);
        setStopStep("confirm");
        setSelectedWorker(null);
        setVerifiedPin("");
        setQuantity("");
        setNotes("");
    };

    const handleSOPPress = () => {
        onFetchSOP();
        setShowSOP(true);
    };

    if (!stopping) {
        return (
            <>
                <div className="flex flex-col h-full">
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 sm:gap-8 p-4 sm:p-8">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-success animate-pulse" />
                            <p className="text-xs font-semibold uppercase tracking-widest text-success">Session Active</p>
                        </div>

                        <p className="font-mono text-5xl sm:text-7xl md:text-8xl font-black text-text tracking-widest">{elapsed}</p>

                        {session.item_name && (
                            <div className="flex flex-col items-center gap-1">
                                <p className="text-xs font-semibold uppercase tracking-widest text-muted">Item</p>
                                <p className="text-lg sm:text-2xl font-black text-text uppercase">{session.item_name}</p>
                            </div>
                        )}

                        <div className="flex flex-col items-center gap-2">
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Workers</p>
                            <div className="flex gap-2 flex-wrap justify-center">
                                {session.workers.map((w) => (
                                    <span
                                        key={w.id}
                                        className="px-3 py-1.5 border border-success text-success text-xs sm:text-sm font-semibold uppercase tracking-widest"
                                    >
                                        {w.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t border-border flex flex-col gap-2 shrink-0">
                        {sop?.content && (
                            <Button
                                onPress={handleSOPPress}
                                isLoading={isSOPLoading}
                                variant="bordered"
                                className="w-full h-10 sm:h-12 rounded-none border-border text-muted text-xs font-semibold uppercase tracking-widest hover:border-text hover:text-text"
                                startContent={!isSOPLoading ? <FileText size={14} /> : undefined}
                            >
                                View SOP
                            </Button>
                        )}
                        <Button
                            onPress={() => setStopping(true)}
                            variant="bordered"
                            className="w-full h-12 sm:h-14 rounded-none border-2 border-error text-error text-sm font-black uppercase tracking-widest hover:bg-error hover:text-background"
                        >
                            Stop Session
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

    return (
        <div className="flex flex-col h-full">
            <div className="px-4 pt-6 pb-4 border-b border-border flex items-center justify-between shrink-0">
                <h2 className="text-xl sm:text-2xl font-black text-text uppercase">Stop Session</h2>
                <Button
                    onPress={handleCancelStop}
                    variant="light"
                    className="text-xs font-semibold uppercase tracking-widest text-muted hover:text-text rounded-none"
                >
                    Cancel
                </Button>
            </div>

            <div className="flex-1 flex flex-col justify-center">
                {stopStep === "confirm" && (
                    <div className="p-4 flex flex-col gap-3">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                            Who is stopping the session?
                        </p>
                        {sessionWorkers.map((w) => (
                            <Button
                                key={w.id}
                                onPress={() => { setSelectedWorker(w); setStopStep("pin"); }}
                                variant="bordered"
                                className="w-full justify-start px-4 h-12 sm:h-16 text-base sm:text-lg font-black uppercase tracking-wide rounded-none border-border text-text hover:border-text hover:bg-surface"
                            >
                                {w.name}
                            </Button>
                        ))}
                    </div>
                )}

                {stopStep === "pin" && selectedWorker && (
                    <PinPad
                        token={token}
                        worker={selectedWorker}
                        onSuccess={handlePinSuccess}
                        onCancel={() => setStopStep("confirm")}
                    />
                )}

                {stopStep === "quantity" && (
                    <div className="p-4 flex flex-col gap-4">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                            How many units were produced?
                        </p>
                        <input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            placeholder="0"
                            className="text-4xl sm:text-5xl font-black text-text bg-transparent border-b-2 border-border focus:border-text outline-none pb-2 w-full"
                            autoFocus
                        />
                        <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Notes (optional)"
                            className="text-sm text-text bg-transparent border-b border-border focus:border-text outline-none pb-2 w-full"
                        />
                        <div className="flex flex-col gap-2 mt-2">
                            <Button
                                onPress={handleStop}
                                isDisabled={!quantity || isSubmitting}
                                isLoading={isSubmitting}
                                className="w-full h-12 sm:h-14 bg-error text-background text-sm font-black uppercase tracking-widest hover:opacity-80 rounded-none disabled:opacity-30"
                            >
                                Complete Session
                            </Button>
                            <Button
                                onPress={() => setStopStep("pin")}
                                variant="bordered"
                                className="w-full h-10 sm:h-12 rounded-none border-border text-muted text-xs font-semibold uppercase tracking-widest hover:border-text hover:text-text"
                            >
                                Back
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}