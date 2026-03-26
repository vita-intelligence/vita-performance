import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { addToast } from "@heroui/react";
import { itemService } from "@/services/item.service";
import { Item, CreateItemPayload, UpdateItemPayload } from "@/types/item";
import { PaginatedResponse } from "@/types/api";
import { getErrorMessage } from "@/lib/utils";

const ITEMS_KEY = ["items"];

export const useItems = (search?: string) => {
    const queryClient = useQueryClient();

    const {
        data: itemsData,
        isLoading: isItemsLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfiniteQuery({
        queryKey: [...ITEMS_KEY, { search }],
        queryFn: ({ pageParam = 1 }) => itemService.getAll(pageParam, search),
        getNextPageParam: (lastPage: PaginatedResponse<Item>) => {
            if (!lastPage.next) return undefined;
            const url = new URL(lastPage.next);
            return Number(url.searchParams.get("page"));
        },
        initialPageParam: 1,
        retry: false,
    });

    const items = itemsData?.pages.flatMap((page) => page?.results ?? []) ?? [];

    const { mutateAsync: createItem, isPending: isCreatingItem } = useMutation({
        mutationFn: (payload: CreateItemPayload) => itemService.create(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ITEMS_KEY });
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
            queryClient.invalidateQueries({ queryKey: ITEMS_KEY });
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
            queryClient.invalidateQueries({ queryKey: ITEMS_KEY });
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
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        createItem,
        isCreatingItem,
        updateItem,
        isUpdatingItem,
        deleteItem,
        isDeletingItem,
    };
};
