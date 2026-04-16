"use client";

import { useSettings } from "@/hooks/useSettings";
import { formatDate } from "@/lib/utils/date.utils";
import { formatNumber } from "@/lib/utils/number.utils";
import { WorkstationStatsChartPoint } from "@/types/workstation";
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ReferenceLine,
    CartesianGrid,
} from "recharts";

interface WorkstationPerformanceChartProps {
    chart: WorkstationStatsChartPoint[];
    grouping: "hour" | "day" | "week";
}

const CustomTooltip = ({ active, payload }: any) => {
    const { settings } = useSettings();
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;

    return (
        <div className="border border-border bg-background px-4 py-3 flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                {formatDate(d.date, settings)}
            </p>
            <p className="text-sm font-black text-text">
                {d.avg_performance !== null ? `${d.avg_performance}%` : "—"}
            </p>
            <p className="text-xs text-muted">{d.sessions_count} sessions</p>
            <p className="text-xs text-muted">{formatNumber(d.total_quantity, settings)} units</p>
        </div>
    );
};

export default function WorkstationPerformanceChart({ chart, grouping }: WorkstationPerformanceChartProps) {
    const { settings } = useSettings();

    if (!chart.length) {
        return (
            <div className="flex items-center justify-center py-16 border border-dashed border-border">
                <p className="text-muted text-xs uppercase tracking-widest">No chart data</p>
            </div>
        );
    }

    const formatLabel = (key: string) => {
        if (grouping === 'hour') return key.split(' ')[1];
        if (grouping === 'day') return formatDate(key, settings);
        if (grouping === 'week') {
            const [year, week] = key.split('-W').map(Number);
            const jan1 = new Date(year, 0, 1);
            const weekStart = new Date(jan1.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
            const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
            return `${formatDate(weekStart.toISOString(), settings)} – ${formatDate(weekEnd.toISOString(), settings)}`;
        }
        return key;
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted whitespace-nowrap">
                    Performance Over Time
                </h2>
                <div className="h-px bg-border flex-1" />
            </div>
            <div className="border border-border p-6">
                <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={chart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis
                            dataKey="date"
                            tickFormatter={formatLabel}
                            tick={{ fontSize: 10, fill: 'var(--color-muted)', fontWeight: 600 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fontSize: 10, fill: 'var(--color-muted)', fontWeight: 600 }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => `${v}%`}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <ReferenceLine
                            y={100}
                            stroke="var(--color-success)"
                            strokeDasharray="4 4"
                            strokeWidth={1}
                        />
                        <Line
                            type="monotone"
                            dataKey="avg_performance"
                            stroke="var(--color-text)"
                            strokeWidth={2}
                            dot={{ fill: 'var(--color-text)', r: 3 }}
                            activeDot={{ r: 5, fill: 'var(--color-text)' }}
                            connectNulls={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
