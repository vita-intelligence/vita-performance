import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { addToast } from "@heroui/react";
import { dynamicFormService } from "@/services/dynamic-form.service";
import { CreateFormPayload, UpdateFormPayload } from "@/types/dynamic-form";
import { getErrorMessage } from "@/lib/utils";

const FORMS_KEY = ["dynamic-forms"];

export const useDynamicForms = () => {
    const queryClient = useQueryClient();

    const { data: forms, isLoading } = useQuery({
        queryKey: FORMS_KEY,
        queryFn: dynamicFormService.getAll,
    });

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
        createForm: createMutation.mutateAsync,
        updateForm: updateMutation.mutateAsync,
        deleteForm: deleteMutation.mutateAsync,
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
    };
};