"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { Loader2 } from "lucide-react";
import { Worker } from "@/types/worker";

interface PinKeypadProps {
    worker: Worker;
    isLoading: boolean;
    error: string | null;
    onSubmit: (pin: string) => Promise<void> | void;
    onCancel: () => void;
    /** True while the worker has no PIN on file — we let them clock
     *  in with a single tap and skip the keypad entirely. */
    skipPin?: boolean;
}

/**
 * Standalone PIN keypad used on the personal kiosk. Kept in its own
 * file (rather than reusing kiosk/[token]/_components/PinPad) because
 * that one is tightly coupled to a workstation token's verify-pin
 * endpoint — this one hands the entered PIN back to the parent for
 * the shift-start call.
 *
 * Auto-submits when 4 digits are entered so the flow feels snappy on
 * a shared tablet. `skipPin` short-circuits the keypad for legacy
 * workers with no PIN set.
 */
export default function PinKeypad({
    worker,
    isLoading,
    error,
    onSubmit,
    onCancel,
    skipPin,
}: PinKeypadProps) {
    const [pin, setPin] = useState("");
    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "DEL"];

    const handleKey = async (key: string) => {
        if (key === "") return;
        if (key === "DEL") {
            setPin((p) => p.slice(0, -1));
            return;
        }
        const next = pin + key;
        setPin(next);
        if (next.length === 4) {
            try {
                await onSubmit(next);
            } catch {
                setPin("");
            }
        }
    };

    if (skipPin) {
        return (
            <div className="mx-auto flex w-full max-w-sm flex-col gap-6 px-4 py-8">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                        Signing in as
                    </p>
                    <p className="mt-1 text-2xl font-black text-text">
                        {worker.full_name}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                        No PIN on file — tap Continue to open your dashboard.
                    </p>
                </div>
                {error && (
                    <p className="text-sm text-danger">{error}</p>
                )}
                <div className="flex flex-col gap-2">
                    <Button
                        color="primary"
                        size="lg"
                        isLoading={isLoading}
                        onPress={() => onSubmit("")}
                    >
                        Continue
                    </Button>
                    <Button variant="light" onPress={onCancel} isDisabled={isLoading}>
                        Cancel
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto flex w-full max-w-sm flex-col gap-6 px-4 py-8">
            <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                    Enter PIN for
                </p>
                <p className="mt-1 text-2xl font-black text-text uppercase">
                    {worker.full_name}
                </p>
            </div>

            <div className="flex items-center justify-center gap-4">
                {[0, 1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className={`size-4 rounded-full border-2 transition-all ${
                            i < pin.length
                                ? "bg-text border-text scale-110"
                                : "bg-background border-border"
                        }`}
                    />
                ))}
            </div>

            {error && (
                <p className="text-center text-sm text-danger">{error}</p>
            )}

            <div className="grid grid-cols-3 gap-3">
                {keys.map((k, idx) => (
                    <button
                        key={idx}
                        type="button"
                        disabled={isLoading || k === ""}
                        onClick={() => handleKey(k)}
                        className={`h-16 rounded-xl border border-border text-xl font-semibold transition-colors ${
                            k === ""
                                ? "invisible"
                                : "bg-background text-text hover:bg-surface active:bg-surface active:scale-95"
                        } ${isLoading ? "opacity-50" : ""}`}
                    >
                        {k === "DEL" ? "⌫" : k}
                    </button>
                ))}
            </div>

            <div className="flex justify-center pt-2">
                {isLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted">
                        <Loader2 className="size-4 animate-spin" />
                        Checking PIN…
                    </div>
                ) : (
                    <Button variant="light" size="sm" onPress={onCancel}>
                        Back to roster
                    </Button>
                )}
            </div>
        </div>
    );
}
