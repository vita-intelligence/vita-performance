import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { addToast } from "@heroui/react";
import { itemService } from "@/services/item.service";
import { CreateItemPayload, UpdateItemPayload } from "@/types/item";
import { getErrorMessage } from "@/lib/utils";

export const useItems = () => {
    const queryClient = useQueryClient();

    const { data: items, isLoading: isItemsLoading } = useQuery({
        queryKey: ['items'],
        queryFn: itemService.getAll,
        retry: false,
    });

    const { mutateAsync: createItem, isPending: isCreatingItem } = useMutation({
        mutationFn: (payload: CreateItemPayload) => itemService.create(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['items'] });
            addToast({ title: 'Item created', color: 'success', timeout: 3000 });
        },
        onError: (error) => addToast({
            title: 'Failed to create item',
            description: getErrorMessage(error),
            color: 'danger',
            timeout: 4000,
        }),
    });

    const { mutateAsync: updateItem, isPending: isUpdatingItem } = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: UpdateItemPayload }) =>
            itemService.update(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['items'] });
            addToast({ title: 'Item updated', color: 'success', timeout: 3000 });
        },
        onError: (error) => addToast({
            title: 'Failed to update item',
            description: getErrorMessage(error),
            color: 'danger',
            timeout: 4000,
        }),
    });

    const { mutateAsync: deleteItem, isPending: isDeletingItem } = useMutation({
        mutationFn: (id: number) => itemService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['items'] });
            addToast({ title: 'Item deleted', color: 'success', timeout: 3000 });
        },
        onError: (error) => addToast({
            title: 'Failed to delete item',
            description: getErrorMessage(error),
            color: 'danger',
            timeout: 4000,
        }),
    });

    return {
        items,
        isItemsLoading,
        createItem,
        isCreatingItem,
        updateItem,
        isUpdatingItem,
        deleteItem,
        isDeletingItem,
    };
};