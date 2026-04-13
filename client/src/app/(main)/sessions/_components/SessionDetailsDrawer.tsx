"use client";

import { WorkSession } from "@/types/session";
import { useSessions } from "@/hooks/useSessions";
import { useSettings } from "@/hooks/useSettings";
import { formatDateTime } from "@/lib/utils/date.utils";
import { formatNumber } from "@/lib/utils/number.utils";
import WorkerTags from "@/components/shared/WorkerTags";
import Drawer from "@/components/ui/Drawer";
import { ClipboardList, Pencil, Trash2 } from "lucide-react";

interface SessionDetailsDrawerProps {
    session: WorkSession | null;
    onClose: () => void;
    onEdit: (session: WorkSession) => void;
    onViewForms: (sessionId: number) => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="px-4 py-3 flex flex-col gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</p>
            <div className="text-sm text-text">{children}</div>
        </div>
    );
}

export default function SessionDetailsDrawer({ session, onClose, onEdit, onViewForms }: SessionDetailsDrawerProps) {
    const { settings } = useSettings();
    const { deleteSession, isDeleting } = useSessions();

    const handleDelete = () => {
        if (!session) return;
        if (confirm("Delete this session? This action cannot be undone.")) {
            deleteSession(session.id);
            onClose();
        }
    };

    return (
        <Drawer
            isOpen={!!session}
            onClose={onClose}
            title="Session Details"
        >
            {!session ? null : (
                <div className="flex flex-col gap-6">
                    <div className="border border-border flex flex-col divide-y divide-border">
                        <Field label="Workers">
                            <WorkerTags workers={session.workers ?? []} />
                        </Field>
                        <Field label="Workstation">
                            {session.workstation_name || "—"}
                        </Field>
                        <Field label="Item">
                            {session.item_name || "—"}
                        </Field>
                        <Field label="Status">
                            <span className={`text-xs font-semibold uppercase tracking-widest px-2 py-1 border ${session.status === "verified"
                                ? "border-success text-success"
                                : "border-warning text-warning"
                                }`}>
                                {session.status === "verified" ? "Verified" : "QC Pending"}
                            </span>
                        </Field>
                        <Field label="Start Time">
                            {formatDateTime(session.start_time, settings)}
                        </Field>
                        <Field label="End Time">
                            {session.end_time ? formatDateTime(session.end_time, settings) : "—"}
                        </Field>
                        <Field label="Duration">
                            {session.duration_hours ? `${session.duration_hours}h` : "—"}
                        </Field>
                        <Field label="Overtime">
                            {session.overtime_hours ? `${session.overtime_hours}h` : "—"}
                        </Field>
                        <Field label="Quantity Produced">
                            {session.quantity_produced
                                ? formatNumber(Number(session.quantity_produced), settings)
                                : "—"}
                        </Field>
                        <Field label="Quantity Rejected">
                            {session.quantity_rejected !== null && session.quantity_rejected !== undefined ? (
                                <span className="text-error">
                                    {formatNumber(Number(session.quantity_rejected), settings)}
                                </span>
                            ) : "—"}
                        </Field>
                        <Field label="Performance">
                            {session.performance_percentage !== null ? (
                                <span className={`text-xs font-semibold px-2 py-1 ${session.performance_percentage >= 100
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
                            {session.wage_cost !== null && session.wage_cost !== undefined
                                ? formatNumber(Number(session.wage_cost), settings)
                                : "—"}
                        </Field>
                        <Field label="Notes">
                            {session.notes ? (
                                <span className="whitespace-pre-wrap">{session.notes}</span>
                            ) : "—"}
                        </Field>
                    </div>

                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => onViewForms(session.id)}
                            className="flex items-center justify-center gap-2 px-4 py-3 border border-border text-xs font-semibold uppercase tracking-widest text-text hover:bg-surface transition-colors"
                        >
                            <ClipboardList size={14} />
                            View Forms
                        </button>
                        <button
                            onClick={() => onEdit(session)}
                            className="flex items-center justify-center gap-2 px-4 py-3 border border-border text-xs font-semibold uppercase tracking-widest text-text hover:bg-surface transition-colors"
                        >
                            <Pencil size={14} />
                            Edit Session
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="flex items-center justify-center gap-2 px-4 py-3 border border-error text-xs font-semibold uppercase tracking-widest text-error hover:bg-error hover:text-background transition-colors disabled:opacity-50"
                        >
                            <Trash2 size={14} />
                            Delete Session
                        </button>
                    </div>
                </div>
            )}
        </Drawer>
    );
}
