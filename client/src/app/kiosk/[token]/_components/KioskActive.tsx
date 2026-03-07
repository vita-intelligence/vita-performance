"use client";

import { useState, useEffect } from "react";
import { Button } from "@heroui/react";
import { KioskActiveSession, KioskWorker } from "@/types/kiosk";
import PinPad from "./PinPad";

type StopStep = "confirm" | "pin" | "quantity";

interface KioskActiveProps {
    token: string;
    session: KioskActiveSession;
    workers: KioskWorker[];
    onStop: (workerId: number, pin: string, quantity: number, notes: string) => void;
}

export default function KioskActive({ token, session, workers, onStop }: KioskActiveProps) {
    const [elapsed, setElapsed] = useState("");
    const [stopping, setStopping] = useState(false);
    const [stopStep, setStopStep] = useState<StopStep>("confirm");
    const [selectedWorker, setSelectedWorker] = useState<KioskWorker | null>(null);
    const [verifiedPin, setVerifiedPin] = useState("");
    const [quantity, setQuantity] = useState("");
    const [notes, setNotes] = useState("");

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

    // Active timer view
    if (!stopping) {
        return (
            <div className="flex flex-col h-full">
                {/* Timer */}
                <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-success animate-pulse" />
                        <p className="text-xs font-semibold uppercase tracking-widest text-success">Session Active</p>
                    </div>

                    <p className="font-mono text-7xl md:text-8xl font-black text-text tracking-widest">{elapsed}</p>

                    {session.item_name && (
                        <div className="flex flex-col items-center gap-1">
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Item</p>
                            <p className="text-2xl font-black text-text uppercase">{session.item_name}</p>
                        </div>
                    )}

                    <div className="flex flex-col items-center gap-3">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted">Workers</p>
                        <div className="flex gap-3 flex-wrap justify-center">
                            {session.workers.map((w) => (
                                <span
                                    key={w.id}
                                    className="px-4 py-2 border border-success text-success text-sm font-semibold uppercase tracking-widest"
                                >
                                    {w.name}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-border">
                    <Button
                        onPress={() => setStopping(true)}
                        variant="bordered"
                        className="w-full h-14 rounded-none border-2 border-error text-error text-sm font-black uppercase tracking-widest hover:bg-error hover:text-background"
                    >
                        Stop Session
                    </Button>
                </div>
            </div>
        );
    }

    // Stop flow
    return (
        <div className="flex flex-col h-full">
            <div className="px-6 pt-8 pb-6 border-b border-border flex items-center justify-between">
                <h2 className="text-2xl font-black text-text uppercase">Stop Session</h2>
                <Button
                    onPress={handleCancelStop}
                    variant="light"
                    className="text-xs font-semibold uppercase tracking-widest text-muted hover:text-text rounded-none"
                >
                    Cancel
                </Button>
            </div>

            <div className="flex-1 flex flex-col justify-center">

                {/* Step 1 — who is stopping */}
                {stopStep === "confirm" && (
                    <div className="p-6 flex flex-col gap-4">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                            Who is stopping the session?
                        </p>
                        {sessionWorkers.map((w) => (
                            <Button
                                key={w.id}
                                onPress={() => { setSelectedWorker(w); setStopStep("pin"); }}
                                variant="bordered"
                                className="w-full justify-start px-6 h-16 text-lg font-black uppercase tracking-wide rounded-none border-border text-text hover:border-text hover:bg-surface"
                            >
                                {w.name}
                            </Button>
                        ))}
                    </div>
                )}

                {/* Step 2 — PIN */}
                {stopStep === "pin" && selectedWorker && (
                    <PinPad
                        token={token}
                        worker={selectedWorker}
                        onSuccess={handlePinSuccess}
                        onCancel={() => setStopStep("confirm")}
                    />
                )}

                {/* Step 3 — quantity */}
                {stopStep === "quantity" && (
                    <div className="p-6 flex flex-col gap-6">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                            How many units were produced?
                        </p>
                        <input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            placeholder="0"
                            className="text-5xl font-black text-text bg-transparent border-b-2 border-border focus:border-text outline-none pb-2 w-full"
                            autoFocus
                        />
                        <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Notes (optional)"
                            className="text-sm text-text bg-transparent border-b border-border focus:border-text outline-none pb-2 w-full"
                        />
                        <div className="flex flex-col gap-3 mt-4">
                            <Button
                                onPress={handleStop}
                                isDisabled={!quantity}
                                className="w-full h-14 bg-error text-background text-sm font-black uppercase tracking-widest hover:opacity-80 rounded-none disabled:opacity-30"
                            >
                                Complete Session
                            </Button>
                            <Button
                                onPress={() => setStopStep("pin")}
                                variant="bordered"
                                className="w-full h-12 rounded-none border-border text-muted text-xs font-semibold uppercase tracking-widest hover:border-text hover:text-text"
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