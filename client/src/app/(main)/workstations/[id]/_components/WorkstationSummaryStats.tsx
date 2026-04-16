import { WorkstationStatsSummary } from "@/types/workstation";
import { useSettings } from "@/hooks/useSettings";
import { formatCurrency, formatNumber } from "@/lib/utils/number.utils";

interface WorkstationSummaryStatsProps {
    summary: WorkstationStatsSummary;
}

export default function WorkstationSummaryStats({ summary }: WorkstationSummaryStatsProps) {
    const { settings } = useSettings();

    const perfColor =
        summary.avg_performance === null ? "border-l-border" :
            summary.avg_performance >= 100 ? "border-l-success" :
                summary.avg_performance >= 75 ? "border-l-secondary" :
                    "border-l-error";

    const cards = [
        {
            label: "Sessions",
            value: summary.sessions_count,
            sub: `${summary.unique_workers_count} unique workers`,
            accent: "border-l-border",
        },
        {
            label: "Avg Performance",
            value: summary.avg_performance !== null ? `${summary.avg_performance}%` : "—",
            sub: `Best: ${summary.best_performance !== null ? `${summary.best_performance}%` : "—"} / Worst: ${summary.worst_performance !== null ? `${summary.worst_performance}%` : "—"}`,
            accent: perfColor,
        },
        {
            label: "Total Output",
            value: formatNumber(summary.total_quantity, settings),
            sub: summary.total_rejected > 0
                ? `${formatNumber(summary.total_rejected, settings)} rejected`
                : "0 rejected",
            accent: "border-l-border",
        },
        {
            label: "Time Per Unit",
            value: summary.avg_time_per_unit !== null
                ? summary.avg_time_per_unit < 1
                    ? `${(summary.avg_time_per_unit * 60).toFixed(1)}s`
                    : `${summary.avg_time_per_unit.toFixed(1)}min`
                : "—",
            sub: `${summary.total_hours}h total (${summary.total_overtime_hours}h overtime)`,
            accent: "border-l-border",
        },
        {
            label: "Wage Cost",
            value: formatCurrency(summary.total_wage_cost, settings),
            sub: summary.total_quantity > 0
                ? `${formatCurrency(summary.total_wage_cost / summary.total_quantity, settings)}/unit`
                : "no output",
            accent: "border-l-border",
        },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {cards.map((card) => (
                <div
                    key={card.label}
                    className={`border border-border border-l-4 ${card.accent} bg-background p-5 flex flex-col gap-2`}
                >
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted">{card.label}</p>
                    <p className="text-2xl font-black text-text">{card.value}</p>
                    <p className="text-xs text-muted">{card.sub}</p>
                </div>
            ))}
        </div>
    );
}
