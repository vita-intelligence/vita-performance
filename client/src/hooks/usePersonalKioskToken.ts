import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addToast } from "@heroui/react";
import { personalKioskDashboardService } from "@/services/personal-kiosk.service";

const PERSONAL_KIOSK_TOKEN_KEY = ["personal-kiosk", "token"];

/**
 * Mirrors `useQCToken` — fetches / regenerates the tenant's personal-
 * kiosk pairing token. Regenerate invalidates every tablet paired to
 * the old token (they'll start seeing "Invalid kiosk link").
 */
export const usePersonalKioskToken = () => {
    const queryClient = useQueryClient();

    const { data: token, isLoading } = useQuery({
        queryKey: PERSONAL_KIOSK_TOKEN_KEY,
        queryFn: personalKioskDashboardService.getToken,
    });

    const regenerateMutation = useMutation({
        mutationFn: personalKioskDashboardService.regenerateToken,
        onSuccess: (newToken) => {
            queryClient.setQueryData(PERSONAL_KIOSK_TOKEN_KEY, newToken);
            addToast({
                title: "Personal kiosk link regenerated",
                description: "Paired tablets will need the new link.",
                color: "success",
                timeout: 3000,
            });
        },
        onError: () => {
            addToast({
                title: "Failed to regenerate kiosk link",
                color: "danger",
                timeout: 4000,
            });
        },
    });

    return {
        token,
        isLoading,
        regenerateToken: regenerateMutation.mutateAsync,
        isRegenerating: regenerateMutation.isPending,
    };
};
