"use client";

import { WorkstationStatsSession } from "@/types/workstation";
import { useSettings } from "@/hooks/useSettings";
import { formatCurrency, formatNumber } from "@/lib/utils/number.utils";
import { formatDateTime } from "@/lib/utils/date.utils";
import Drawer from "@/components/ui/Drawer";

interface WorkstationSessionDetailsDrawerProps {
    session: WorkstationStatsSession | null;
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

export default function WorkstationSessionDetailsDrawer({ session, onClose }: WorkstationSessionDetailsDrawerProps) {
    const { settings } = useSettings();

    return (
        <Drawer isOpen={!!session} onClose={onClose} title="Session Details">
            {!session ? null : (
                <div className="border border-border flex flex-col divide-y divide-border">
                    <Field label="Date">{formatDateTime(session.date, settings)}</Field>
                    <Field label="Workers">
                        {session.worker_names.length > 0
                            ? session.worker_names.join(", ")
                            : "—"}
                    </Field>
                    <Field label="Item">{session.item_name || "—"}</Field>
                    <Field label="Duration">
                        {session.duration_hours ? `${session.duration_hours}h` : "—"}
                    </Field>
                    <Field label="Quantity Produced">
                        {session.quantity_produced
                            ? formatNumber(session.quantity_produced, settings)
                            : "—"}
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
                    <Field label="Workers Count">
                        {session.worker_count > 1 ? `${session.worker_count} workers` : "Solo"}
                    </Field>
                    <Field label="Status">
                        <span className={`text-xs font-semibold uppercase tracking-widest px-2 py-1 border ${session.status === "verified"
                            ? "border-success text-success"
                            : "border-warning text-warning"
                            }`}>
                            {session.status === "verified" ? "Verified" : "QC Pending"}
                        </span>
                    </Field>
                </div>
            )}
        </Drawer>
    );
}
