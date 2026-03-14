"use client";

import { Users, MonitorCheck, Clock, Tablet, ShieldCheck, Radio, CalendarClock, CreditCard } from "lucide-react";
import { Subscription } from "@/types/subscription";

interface CurrentPlanCardProps {
    subscription: Subscription;
    isTrialing: boolean;
    isPastDue: boolean;
    isExpired: boolean;
    daysRemaining: number;
    hasKiosk: boolean;
    hasQC: boolean;
    hasRealtime: boolean;
    workerLimit: number | null;
    workstationLimit: number | null;
    planDetails: { name: string; price_gbp: number | null } | null;
}

export default function CurrentPlanCard({
    subscription,
    isTrialing,
    isPastDue,
    isExpired,
    daysRemaining,
    hasKiosk,
    hasQC,
    hasRealtime,
    workerLimit,
    workstationLimit,
    planDetails,
}: CurrentPlanCardProps) {

    const getStatusBadge = () => {
        if (isTrialing) return { label: "Trial", className: "border-success text-success bg-success/10" };
        if (isPastDue) return { label: "Past Due", className: "border-warning text-warning bg-warning/10" };
        if (isExpired) return { label: "Expired", className: "border-error text-error bg-error/10" };
        return { label: "Active", className: "border-success text-success bg-success/10" };
    };

    const badge = getStatusBadge();

    const features = [
        {
            icon: Users,
            label: "Workers",
            value: workerLimit === null ? "Unlimited" : `Up to ${workerLimit}`,
            active: true,
        },
        {
            icon: MonitorCheck,
            label: "Workstations",
            value: workstationLimit === null ? "Unlimited" : `Up to ${workstationLimit}`,
            active: true,
        },
        {
            icon: Clock,
            label: "History",
            value: subscription.session_history_days === null ? "Unlimited" : `${subscription.session_history_days} days`,
            active: true,
        },
        {
            icon: Tablet,
            label: "Kiosk",
            value: hasKiosk ? "Included" : "Not available",
            active: hasKiosk,
        },
        {
            icon: ShieldCheck,
            label: "QC System",
            value: hasQC ? "Included" : "Not available",
            active: hasQC,
        },
        {
            icon: Radio,
            label: "Realtime",
            value: hasRealtime ? "Included" : "Not available",
            active: hasRealtime,
        },
    ];

    return (
        <div className="border border-border p-6 flex flex-col gap-6">

            {/* Plan name + status */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted">Current Plan</p>
                    <div className="flex items-baseline gap-3">
                        <p className="text-3xl font-black text-text">{planDetails?.name ?? subscription.plan}</p>
                        {planDetails?.price_gbp && (
                            <p className="text-sm text-muted font-semibold">£{planDetails.price_gbp}<span className="text-xs font-normal">/mo</span></p>
                        )}
                    </div>
                </div>
                <span className={`text-xs font-semibold uppercase tracking-widest px-3 py-1 border ${badge.className}`}>
                    {badge.label}
                </span>
            </div>

            {/* Trial countdown */}
            {isTrialing && (
                <div className="flex items-center gap-4 border border-success/30 bg-success/5 px-4 py-3">
                    <CalendarClock size={18} className="text-success shrink-0" />
                    <div className="flex flex-col gap-0.5">
                        <p className="text-xs font-semibold uppercase tracking-widest text-success">
                            {daysRemaining} days remaining in trial
                        </p>
                        <p className="text-xs text-muted">
                            Trial ends {new Date(subscription.trial_ends_at).toLocaleDateString()}
                        </p>
                    </div>
                </div>
            )}

            {/* Past due warning */}
            {isPastDue && subscription.grace_period_ends_at && (
                <div className="flex items-center gap-4 border border-warning/30 bg-warning/5 px-4 py-3">
                    <CalendarClock size={18} className="text-warning shrink-0" />
                    <div className="flex flex-col gap-0.5">
                        <p className="text-xs font-semibold uppercase tracking-widest text-warning">
                            {daysRemaining} days until access is cut
                        </p>
                        <p className="text-xs text-muted">
                            Grace period ends {new Date(subscription.grace_period_ends_at).toLocaleDateString()}
                        </p>
                    </div>
                </div>
            )}

            {/* Expired */}
            {isExpired && (
                <div className="flex items-center gap-4 border border-error/30 bg-error/5 px-4 py-3">
                    <CalendarClock size={18} className="text-error shrink-0" />
                    <p className="text-xs font-semibold uppercase tracking-widest text-error">
                        Subscription expired — subscribe to restore access
                    </p>
                </div>
            )}

            {/* Features grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 border-t border-border pt-6">
                {features.map((f) => (
                    <div
                        key={f.label}
                        className={`flex items-center gap-3 px-4 py-3 border ${f.active ? "border-border" : "border-border opacity-40"
                            }`}
                    >
                        <f.icon size={16} className={f.active ? "text-text shrink-0" : "text-muted shrink-0"} />
                        <div className="flex flex-col gap-0.5 min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted truncate">{f.label}</p>
                            <p className={`text-sm font-black truncate ${f.active ? "text-text" : "text-muted"}`}>
                                {f.value}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Payment */}
            <div className="flex items-center gap-4 border border-dashed border-border px-4 py-4">
                <CreditCard size={18} className="text-muted shrink-0" />
                <div className="flex flex-col gap-0.5">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted">Payment</p>
                    <p className="text-xs text-muted">Stripe coming soon — contact support to manage billing.</p>
                </div>
            </div>
        </div>
    );
}