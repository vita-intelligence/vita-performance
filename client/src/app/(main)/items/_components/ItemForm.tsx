"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { itemSchema, ItemFormData } from "@/validations/item.validation";
import { useItems } from "@/hooks/useItems";
import { Item } from "@/types/item";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

interface ItemFormProps {
    item?: Item;
    onClose: () => void;
}

export default function ItemForm({ item, onClose }: ItemFormProps) {
    const { createItem, updateItem, isCreatingItem, isUpdatingItem } = useItems();
    const isEditing = !!item;

    const { register, handleSubmit, reset, formState: { errors } } = useForm<ItemFormData>({
        resolver: zodResolver(itemSchema),
    });

    useEffect(() => {
        reset(item ? { name: item.name } : {});
    }, [item, reset]);

    const onSubmit = async (data: ItemFormData) => {
        try {
            if (isEditing) {
                await updateItem({ id: item.id, payload: data });
            } else {
                await createItem(data);
            }
            onClose();
        } catch {
            // handled by useItems
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
            <Input
                label="Name"
                placeholder="e.g. Widget A"
                error={errors.name?.message}
                {...register("name")}
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
                    isLoading={isCreatingItem || isUpdatingItem}
                    className="flex-1 bg-text text-background rounded-none text-xs font-semibold uppercase tracking-widest hover:opacity-80 transition-opacity"
                >
                    {isEditing ? "Save Changes" : "Create"}
                </Button>
            </div>
        </form>
    );
}