"use client";

import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";

export default function BillingPage() {
    const { subscription, isLoading, daysRemaining, isTrialing, isPastDue, isExpired } = useSubscription();
    const { user } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <p className="text-muted text-xs uppercase tracking-widest">Loading...</p>
            </div>
        );
    }

    const getStatusBadge = () => {
        if (isTrialing) return { label: "Trial", className: "border-success text-success" };
        if (isPastDue) return { label: "Past Due", className: "border-warning text-warning" };
        if (isExpired) return { label: "Expired", className: "border-error text-error" };
        return { label: "Active", className: "border-success text-success" };
    };

    const badge = getStatusBadge();

    return (
        <main className="bg-background px-4 py-12 sm:px-8 lg:px-16">
            <div className="max-w-2xl mx-auto flex flex-col gap-10">

                {/* Header */}
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-black text-text">Billing</h1>
                    <p className="text-muted text-sm">Manage your Vita Performance subscription.</p>
                </div>

                {/* Status Card */}
                <div className="border border-border p-6 flex flex-col gap-6">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col gap-1">
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Subscription Status</p>
                            <p className="text-2xl font-black text-text capitalize">{subscription?.status.replace("_", " ")}</p>
                        </div>
                        <span className={`text-xs font-semibold uppercase tracking-widest px-3 py-1 border ${badge.className}`}>
                            {badge.label}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-border pt-6">
                        {isTrialing && (
                            <>
                                <div className="flex flex-col gap-1">
                                    <p className="text-xs font-semibold uppercase tracking-widest text-muted">Trial Ends</p>
                                    <p className="text-sm font-semibold text-text">
                                        {subscription?.trial_ends_at
                                            ? new Date(subscription.trial_ends_at).toLocaleDateString()
                                            : "—"
                                        }
                                    </p>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <p className="text-xs font-semibold uppercase tracking-widest text-muted">Days Remaining</p>
                                    <p className={`text-sm font-semibold ${daysRemaining <= 5 ? "text-error" : "text-text"}`}>
                                        {daysRemaining} days
                                    </p>
                                </div>
                            </>
                        )}
                        {subscription?.current_period_ends_at && (
                            <>
                                <div className="flex flex-col gap-1">
                                    <p className="text-xs font-semibold uppercase tracking-widest text-muted">Current Period Ends</p>
                                    <p className="text-sm font-semibold text-text">
                                        {new Date(subscription.current_period_ends_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <p className="text-xs font-semibold uppercase tracking-widest text-muted">Days Remaining</p>
                                    <p className={`text-sm font-semibold ${daysRemaining <= 5 ? "text-error" : "text-text"}`}>
                                        {daysRemaining} days
                                    </p>
                                </div>
                            </>
                        )}
                        {isPastDue && subscription?.grace_period_ends_at && (
                            <>
                                <div className="flex flex-col gap-1">
                                    <p className="text-xs font-semibold uppercase tracking-widest text-muted">Grace Period Ends</p>
                                    <p className="text-sm font-semibold text-error">
                                        {new Date(subscription.grace_period_ends_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <p className="text-xs font-semibold uppercase tracking-widest text-muted">Days Remaining</p>
                                    <p className="text-sm font-semibold text-error">{daysRemaining} days</p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Expired banner */}
                    {isExpired && (
                        <div className="border border-error bg-error/10 px-4 py-3">
                            <p className="text-sm font-semibold text-error">
                                Your subscription has expired. Please subscribe to continue using Vita Performance.
                            </p>
                        </div>
                    )}

                    {/* Past due banner */}
                    {isPastDue && (
                        <div className="border border-warning bg-warning/10 px-4 py-3">
                            <p className="text-sm font-semibold text-warning">
                                Your payment is past due. Please update your payment method to avoid losing access.
                            </p>
                        </div>
                    )}

                    {/* Stripe placeholder */}
                    <div className="border border-dashed border-border px-4 py-8 flex flex-col items-center gap-3">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted">Payment</p>
                        <p className="text-sm text-muted text-center">
                            Stripe integration coming soon. Contact support to manage your subscription.
                        </p>
                    </div>
                </div>

                {/* Plan info */}
                <div className="border border-border p-6 flex flex-col gap-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted">Current Plan</p>
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col gap-1">
                            <p className="text-xl font-black text-text">Vita Performance Pro</p>
                            <p className="text-sm text-muted">Unlimited workers, workstations, sessions and QC access.</p>
                        </div>
                        <p className="text-2xl font-black text-text shrink-0">£29<span className="text-sm font-normal text-muted">/mo</span></p>
                    </div>
                </div>

            </div>
        </main>
    );
}