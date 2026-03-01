"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { groupSchema, GroupFormData } from "@/validations/worker.validation";
import { useWorkers } from "@/hooks/useWorkers";
import { WorkerGroup } from "@/types/worker";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

interface GroupFormProps {
    group?: WorkerGroup;
    onClose: () => void;
}

export default function GroupForm({ group, onClose }: GroupFormProps) {
    const { createGroup, updateGroup, isCreatingGroup, isUpdatingGroup } = useWorkers();
    const isEditing = !!group;

    const { register, handleSubmit, reset, formState: { errors } } = useForm<GroupFormData>({
        resolver: zodResolver(groupSchema),
    });

    useEffect(() => {
        if (group) {
            reset({
                name: group.name,
                description: group.description || "",
            });
        } else {
            reset({});
        }
    }, [group, reset]);

    const onSubmit = async (data: GroupFormData) => {
        try {
            if (isEditing) {
                await updateGroup({ id: group.id, payload: data });
            } else {
                await createGroup(data);
            }
            onClose();
        } catch {
            // errors handled by useWorkers via addToast
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">

            <Input
                label="Name"
                placeholder="e.g. Assembly Team"
                error={errors.name?.message}
                {...register("name")}
            />

            <Input
                label="Description"
                placeholder="Optional description"
                hint="A short description of what this group does."
                error={errors.description?.message}
                {...register("description")}
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
                    isLoading={isCreatingGroup || isUpdatingGroup}
                    className="flex-1 bg-text text-background rounded-none text-xs font-semibold uppercase tracking-widest hover:opacity-80 transition-opacity"
                >
                    {isEditing ? "Save Changes" : "Create"}
                </Button>
            </div>

        </form>
    );
}