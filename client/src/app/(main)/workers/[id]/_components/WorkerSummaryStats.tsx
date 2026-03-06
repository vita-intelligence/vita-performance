import { WorkerStats } from "@/types/worker";
import { useSettings } from "@/hooks/useSettings";
import { formatCurrency, formatNumber } from "@/lib/utils/number.utils";

interface WorkerSummaryStatsProps {
    summary: WorkerStats["summary"];
}

export default function WorkerSummaryStats({ summary }: WorkerSummaryStatsProps) {
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
            sub: "completed",
            accent: "border-l-border",
        },
        {
            label: "Avg Performance",
            value: summary.avg_performance !== null ? `${summary.avg_performance}%` : "—",
            sub: `Best: ${summary.best_performance !== null ? `${summary.best_performance}%` : "—"}`,
            accent: perfColor,
        },
        {
            label: "Total Hours",
            value: `${summary.total_hours}h`,
            sub: "time worked",
            accent: "border-l-border",
        },
        {
            label: "Total Quantity",
            value: formatNumber(summary.total_quantity, settings),
            sub: "units produced",
            accent: "border-l-border",
        },
        {
            label: "Wage Cost",
            value: formatCurrency(summary.total_wage_cost, settings),
            sub: "total earned",
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