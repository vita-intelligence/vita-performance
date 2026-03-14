"use client";

import { useSubscription } from "@/hooks/useSubscription";
import BillingHeader from "./_components/BillingHeader";
import CurrentPlanCard from "./_components/CurrentPlanCard";
import PlanComparisonTable from "./_components/PlanComparisonTable";
import PlanComparisonCards from "./_components/PlanComparisonCard";

const PLANS = [
    {
        key: "starter",
        name: "Starter",
        price: "£19",
        workers: "5",
        workstations: "2",
        history: "90 days",
        kiosk: false,
        qc: false,
        realtime: false,
    },
    {
        key: "growth",
        name: "Growth",
        price: "£49",
        workers: "15",
        workstations: "5",
        history: "1 year",
        kiosk: true,
        qc: false,
        realtime: false,
    },
    {
        key: "pro",
        name: "Pro",
        price: "£99",
        workers: "30",
        workstations: "10",
        history: "Unlimited",
        kiosk: true,
        qc: true,
        realtime: true,
    },
    {
        key: "enterprise",
        name: "Enterprise",
        price: "Custom",
        workers: "Unlimited",
        workstations: "Unlimited",
        history: "Unlimited",
        kiosk: true,
        qc: true,
        realtime: true,
    },
];

export default function BillingPage() {
    const {
        subscription,
        isLoading,
        isTrialing,
        isPastDue,
        isExpired,
        daysRemaining,
        plan,
        planDetails,
        workerLimit,
        workstationLimit,
        hasKiosk,
        hasQC,
        hasRealtime,
    } = useSubscription();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <p className="text-muted text-xs uppercase tracking-widest">Loading...</p>
            </div>
        );
    }

    if (!subscription) return null;

    return (
        <main className="bg-background px-4 py-12 sm:px-8 lg:px-16">
            <div className="max-w-4xl mx-auto flex flex-col gap-10">
                <BillingHeader />

                <CurrentPlanCard
                    subscription={subscription}
                    isTrialing={isTrialing}
                    isPastDue={isPastDue}
                    isExpired={isExpired}
                    daysRemaining={daysRemaining}
                    hasKiosk={hasKiosk}
                    hasQC={hasQC}
                    hasRealtime={hasRealtime}
                    workerLimit={workerLimit}
                    workstationLimit={workstationLimit}
                    planDetails={planDetails}
                />

                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted whitespace-nowrap">
                            Available Plans
                        </h2>
                        <div className="h-px bg-border flex-1" />
                    </div>
                    <PlanComparisonTable plans={PLANS} currentPlan={plan} />
                    <PlanComparisonCards plans={PLANS} currentPlan={plan} />
                </div>
            </div>
        </main>
    );
}