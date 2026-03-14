"use client";

import { useSubscription } from "@/hooks/useSubscription";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";

export default function SubscriptionBanner() {
    const { subscription, isTrialing, isPastDue, isExpired, daysRemaining } = useSubscription();
    const router = useRouter();

    // Don't show if active and not close to expiry
    if (!subscription) return null;
    if (!isTrialing && !isPastDue && !isExpired) return null;
    if (isTrialing && daysRemaining > 7) return null;

    const getBanner = () => {
        if (isExpired) return {
            message: "Your subscription has expired. Renew now to continue using Vita Performance.",
            className: "bg-error/10 border-error text-error",
            cta: "Renew Now",
        };
        if (isPastDue) return {
            message: `Your payment is past due. You have ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} before losing access.`,
            className: "bg-warning/10 border-warning text-warning",
            cta: "Update Payment",
        };
        if (isTrialing) return {
            message: `Your free trial ends in ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}. Subscribe to keep your access.`,
            className: "bg-warning/10 border-warning text-warning",
            cta: "Subscribe",
        };
        return null;
    };

    const banner = getBanner();
    if (!banner) return null;

    return (
        <div className={`border-b px-4 py-2 flex items-center justify-between gap-4 ${banner.className}`}>
            <p className="text-xs font-semibold">{banner.message}</p>
            <Button
                onPress={() => router.push("/billing")}
                size="sm"
                variant="bordered"
                className={`rounded-none text-xs font-semibold uppercase tracking-widest shrink-0 border-current ${banner.className}`}
            >
                {banner.cta}
            </Button>
        </div>
    );
}