"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { z } from "zod";
import { useDynamicForms } from "@/hooks/useDynamicForms";
import { useWorkstations } from "@/hooks/useWorkstations";
import { DynamicForm } from "@/types/dynamic-form";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Drawer from "@/components/ui/Drawer";
import { Switch } from "@heroui/react";

const schema = z.object({
    name: z.string().min(1, "Name is required").max(200),
    trigger: z.enum(["start", "end", "both"]),
    workstation: z.coerce.number().optional().nullable(),
    is_active: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

interface FormSettingsDrawerProps {
    form?: DynamicForm;
    isOpen: boolean;
    onClose: () => void;
}

export default function FormSettingsDrawer({ form, isOpen, onClose }: FormSettingsDrawerProps) {
    const { createForm, updateForm, isCreating, isUpdating } = useDynamicForms();
    const { workstations } = useWorkstations();
    const isEditing = !!form;

    const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
    });

    useEffect(() => {
        if (form) {
            reset({
                name: form.name,
                trigger: form.trigger,
                workstation: form.workstation ?? null,
                is_active: form.is_active,
            });
        } else {
            reset({
                name: "",
                trigger: "start",
                workstation: null,
                is_active: true,
            });
        }
    }, [form, reset]);

    const workstationOptions = [
        { value: "", label: "All workstations" },
        ...(workstations?.map((w) => ({ value: String(w.id), label: w.name })) || []),
    ];

    const triggerOptions = [
        { value: "start", label: "Session Start" },
        { value: "end", label: "Session End" },
        { value: "both", label: "Both" },
    ];

    const onSubmit = async (data: FormData) => {
        try {
            const payload = {
                name: data.name,
                trigger: data.trigger,
                workstation: data.workstation || null,
                is_active: data.is_active ?? true,
                schema: form?.schema || {},
            };
            if (isEditing) {
                await updateForm({ id: form.id, payload });
            } else {
                await createForm(payload);
            }
            onClose();
        } catch {
            // handled by hook
        }
    };

    return (
        <Drawer
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? "Edit Form" : "New Form"}
        >
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
                <Input
                    label="Form Name"
                    placeholder="e.g. Pre-session Safety Check"
                    error={errors.name?.message}
                    {...register("name")}
                />

                <Controller
                    name="trigger"
                    control={control}
                    render={({ field }) => (
                        <Select
                            label="When to show"
                            options={triggerOptions}
                            selectedKeys={field.value ? [field.value] : ["start"]}
                            onSelectionChange={(keys) => field.onChange(Array.from(keys)[0])}
                            error={errors.trigger?.message}
                        />
                    )}
                />

                <Controller
                    name="workstation"
                    control={control}
                    render={({ field }) => (
                        <Select
                            label="Workstation"
                            options={workstationOptions}
                            selectedKeys={field.value ? [String(field.value)] : [""]}
                            onSelectionChange={(keys) => {
                                const val = Array.from(keys)[0];
                                field.onChange(val ? Number(val) : null);
                            }}
                        />
                    )}
                />

                <Controller
                    name="is_active"
                    control={control}
                    render={({ field }) => (
                        <div className="flex items-center justify-between px-1">
                            <div className="flex flex-col gap-0.5">
                                <p className="text-sm font-semibold text-text">Active</p>
                                <p className="text-xs text-muted">Show this form on the kiosk.</p>
                            </div>
                            <Switch
                                isSelected={field.value ?? true}
                                onValueChange={field.onChange}
                            />
                        </div>
                    )}
                />

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
                        className="flex-1 bg-text text-background rounded-none text-xs font-semibold uppercase tracking-widest hover:opacity-80"
                    >
                        {isEditing ? "Save Changes" : "Create"}
                    </Button>
                </div>
            </form>
        </Drawer>
    );
}