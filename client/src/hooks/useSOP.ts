import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { addToast } from "@heroui/react";
import { workstationService } from "@/services/workstation.service";
import { getErrorMessage } from "@/lib/utils";

export const useSOP = (workstationId: number | null) => {
    const queryClient = useQueryClient();
    const SOP_KEY = ["sop", workstationId];

    const { data: sop, isLoading } = useQuery({
        queryKey: SOP_KEY,
        queryFn: () => workstationService.getSOP(workstationId!),
        enabled: !!workstationId,
        staleTime: 1000 * 60 * 5,
    });

    const updateMutation = useMutation({
        mutationFn: (content: string) => workstationService.updateSOP(workstationId!, content),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: SOP_KEY });
            addToast({ title: "SOP saved", color: "success", timeout: 3000 });
        },
        onError: (error) => {
            addToast({
                title: "Failed to save SOP",
                description: getErrorMessage(error),
                color: "danger",
                timeout: 4000,
            });
        },
    });

    return {
        sop,
        isLoading,
        updateSOP: updateMutation.mutateAsync,
        isUpdating: updateMutation.isPending,
    };
};