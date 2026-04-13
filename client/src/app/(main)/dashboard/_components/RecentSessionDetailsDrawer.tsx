"use client";

import { DashboardOverview } from "@/types/dashboard";
import { useSettings } from "@/hooks/useSettings";
import { formatCurrency } from "@/lib/utils/number.utils";
import { formatDateTime } from "@/lib/utils/date.utils";
import Drawer from "@/components/ui/Drawer";

type RecentSession = DashboardOverview["recent_sessions"][number];

interface RecentSessionDetailsDrawerProps {
    session: RecentSession | null;
    onClose: () => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="px-4 py-3 flex flex-col gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</p>
            <div className="text-sm text-text">{children}</div>
        </div>
    );
}

const STATUS_LABEL: Record<RecentSession["status"], string> = {
    active: "Active",
    completed: "QC Pending",
    verified: "Verified",
};

export default function RecentSessionDetailsDrawer({ session, onClose }: RecentSessionDetailsDrawerProps) {
    const { settings } = useSettings();

    return (
        <Drawer isOpen={!!session} onClose={onClose} title="Session Details">
            {!session ? null : (
                <div className="border border-border flex flex-col divide-y divide-border">
                    <Field label="Workers">{session.worker_names.join(", ")}</Field>
                    <Field label="Workstation">{session.workstation_name}</Field>
                    <Field label="Duration">
                        {session.duration_hours ? `${session.duration_hours}h` : "—"}
                    </Field>
                    <Field label="Performance">
                        {session.performance_percentage !== null ? (
                            <span className={`text-xs font-semibold ${session.performance_percentage >= 100
                                ? "text-success"
                                : session.performance_percentage >= 75
                                    ? "text-secondary"
                                    : "text-error"
                                }`}>
                                {session.performance_percentage}%
                            </span>
                        ) : "—"}
                    </Field>
                    <Field label="Wage Cost">
                        {session.wage_cost ? formatCurrency(session.wage_cost, settings) : "—"}
                    </Field>
                    <Field label="Start Time">{formatDateTime(session.start_time, settings)}</Field>
                    <Field label="Status">
                        <span className={`text-xs font-semibold uppercase tracking-widest px-2 py-1 border ${session.status === "verified"
                            ? "border-success text-success"
                            : session.status === "completed"
                                ? "border-warning text-warning"
                                : "border-border text-muted"
                            }`}>
                            {STATUS_LABEL[session.status]}
                        </span>
                    </Field>
                </div>
            )}
        </Drawer>
    );
}
