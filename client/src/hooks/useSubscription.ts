import { useQuery } from "@tanstack/react-query";
import { subscriptionService } from "@/services/subscription.service";

const SUBSCRIPTION_KEY = ["subscription"];

export const useSubscription = () => {
    const { data: subscription, isLoading } = useQuery({
        queryKey: SUBSCRIPTION_KEY,
        queryFn: subscriptionService.getStatus,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    return {
        subscription,
        isLoading,
        hasAccess: subscription?.has_access ?? true,
        isTrialing: subscription?.is_trialing ?? false,
        isExpired: subscription?.is_expired ?? false,
        isPastDue: subscription?.is_past_due ?? false,
        daysRemaining: subscription?.days_remaining ?? 0,
        hasKiosk: subscription?.has_kiosk ?? false,
        hasQC: subscription?.has_qc ?? false,
        hasRealtime: subscription?.has_realtime ?? false,
        workerLimit: subscription?.worker_limit ?? null,
        workstationLimit: subscription?.workstation_limit ?? null,
        plan: subscription?.plan ?? null,
        planDetails: subscription?.plan_details ?? null,
    };
};