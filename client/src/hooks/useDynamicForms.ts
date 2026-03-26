import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { addToast } from "@heroui/react";
import { dynamicFormService } from "@/services/dynamic-form.service";
import { DynamicForm, CreateFormPayload, UpdateFormPayload } from "@/types/dynamic-form";
import { PaginatedResponse } from "@/types/api";
import { getErrorMessage } from "@/lib/utils";

const FORMS_KEY = ["dynamic-forms"];

export const useDynamicForms = () => {
    const queryClient = useQueryClient();

    const { data: forms, isLoading } = useQuery({
        queryKey: FORMS_KEY,
        queryFn: dynamicFormService.getAll,
    });

    // Paginated — for list page
    const {
        data: paginatedData,
        isLoading: isPaginatedLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfiniteQuery({
        queryKey: [...FORMS_KEY, "paginated"],
        queryFn: ({ pageParam = 1 }) => dynamicFormService.getPaginated(pageParam),
        getNextPageParam: (lastPage: PaginatedResponse<DynamicForm>) => {
            if (!lastPage.next) return undefined;
            const url = new URL(lastPage.next);
            return Number(url.searchParams.get("page"));
        },
        initialPageParam: 1,
        retry: false,
    });

    const paginatedForms = paginatedData?.pages.flatMap((page) => page?.results ?? []) ?? [];

    const createMutation = useMutation({
        mutationFn: (payload: CreateFormPayload) => dynamicFormService.create(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: FORMS_KEY });
            addToast({ title: "Form created", color: "success", timeout: 3000 });
        },
        onError: (error) => {
            addToast({
                title: "Failed to create form",
                description: getErrorMessage(error),
                color: "danger",
                timeout: 4000,
            });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: UpdateFormPayload }) =>
            dynamicFormService.update(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: FORMS_KEY });
            addToast({ title: "Form updated", color: "success", timeout: 3000 });
        },
        onError: (error) => {
            addToast({
                title: "Failed to update form",
                description: getErrorMessage(error),
                color: "danger",
                timeout: 4000,
            });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => dynamicFormService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: FORMS_KEY });
            addToast({ title: "Form deleted", color: "success", timeout: 3000 });
        },
        onError: (error) => {
            addToast({
                title: "Failed to delete form",
                description: getErrorMessage(error),
                color: "danger",
                timeout: 4000,
            });
        },
    });

    return {
        forms,
        isLoading,
        paginatedForms,
        isPaginatedLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        createForm: createMutation.mutateAsync,
        updateForm: updateMutation.mutateAsync,
        deleteForm: deleteMutation.mutateAsync,
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
    };
};