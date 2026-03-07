"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { kioskService } from "@/services/kiosk.service";
import { KioskWorker } from "@/types/kiosk";

interface PinPadProps {
    token: string;
    worker: KioskWorker;
    onSuccess: (worker: { id: number; name: string }, pin: string) => void;
    onCancel: () => void;
}

export default function PinPad({ token, worker, onSuccess, onCancel }: PinPadProps) {
    const [pin, setPin] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleKey = async (key: string) => {
        if (key === "DEL") {
            setPin((p) => p.slice(0, -1));
            setError("");
            return;
        }

        const next = pin + key;
        setPin(next);
        setError("");

        if (next.length === 4) {
            setIsLoading(true);
            try {
                const result = await kioskService.verifyPin(token, worker.id, next);
                onSuccess(result, next);
            } catch {
                setError("Incorrect PIN. Try again.");
                setPin("");
            } finally {
                setIsLoading(false);
            }
        }
    };

    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "DEL"];

    return (
        <div className="flex flex-col h-full px-6 py-8 gap-8 max-w-sm mx-auto w-full">
            <div className="flex flex-col gap-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted">Enter PIN for</p>
                <p className="text-3xl font-black text-text uppercase">{worker.name}</p>
            </div>

            {/* Dots */}
            <div className="flex items-center justify-center gap-6">
                {[0, 1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className={`w-5 h-5 rounded-full border-2 transition-all duration-150 ${i < pin.length ? "bg-text border-text scale-110" : "bg-background border-border"
                            }`}
                    />
                ))}
            </div>

            {error && (
                <p className="text-sm text-error font-semibold uppercase tracking-widest text-center">{error}</p>
            )}

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-3 flex-1">
                {keys.map((key, i) => (
                    <Button
                        key={i}
                        onPress={() => key && handleKey(key)}
                        isDisabled={isLoading || !key || pin.length === 4}
                        variant="bordered"
                        className={`h-16 text-2xl font-black rounded-none transition-colors ${key === "DEL"
                            ? "border-border text-error hover:bg-error hover:text-background text-base"
                            : key
                                ? "border-border text-text hover:bg-surface"
                                : "border-transparent pointer-events-none opacity-0"
                            }`}
                    >
                        {key}
                    </Button>
                ))}
            </div>

            <Button
                onPress={onCancel}
                variant="light"
                className="text-xs font-semibold uppercase tracking-widest text-muted hover:text-text rounded-none"
            >
                Cancel
            </Button>
        </div>
    );
}