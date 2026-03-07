"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useSessions } from "@/hooks/useSessions";
import { useWorkstations } from "@/hooks/useWorkstations";
import { useWorkers } from "@/hooks/useWorkers";
import { WorkSession } from "@/types/session";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Drawer from "@/components/ui/Drawer";
import { ManualSessionFormData, manualSessionSchema } from "@/validations/session.validation";
import ItemSearch from "@/components/shared/ItemSearch";

interface EditSessionDrawerProps {
    session: WorkSession | null;
    onClose: () => void;
}

const toDatetimeLocal = (iso: string) => {
    const date = new Date(iso);
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
};

export default function EditSessionDrawer({ session, onClose }: EditSessionDrawerProps) {
    const { updateSession, isUpdating } = useSessions();
    const { workstations } = useWorkstations();
    const { workers } = useWorkers();

    const { handleSubmit, control, reset, formState: { errors } } = useForm<ManualSessionFormData>({
        resolver: zodResolver(manualSessionSchema),
    });

    useEffect(() => {
        if (session) {
            reset({
                workstation: session.workstation,
                worker_ids: session.workers?.map(w => w.id) || [],
                start_time: toDatetimeLocal(session.start_time),
                end_time: session.end_time ? toDatetimeLocal(session.end_time) : "",
                quantity_produced: session.quantity_produced ?? undefined,
                notes: session.notes || "",
                item: session.item ?? null,
                quantity_rejected: session.quantity_rejected ?? undefined,
            });
        }
    }, [session, reset]);

    const workstationOptions = workstations?.map((w) => ({ value: String(w.id), label: w.name })) || [];
    const workerOptions = workers?.map((w) => ({ value: String(w.id), label: w.full_name })) || [];

    const onSubmit = async (data: ManualSessionFormData) => {
        if (!session) return;
        try {
            await updateSession({
                id: session.id,
                payload: {
                    start_time: new Date(data.start_time).toISOString(),
                    end_time: new Date(data.end_time).toISOString(),
                    quantity_produced: data.quantity_produced,
                    notes: data.notes,
                    item: data.item ?? null,
                    quantity_rejected: data.quantity_rejected ?? null,
                },
            });
            onClose();
        } catch {
            // errors handled by useSessions via addToast
        }
    };

    return (
        <Drawer
            isOpen={!!session}
            onClose={onClose}
            title="Edit Session"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">

                <div className="grid grid-cols-1 gap-4">
                    <Controller
                        name="workstation"
                        control={control}
                        render={({ field }) => (
                            <Select
                                label="Workstation"
                                options={workstationOptions}
                                selectedKeys={field.value ? [String(field.value)] : []}
                                onSelectionChange={(keys) => field.onChange(Number(Array.from(keys)[0]))}
                                error={errors.workstation?.message}
                            />
                        )}
                    />
                    <Controller
                        name="worker_ids"
                        control={control}
                        render={({ field }) => (
                            <Select
                                label="Workers"
                                selectionMode="multiple"
                                options={workerOptions}
                                selectedKeys={field.value?.map(String) || []}
                                onSelectionChange={(keys) =>
                                    field.onChange(Array.from(keys).map(Number))
                                }
                                error={errors.worker_ids?.message}
                            />
                        )}
                    />
                    <Controller
                        name="item"
                        control={control}
                        render={({ field }) => (
                            <ItemSearch
                                key="edit-item"
                                label="Item"
                                value={field.value ?? null}
                                onChange={field.onChange}
                                defaultLabel={session?.item_name ?? undefined}
                            />
                        )}
                    />
                    <Controller
                        name="start_time"
                        control={control}
                        render={({ field }) => (
                            <Input
                                label="Start Time"
                                type="datetime-local"
                                value={field.value || ""}
                                onChange={field.onChange}
                                error={errors.start_time?.message}
                            />
                        )}
                    />
                    <Controller
                        name="end_time"
                        control={control}
                        render={({ field }) => (
                            <Input
                                label="End Time"
                                type="datetime-local"
                                value={field.value || ""}
                                onChange={field.onChange}
                                error={errors.end_time?.message}
                            />
                        )}
                    />
                    <Controller
                        name="quantity_produced"
                        control={control}
                        render={({ field }) => (
                            <Input
                                label="Quantity Produced"
                                type="number"
                                placeholder="e.g. 120000"
                                value={field.value ? String(field.value) : ""}
                                onChange={field.onChange}
                                error={errors.quantity_produced?.message}
                            />
                        )}
                    />
                    {session?.status === "verified" && (
                        <Controller
                            name="quantity_rejected"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    label="Quantity Rejected"
                                    type="number"
                                    placeholder="e.g. 500"
                                    value={field.value ? String(field.value) : ""}
                                    onChange={field.onChange}
                                    error={errors.quantity_rejected?.message}
                                />
                            )}
                        />
                    )}
                    <Controller
                        name="notes"
                        control={control}
                        render={({ field }) => (
                            <Input
                                label="Notes"
                                placeholder="Optional notes"
                                value={field.value || ""}
                                onChange={field.onChange}
                                error={errors.notes?.message}
                            />
                        )}
                    />
                </div>

                <div className="flex gap-3 pt-4 border-t border-border">
                    <Button
                        type="button"
                        variant="bordered"
                        className="flex-1 rounded-none border-text text-text text-xs font-semibold uppercase tracking-widest"
                        onPress={onClose}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        isLoading={isUpdating}
                        className="flex-1 bg-text text-background rounded-none text-xs font-semibold uppercase tracking-widest hover:opacity-80 transition-opacity"
                    >
                        Save Changes
                    </Button>
                </div>

            </form>
        </Drawer>
    );
}