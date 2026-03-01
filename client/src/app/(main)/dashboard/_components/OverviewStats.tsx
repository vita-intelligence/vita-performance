import { DashboardOverview } from "@/types/dashboard";
import StatCard from "./StatCard";

interface OverviewStatsProps {
    overview: DashboardOverview;
}

export default function OverviewStats({ overview }: OverviewStatsProps) {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
                label="Active Workers"
                value={overview.workers.active}
                sub={`${overview.workers.total} total`}
                highlight="success"
            />
            <StatCard
                label="Active Workstations"
                value={overview.workstations.active}
                sub={`${overview.workstations.total} total`}
                highlight="success"
            />
            <StatCard
                label="Active Sessions"
                value={overview.active_sessions}
                sub="Currently running"
                highlight={overview.active_sessions > 0 ? "success" : undefined}
            />
            <StatCard
                label="Today's Sessions"
                value={overview.today.sessions_count}
                sub="Completed today"
            />
        </div>
    );
}