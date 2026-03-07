"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { workerSchema, WorkerFormData } from "@/validations/worker.validation";
import { useWorkers } from "@/hooks/useWorkers";
import { Worker } from "@/types/worker";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { Switch } from "@heroui/react";

interface WorkerFormProps {
    worker?: Worker;
    onClose: () => void;
}

export default function WorkerForm({ worker, onClose }: WorkerFormProps) {
    const { createWorker, updateWorker, isCreatingWorker, isUpdatingWorker, groups } = useWorkers();
    const isEditing = !!worker;

    const { register, handleSubmit, reset, control, formState: { errors } } = useForm<WorkerFormData>({
        resolver: zodResolver(workerSchema),
    });

    useEffect(() => {
        if (worker) {
            reset({
                full_name: worker.full_name,
                hourly_rate: worker.hourly_rate,
                group: worker.group ?? undefined,
                is_qa: worker.is_qa ?? false,
            });
        } else {
            reset({});
        }
    }, [worker, reset]);

    const onSubmit = async (data: WorkerFormData) => {
        try {
            if (isEditing) {
                await updateWorker({ id: worker.id, payload: data });
            } else {
                await createWorker(data);
            }
            onClose();
        } catch {
            // errors handled by useWorkers via addToast
        }
    };

    const groupOptions = groups?.map((g) => ({ value: String(g.id), label: g.name })) || [];

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">

            <Input
                label="Full Name"
                placeholder="e.g. John Smith"
                error={errors.full_name?.message}
                {...register("full_name")}
            />

            <Input
                label="Hourly Rate"
                type="number"
                placeholder="e.g. 15.00"
                hint="Wage per hour in your account currency."
                error={errors.hourly_rate?.message}
                {...register("hourly_rate")}
            />

            <div className="flex flex-col gap-1">
                <Input
                    label={worker?.has_pin ? "Change PIN" : "Set PIN"}
                    type="password"
                    placeholder="4-digit PIN"
                    hint={worker?.has_pin ? "Leave blank to keep existing PIN." : "Required for kiosk access."}
                    maxLength={4}
                    error={errors.pin?.message}
                    {...register("pin")}
                />
                {worker?.has_pin && (
                    <div className="flex items-center gap-2 px-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-success" />
                        <p className="text-xs text-success">PIN is set</p>
                    </div>
                )}
            </div>

            <Controller
                name="is_qa"
                control={control}
                render={({ field }) => (
                    <div className="flex items-center justify-between px-1">
                        <div className="flex flex-col gap-0.5">
                            <p className="text-sm font-semibold text-text">QC Officer</p>
                            <p className="text-xs text-muted">Can access the Quality Control kiosk.</p>
                        </div>
                        <Switch
                            isSelected={field.value ?? false}
                            onValueChange={field.onChange}
                        />
                    </div>
                )}
            />

            <div className="flex flex-col gap-1">
                <Controller
                    name="group"
                    control={control}
                    render={({ field }) => (
                        <Select
                            label="Group"
                            options={[{ value: "", label: "No Group" }, ...groupOptions]}
                            selectedKeys={field.value ? [String(field.value)] : [""]}
                            onSelectionChange={(keys) => {
                                const val = Array.from(keys)[0];
                                field.onChange(val ? Number(val) : undefined);
                            }}
                            error={errors.group?.message}
                        />
                    )}
                />
                <p className="text-xs text-muted px-1">Assign this worker to a group. Optional.</p>
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
                    isLoading={isCreatingWorker || isUpdatingWorker}
                    className="flex-1 bg-text text-background rounded-none text-xs font-semibold uppercase tracking-widest hover:opacity-80 transition-opacity"
                >
                    {isEditing ? "Save Changes" : "Create"}
                </Button>
            </div>

        </form>
    );
}