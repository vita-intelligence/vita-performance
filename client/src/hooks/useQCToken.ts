import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { addToast } from "@heroui/react";
import { qcDashboardService } from "@/services/qc.service";

const QC_TOKEN_KEY = ["qc", "token"];

export const useQCToken = () => {
    const queryClient = useQueryClient();

    const { data: token, isLoading } = useQuery({
        queryKey: QC_TOKEN_KEY,
        queryFn: qcDashboardService.getToken,
    });

    const regenerateMutation = useMutation({
        mutationFn: qcDashboardService.regenerateToken,
        onSuccess: (newToken) => {
            queryClient.setQueryData(QC_TOKEN_KEY, newToken);
            addToast({ title: "QC link regenerated", color: "success", timeout: 3000 });
        },
        onError: () => {
            addToast({ title: "Failed to regenerate QC link", color: "danger", timeout: 4000 });
        },
    });

    return {
        token,
        isLoading,
        regenerateToken: regenerateMutation.mutateAsync,
        isRegenerating: regenerateMutation.isPending,
    };
};