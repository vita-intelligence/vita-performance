import { DashboardOverview } from "@/types/dashboard";
import { useSettings } from "@/hooks/useSettings";
import { formatCurrency } from "@/lib/utils/number.utils";
import StatCard from "./StatCard";

interface TodayStatsProps {
    overview: DashboardOverview;
}

export default function TodayStats({ overview }: TodayStatsProps) {
    const { settings } = useSettings();
    const { today } = overview;

    const performanceHighlight = today.avg_performance === null
        ? undefined
        : today.avg_performance >= 100
            ? "success"
            : today.avg_performance >= 75
                ? "warning"
                : "error";

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted whitespace-nowrap">
                    Today
                </h2>
                <div className="h-px bg-border flex-1" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Wage Cost"
                    value={formatCurrency(today.wage_cost, settings)}
                    sub="Total spent today"
                />
                <StatCard
                    label="Avg Performance"
                    value={today.avg_performance !== null ? `${today.avg_performance}%` : "—"}
                    sub="Across all sessions"
                    highlight={performanceHighlight}
                />
                <StatCard
                    label="Best Workstation"
                    value={today.best_workstation?.name || "—"}
                    sub={today.best_workstation ? `${today.best_workstation.avg_performance}% avg` : "No data yet"}
                    highlight={today.best_workstation ? "success" : undefined}
                />
                <StatCard
                    label="Best Worker"
                    value={today.best_worker?.name || "—"}
                    sub={today.best_worker ? `${today.best_worker.avg_performance}% avg` : "No data yet"}
                    highlight={today.best_worker ? "success" : undefined}
                />
            </div>
        </div>
    );
}