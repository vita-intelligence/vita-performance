"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { workstationSchema, WorkstationFormData } from "@/validations/workstation.validation";
import { useWorkstations } from "@/hooks/useWorkstations";
import { Workstation } from "@/types/workstation";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { WEEK_STARTS } from "@/constants/settings.constants";
import { FileText } from "lucide-react";
import SOPEditor from "@/components/shared/SOPEditor";

interface WorkstationFormProps {
    workstation?: Workstation;
    onClose: () => void;
}

export default function WorkstationForm({ workstation, onClose }: WorkstationFormProps) {
    const { createWorkstation, updateWorkstation, isCreating, isUpdating } = useWorkstations();
    const isEditing = !!workstation;

    const { register, handleSubmit, reset, control, formState: { errors } } = useForm<WorkstationFormData>({
        resolver: zodResolver(workstationSchema),
    });

    useEffect(() => {
        if (workstation) {
            reset({
                name: workstation.name,
                description: workstation.description || "",
                target_quantity: workstation.target_quantity ?? undefined,
                target_duration: workstation.target_duration ?? undefined,
                working_hours_per_day: workstation.working_hours_per_day ?? undefined,
                overtime_threshold: workstation.overtime_threshold ?? undefined,
                overtime_multiplier: workstation.overtime_multiplier ?? undefined,
                week_starts_on: workstation.week_starts_on ?? undefined,
            });
        } else {
            reset({});
        }
    }, [workstation, reset]);

    const onSubmit = async (data: WorkstationFormData) => {
        const payload = Object.fromEntries(
            Object.entries(data).filter(([, v]) => v !== "" && v !== undefined)
        ) as WorkstationFormData;

        try {
            if (isEditing) {
                await updateWorkstation({ id: workstation.id, payload });
            } else {
                await createWorkstation(payload);
            }
            onClose();
        } catch {
            // errors handled by useWorkstations via addToast
        }
    };

    const [showSOPEditor, setShowSOPEditor] = useState(false);

    return (
        <>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">

                <Input
                    label="Name"
                    placeholder="e.g. Assembly Line A"
                    error={errors.name?.message}
                    {...register("name")}
                />

                <Input
                    label="Description"
                    placeholder="Optional description"
                    hint="A short description to help identify this workstation."
                    error={errors.description?.message}
                    {...register("description")}
                />

                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-4">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted whitespace-nowrap">
                            Expected Output
                        </p>
                        <div className="h-px bg-border flex-1" />
                    </div>
                    <p className="text-xs text-muted">
                        Standard baseline output for this workstation. Used to calculate performance.
                    </p>
                </div>

                <Input
                    label="Target Quantity"
                    type="number"
                    placeholder="e.g. 120000"
                    hint="How many units this workstation is expected to produce."
                    error={errors.target_quantity?.message}
                    {...register("target_quantity")}
                />

                <Input
                    label="Target Duration (hours)"
                    type="number"
                    placeholder="e.g. 5"
                    hint="How many hours it should take to reach the target quantity."
                    error={errors.target_duration?.message}
                    {...register("target_duration")}
                />

                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-4">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted whitespace-nowrap">
                            Overrides
                        </p>
                        <div className="h-px bg-border flex-1" />
                    </div>
                    <p className="text-xs text-muted">
                        Leave all fields blank to inherit from your global settings.
                    </p>
                </div>

                <Input
                    label="Working Hours Per Day"
                    type="number"
                    placeholder="e.g. 8"
                    hint="How many hours a full shift lasts at this workstation. Leave blank to use global settings."
                    error={errors.working_hours_per_day?.message}
                    {...register("working_hours_per_day")}
                />

                <Input
                    label="Overtime After (hours)"
                    type="number"
                    placeholder="e.g. 8"
                    hint="Hours worked beyond this threshold will be counted as overtime. Leave blank to use global settings."
                    error={errors.overtime_threshold?.message}
                    {...register("overtime_threshold")}
                />

                <Input
                    label="Overtime Multiplier"
                    type="number"
                    placeholder="e.g. 1.5"
                    hint="Salary multiplier applied to overtime hours. E.g. 1.5 means time and a half. Leave blank to use global settings."
                    error={errors.overtime_multiplier?.message}
                    {...register("overtime_multiplier")}
                />

                <div className="flex flex-col gap-1">
                    <Controller
                        name="week_starts_on"
                        control={control}
                        render={({ field }) => (
                            <Select
                                label="Week Starts On"
                                options={WEEK_STARTS}
                                selectedKeys={field.value ? [field.value] : []}
                                onSelectionChange={(keys) => field.onChange(Array.from(keys)[0] || undefined)}
                                error={errors.week_starts_on?.message}
                            />
                        )}
                    />
                    <p className="text-xs text-muted px-1">
                        First day of the work week for this workstation. Leave blank to use global settings.
                    </p>
                </div>

                {isEditing && (
                    <button
                        type="button"
                        onClick={() => setShowSOPEditor(true)}
                        className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted hover:text-text transition-colors py-3 border border-border hover:border-text px-4 w-full justify-center"
                    >
                        <FileText size={14} />
                        Edit SOP
                    </button>
                )}

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
                        isLoading={isCreating || isUpdating}
                        className="flex-1 bg-text text-background rounded-none text-xs font-semibold uppercase tracking-widest hover:opacity-80 transition-opacity"
                    >
                        {isEditing ? "Save Changes" : "Create"}
                    </Button>
                </div>

            </form>
            {showSOPEditor && workstation && (
                <SOPEditor
                    workstationId={workstation.id}
                    workstationName={workstation.name}
                    onClose={() => setShowSOPEditor(false)}
                />
            )}
        </>
    );
}