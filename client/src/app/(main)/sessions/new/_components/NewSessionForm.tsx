"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useRouter } from "next/navigation";
import {
    liveSessionSchema,
    manualSessionSchema,
    LiveSessionFormData,
    ManualSessionFormData,
} from "@/validations/session.validation";
import { useSessions } from "@/hooks/useSessions";
import { useWorkstations } from "@/hooks/useWorkstations";
import { useWorkers } from "@/hooks/useWorkers";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import ItemSearch from "@/components/shared/ItemSearch";

export default function NewSessionForm() {
    const router = useRouter();
    const { createSession, startSession, isCreating, isStarting } = useSessions();
    const { workstations } = useWorkstations();
    const { workers } = useWorkers();
    const formRef = useRef<HTMLFormElement>(null);
    const [mode, setMode] = useState<"live" | "manual">("live");

    useEffect(() => {
        gsap.fromTo(formRef.current,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.6, delay: 0.15, ease: "power3.out" }
        );
    }, []);

    const liveForm = useForm<LiveSessionFormData>({
        resolver: zodResolver(liveSessionSchema),
    });

    const manualForm = useForm<ManualSessionFormData>({
        resolver: zodResolver(manualSessionSchema),
    });

    const workstationOptions = workstations?.map((w) => ({ value: String(w.id), label: w.name })) || [];
    const workerOptions = workers?.map((w) => ({ value: String(w.id), label: w.full_name })) || [];

    const onLiveSubmit = async (data: LiveSessionFormData) => {
        try {
            await startSession({
                workstation: data.workstation,
                worker_ids: data.worker_ids,
                item: data.item ?? null,
            });

            router.push("/sessions/active");
        } catch {
            // handled by hook
        }
    };

    const onManualSubmit = async (data: ManualSessionFormData) => {
        try {
            await createSession({
                workstation: data.workstation,
                worker_ids: data.worker_ids,
                status: "completed",
                start_time: new Date(data.start_time).toISOString(),
                end_time: new Date(data.end_time).toISOString(),
                quantity_produced: data.quantity_produced,
                item: data.item ?? null,
                notes: data.notes,
            });

            router.push("/sessions");
        } catch {
            // handled by hook
        }
    };

    return (
        <form
            ref={formRef}
            onSubmit={mode === "live"
                ? liveForm.handleSubmit(onLiveSubmit)
                : manualForm.handleSubmit(onManualSubmit)
            }
            className="flex flex-col gap-8 max-w-2xl"
        >

            {/* Mode Toggle */}
            <div className="flex border border-border">
                <button
                    type="button"
                    onClick={() => setMode("live")}
                    className={`flex-1 py-3 text-xs font-semibold uppercase tracking-widest transition-colors ${mode === "live"
                        ? "bg-text text-background"
                        : "bg-background text-muted hover:text-text"
                        }`}
                >
                    Live Tracking
                </button>
                <button
                    type="button"
                    onClick={() => setMode("manual")}
                    className={`flex-1 py-3 text-xs font-semibold uppercase tracking-widest transition-colors ${mode === "manual"
                        ? "bg-text text-background"
                        : "bg-background text-muted hover:text-text"
                        }`}
                >
                    Manual Entry
                </button>
            </div>

            {/* Workstation + Worker */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted whitespace-nowrap">
                        Assignment
                    </p>
                    <div className="h-px bg-border flex-1" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {mode === "live" ? (
                        <>
                            <Controller
                                name="workstation"
                                control={liveForm.control}
                                render={({ field }) => (
                                    <Select
                                        key="live-workstation"
                                        label="Workstation"
                                        options={workstationOptions}
                                        selectedKeys={field.value ? [String(field.value)] : []}
                                        onSelectionChange={(keys) => field.onChange(Number(Array.from(keys)[0]))}
                                        error={liveForm.formState.errors.workstation?.message}
                                    />
                                )}
                            />
                            <Controller
                                name="item"
                                control={liveForm.control}
                                render={({ field }) => (
                                    <ItemSearch
                                        key="live-item"
                                        value={field.value}
                                        onChange={field.onChange}
                                        error={liveForm.formState.errors.item?.message}
                                    />
                                )}
                            />
                            <Controller
                                name="worker_ids"
                                control={liveForm.control}
                                render={({ field }) => (
                                    <Select
                                        key="live-worker"
                                        label="Workers"
                                        selectionMode="multiple"
                                        options={workerOptions}
                                        selectedKeys={field.value?.map(String) ?? []}
                                        onSelectionChange={(keys) =>
                                            field.onChange(
                                                Array.from(keys).map((key) => Number(key))
                                            )
                                        }
                                        error={liveForm.formState.errors.worker_ids?.message}
                                    />
                                )}
                            />
                        </>
                    ) : (
                        <>
                            <Controller
                                key="manual-workstation"
                                name="workstation"
                                control={manualForm.control}
                                render={({ field }) => (
                                    <Select
                                        label="Workstation"
                                        options={workstationOptions}
                                        selectedKeys={field.value ? [String(field.value)] : []}
                                        onSelectionChange={(keys) => field.onChange(Number(Array.from(keys)[0]))}
                                        error={manualForm.formState.errors.workstation?.message}
                                    />
                                )}
                            />
                            <Controller
                                name="item"
                                control={manualForm.control}
                                render={({ field }) => (
                                    <ItemSearch
                                        key="manual-item"
                                        value={field.value}
                                        onChange={field.onChange}
                                        error={manualForm.formState.errors.item?.message}
                                    />
                                )}
                            />
                            <Controller
                                key="manual-worker"
                                name="worker_ids"
                                control={manualForm.control}
                                render={({ field }) => (
                                    <Select
                                        label="Workers"
                                        selectionMode="multiple"
                                        options={workerOptions}
                                        selectedKeys={field.value?.map(String) ?? []}
                                        onSelectionChange={(keys) =>
                                            field.onChange(
                                                Array.from(keys).map((key) => Number(key))
                                            )
                                        }
                                        error={manualForm.formState.errors.worker_ids?.message}
                                    />
                                )}
                            />
                        </>
                    )}
                </div>
            </div>

            {/* Manual Entry Fields */}
            {mode === "manual" && (
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted whitespace-nowrap">
                            Session Details
                        </p>
                        <div className="h-px bg-border flex-1" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Controller
                            name="start_time"
                            control={manualForm.control}
                            render={({ field }) => (
                                <Input
                                    label="Start Time"
                                    type="datetime-local"
                                    value={field.value || ""}
                                    onChange={field.onChange}
                                    error={manualForm.formState.errors.start_time?.message}
                                />
                            )}
                        />
                        <Controller
                            name="end_time"
                            control={manualForm.control}
                            render={({ field }) => (
                                <Input
                                    label="End Time"
                                    type="datetime-local"
                                    value={field.value || ""}
                                    onChange={field.onChange}
                                    error={manualForm.formState.errors.end_time?.message}
                                />
                            )}
                        />
                        <Controller
                            name="quantity_produced"
                            control={manualForm.control}
                            render={({ field }) => (
                                <Input
                                    label="Quantity Produced"
                                    type="number"
                                    placeholder="e.g. 120000"
                                    value={field.value ? String(field.value) : ""}
                                    onChange={field.onChange}
                                    error={manualForm.formState.errors.quantity_produced?.message}
                                />
                            )}
                        />
                        <Controller
                            name="notes"
                            control={manualForm.control}
                            render={({ field }) => (
                                <Input
                                    label="Notes"
                                    placeholder="Optional notes"
                                    value={field.value || ""}
                                    onChange={field.onChange}
                                    error={manualForm.formState.errors.notes?.message}
                                />
                            )}
                        />
                    </div>
                </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-border">
                <Button
                    type="button"
                    variant="bordered"
                    className="flex-1 rounded-none border-text text-text text-xs font-semibold uppercase tracking-widest"
                    onPress={() => router.back()}
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    isLoading={isCreating || isStarting}
                    className="flex-1 bg-text text-background rounded-none text-xs font-semibold uppercase tracking-widest hover:opacity-80 transition-opacity"
                >
                    {mode === "live" ? "Start Session" : "Log Session"}
                </Button>
            </div>

        </form>
    );
}