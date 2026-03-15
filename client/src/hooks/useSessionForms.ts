import { useQuery } from "@tanstack/react-query";
import { dynamicFormService } from "@/services/dynamic-form.service";

export const useSessionForms = (sessionId: number | null) => {
    const { data: responses, isLoading } = useQuery({
        queryKey: ["session-forms", sessionId],
        queryFn: () => dynamicFormService.getSessionResponses(sessionId!),
        enabled: !!sessionId,
        staleTime: 1000 * 60 * 5,
    });

    return {
        responses,
        isLoading,
        hasResponses: (responses?.length ?? 0) > 0,
    };
};