"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Loader2,
    Wrench,
    CalendarClock,
    CalendarCheck2,
} from "lucide-react";
import { personalKioskService } from "@/services/personal-kiosk.service";
import { MaintenanceWorkstationTile } from "@/types/worker";
import { ClockInGate } from "./JobsPage";

interface MaintenancePickerPageProps {
    token: string;
    workerId: number;
    workerName: string;
    isClockedIn: boolean;
    onOpenMaintenance: (row: MaintenanceWorkstationTile) => void;
}

type DueBucket = "overdue" | "due_today" | "due_soon" | "later" | "no_schedule";

const BUCKET_STYLES: Record<DueBucket, string> = {
    overdue: "bg-danger/15 text-danger",
    due_today: "bg-warning/20 text-warning",
    due_soon: "bg-info/15 text-info",
    later: "bg-surface text-muted",
    no_schedule: "bg-surface text-muted",
};

function Chip({ bucket, label }: { bucket: DueBucket; label: string }) {
    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-widest ${BUCKET_STYLES[bucket]}`}
        >
            {label}
        </span>
    );
}

/**
 * Maintenance entry-point picker. Parallel to :file:`CleaningPickerPage`
 * but reads the maintenance-schedule cadence mirrored from PSP.
 */
export default function MaintenancePickerPage({
    token,
    workerId,
    workerName,
    isClockedIn,
    onOpenMaintenance,
}: MaintenancePickerPageProps) {
    if (!isClockedIn) {
        return <ClockInGate title="Maintenance" workerName={workerName} />;
    }

    const [rows, setRows] = useState<MaintenanceWorkstationTile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await personalKioskService.getMaintenanceWorkstations(
                token,
                workerId,
            );
            setRows(res.items);
            setError(null);
        } catch (err) {
            setError(getMsg(err));
        } finally {
            setLoading(false);
        }
    }, [token, workerId]);

    useEffect(() => {
        void load();
    }, [load]);

    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
            <header className="space-y-1">
                <p className="text-[11px] font-black uppercase tracking-widest text-muted">
                    Maintenance
                </p>
                <h1 className="text-2xl font-black text-text">
                    Which station are you maintaining?
                </h1>
                <p className="text-xs text-muted">
                    Pick a workstation to start a maintenance session — the
                    checklist appears on the next screen and the timer
                    records how long the service takes.
                </p>
            </header>

            {loading && rows.length === 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-surface/40 px-3 py-6 text-sm text-muted">
                    <Loader2 className="size-4 animate-spin" />
                    Loading workstations…
                </div>
            )}

            {error && (
                <div className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-3 text-sm text-danger">
                    {error}
                </div>
            )}

            {!loading && rows.length === 0 && !error && (
                <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-surface/20 px-4 py-10 text-center">
                    <Wrench className="size-6 text-muted" />
                    <p className="text-sm font-semibold text-text">
                        No maintenance forms configured
                    </p>
                    <p className="max-w-md text-xs text-muted">
                        Ask a supervisor to author a maintenance form in PSP
                        and assign it to a workstation. Once published, it
                        will show up here.
                    </p>
                </div>
            )}

            <div className="flex flex-col gap-2">
                {rows.map((row) => (
                    <MaintenanceWorkstationRow
                        key={row.workstation_id}
                        row={row}
                        onOpen={() => onOpenMaintenance(row)}
                    />
                ))}
            </div>
        </div>
    );
}

function MaintenanceWorkstationRow({
    row,
    onOpen,
}: {
    row: MaintenanceWorkstationTile;
    onOpen: () => void;
}) {
    const bucket = useMemo(
        () => bucketFor(row.next_maintenance_due_at),
        [row.next_maintenance_due_at],
    );

    const chip = useMemo(
        () => chipLabelFor(row.next_maintenance_due_at, bucket),
        [row.next_maintenance_due_at, bucket],
    );

    return (
        <button
            type="button"
            onClick={onOpen}
            className="group flex items-start gap-3 rounded-lg border border-border bg-background px-3 py-3 text-left transition-colors hover:border-text active:bg-surface/60"
        >
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-surface text-muted group-hover:text-text">
                <Wrench className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-black text-text">
                        {row.workstation_name}
                    </p>
                    <Chip bucket={bucket} label={chip} />
                </div>
                <p className="mt-0.5 truncate text-xs text-muted">
                    {row.form_name}
                </p>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-muted">
                    {row.last_maintenance_at && (
                        <span className="inline-flex items-center gap-1">
                            <CalendarCheck2 className="size-3" />
                            Last: {formatDate(row.last_maintenance_at)}
                        </span>
                    )}
                    {row.next_maintenance_due_at && (
                        <span className="inline-flex items-center gap-1">
                            <CalendarClock className="size-3" />
                            Next due: {row.next_maintenance_due_at.slice(0, 10)}
                        </span>
                    )}
                </div>
            </div>
        </button>
    );
}

function bucketFor(nextDue: string | null): DueBucket {
    if (!nextDue) return "no_schedule";
    const due = new Date(nextDue).getTime();
    const now = Date.now();
    const diffMs = due - now;
    const oneDayMs = 24 * 60 * 60 * 1000;
    if (diffMs < 0) return "overdue";
    if (diffMs < oneDayMs) return "due_today";
    if (diffMs < 7 * oneDayMs) return "due_soon";
    return "later";
}

function chipLabelFor(nextDue: string | null, bucket: DueBucket): string {
    if (bucket === "no_schedule") return "Ad-hoc";
    const due = new Date(nextDue!);
    const now = new Date();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const diffDays = Math.round((due.getTime() - now.getTime()) / oneDayMs);
    if (bucket === "overdue") {
        const overdueDays = Math.abs(diffDays);
        return overdueDays === 0 ? "Overdue today" : `Overdue ${overdueDays}d`;
    }
    if (bucket === "due_today") return "Due today";
    if (bucket === "due_soon") return `Due in ${diffDays}d`;
    return `Due in ${diffDays}d`;
}

function formatDate(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString();
    } catch {
        return iso.slice(0, 10);
    }
}

function getMsg(err: unknown): string {
    if (err instanceof Error) return err.message;
    return "Something went wrong.";
}
