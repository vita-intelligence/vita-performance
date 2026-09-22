"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Loader2,
    Sparkles,
    CalendarClock,
    CalendarCheck2,
    Cog,
    Settings2,
} from "lucide-react";
import { personalKioskService } from "@/services/personal-kiosk.service";
import {
    CleaningOrMaintenanceMachineTile,
    CleaningWorkstationTile,
} from "@/types/worker";
import { ClockInGate } from "./JobsPage";

type Tab = "workstation" | "machine";

interface CleaningPickerPageProps {
    token: string;
    workerId: number;
    workerName: string;
    isClockedIn: boolean;
    onOpenCleaning: (row: CleaningWorkstationTile) => void;
    /** Machine-tab handler. Pre-scopes the session to a specific
     *  equipment on the given workstation so the operator lands on
     *  the confirm screen with the right equipment already picked. */
    onOpenCleaningMachine: (row: CleaningOrMaintenanceMachineTile) => void;
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
 * Cleaning entry-point picker on the personal kiosk. Two tabs:
 *
 *   - **Workstation** (default): every workstation with a cleaning
 *     form the worker can open, sorted overdue-first. Picking one
 *     starts a cleaning session against the whole cell.
 *   - **Machine**: every specific machine (equipment) whose category
 *     has a cleaning form attached on PSP. Picking one starts a
 *     cleaning session with equipment_uuid pre-scoped so the audit
 *     event lands against that machine.
 *
 *   Both feeds read the local vita-perf mirror (populated by the PSP
 *   forms publisher), so the picker stays offline-resilient.
 */
export default function CleaningPickerPage({
    token,
    workerId,
    workerName,
    isClockedIn,
    onOpenCleaning,
    onOpenCleaningMachine,
}: CleaningPickerPageProps) {
    if (!isClockedIn) {
        return <ClockInGate title="Cleaning" workerName={workerName} />;
    }

    const [tab, setTab] = useState<Tab>("workstation");
    const [wsRows, setWsRows] = useState<CleaningWorkstationTile[]>([]);
    const [machineRows, setMachineRows] = useState<
        CleaningOrMaintenanceMachineTile[]
    >([]);
    const [wsLoading, setWsLoading] = useState(true);
    const [machineLoading, setMachineLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadWs = useCallback(async () => {
        setWsLoading(true);
        try {
            const res = await personalKioskService.getCleaningWorkstations(
                token,
                workerId,
            );
            setWsRows(res.items);
            setError(null);
        } catch (err) {
            setError(getMsg(err));
        } finally {
            setWsLoading(false);
        }
    }, [token, workerId]);

    const loadMachines = useCallback(async () => {
        setMachineLoading(true);
        try {
            const res = await personalKioskService.getCleaningMachines(
                token,
                workerId,
            );
            setMachineRows(res.items);
            setError(null);
        } catch (err) {
            setError(getMsg(err));
        } finally {
            setMachineLoading(false);
        }
    }, [token, workerId]);

    useEffect(() => {
        void loadWs();
        void loadMachines();
    }, [loadWs, loadMachines]);

    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
            <header className="space-y-1">
                <p className="text-[11px] font-black uppercase tracking-widest text-muted">
                    Cleaning
                </p>
                <h1 className="text-2xl font-black text-text">
                    What are you cleaning?
                </h1>
                <p className="text-xs text-muted">
                    Pick the whole workstation, or a specific machine on
                    it. The audit event goes against whatever you pick,
                    and the checklist is the one attached at that level
                    on PSP.
                </p>
            </header>

            <TabBar
                tab={tab}
                onChange={setTab}
                workstationCount={wsRows.length}
                machineCount={machineRows.length}
            />

            {error && (
                <div className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-3 text-sm text-danger">
                    {error}
                </div>
            )}

            {tab === "workstation" ? (
                <WorkstationList
                    rows={wsRows}
                    loading={wsLoading}
                    onOpen={onOpenCleaning}
                />
            ) : (
                <MachineList
                    rows={machineRows}
                    loading={machineLoading}
                    onOpen={onOpenCleaningMachine}
                    verb="cleaning"
                />
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */

export function TabBar({
    tab,
    onChange,
    workstationCount,
    machineCount,
}: {
    tab: Tab;
    onChange: (t: Tab) => void;
    workstationCount: number;
    machineCount: number;
}) {
    return (
        <div className="flex w-full rounded-lg border border-border p-0.5">
            <TabButton
                active={tab === "workstation"}
                onClick={() => onChange("workstation")}
                icon={<Settings2 className="size-4" />}
                label="Workstation"
                count={workstationCount}
            />
            <TabButton
                active={tab === "machine"}
                onClick={() => onChange("machine")}
                icon={<Cog className="size-4" />}
                label="Machine"
                count={machineCount}
            />
        </div>
    );
}

function TabButton({
    active,
    onClick,
    icon,
    label,
    count,
}: {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    count: number;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={
                "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors " +
                (active
                    ? "bg-text text-background"
                    : "text-muted hover:text-text")
            }
        >
            {icon}
            {label}
            <span
                className={
                    "rounded-full px-1.5 py-0.5 text-[10px] font-black " +
                    (active
                        ? "bg-background/20 text-background"
                        : "bg-surface text-muted")
                }
            >
                {count}
            </span>
        </button>
    );
}

/* ------------------------------------------------------------------ */

function WorkstationList({
    rows,
    loading,
    onOpen,
}: {
    rows: CleaningWorkstationTile[];
    loading: boolean;
    onOpen: (row: CleaningWorkstationTile) => void;
}) {
    if (loading && rows.length === 0) {
        return (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface/40 px-3 py-6 text-sm text-muted">
                <Loader2 className="size-4 animate-spin" />
                Loading workstations…
            </div>
        );
    }
    if (rows.length === 0) {
        return (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-surface/20 px-4 py-10 text-center">
                <Sparkles className="size-6 text-muted" />
                <p className="text-sm font-semibold text-text">
                    No workstation cleaning forms configured
                </p>
                <p className="max-w-md text-xs text-muted">
                    Ask a supervisor to author a workstation-scoped
                    cleaning form in PSP and attach it. Once published
                    it will show up here.
                </p>
            </div>
        );
    }
    return (
        <div className="flex flex-col gap-2">
            {rows.map((row) => (
                <CleaningWorkstationRow
                    key={row.workstation_id}
                    row={row}
                    onOpen={() => onOpen(row)}
                />
            ))}
        </div>
    );
}

function CleaningWorkstationRow({
    row,
    onOpen,
}: {
    row: CleaningWorkstationTile;
    onOpen: () => void;
}) {
    const bucket = useMemo(
        () => bucketFor(row.next_cleaning_due_at),
        [row.next_cleaning_due_at],
    );
    const chip = useMemo(() => chipLabelFor(row.next_cleaning_due_at, bucket), [
        row.next_cleaning_due_at,
        bucket,
    ]);
    return (
        <button
            type="button"
            onClick={onOpen}
            className="group flex items-start gap-3 rounded-lg border border-border bg-background px-3 py-3 text-left transition-colors hover:border-text active:bg-surface/60"
        >
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-surface text-muted group-hover:text-text">
                <Sparkles className="size-5" />
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
                    {row.last_cleaning_at && (
                        <span className="inline-flex items-center gap-1">
                            <CalendarCheck2 className="size-3" />
                            Last: {formatDate(row.last_cleaning_at)}
                        </span>
                    )}
                    {row.next_cleaning_due_at && (
                        <span className="inline-flex items-center gap-1">
                            <CalendarClock className="size-3" />
                            Next due: {row.next_cleaning_due_at.slice(0, 10)}
                        </span>
                    )}
                </div>
            </div>
        </button>
    );
}

/* ------------------------------------------------------------------ */

export function MachineList({
    rows,
    loading,
    onOpen,
    verb,
}: {
    rows: CleaningOrMaintenanceMachineTile[];
    loading: boolean;
    onOpen: (row: CleaningOrMaintenanceMachineTile) => void;
    verb: "cleaning" | "maintenance";
}) {
    if (loading && rows.length === 0) {
        return (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface/40 px-3 py-6 text-sm text-muted">
                <Loader2 className="size-4 animate-spin" />
                Loading machines…
            </div>
        );
    }
    if (rows.length === 0) {
        return (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-surface/20 px-4 py-10 text-center">
                <Cog className="size-6 text-muted" />
                <p className="text-sm font-semibold text-text">
                    No machine {verb} forms configured
                </p>
                <p className="max-w-md text-xs text-muted">
                    Attach a {verb === "cleaning" ? "cleaning" : "maintenance"}
                    {" "}form to an equipment category on PSP (Settings →
                    Equipment categories → pick one → Kiosk forms). Every
                    machine in that category will start showing up here.
                </p>
            </div>
        );
    }
    return (
        <div className="flex flex-col gap-2">
            {rows.map((row) => (
                <MachineRow
                    key={`${row.workstation_id}-${row.equipment_uuid}`}
                    row={row}
                    onOpen={() => onOpen(row)}
                />
            ))}
        </div>
    );
}

function MachineRow({
    row,
    onOpen,
}: {
    row: CleaningOrMaintenanceMachineTile;
    onOpen: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onOpen}
            className="group flex items-start gap-3 rounded-lg border border-border bg-background px-3 py-3 text-left transition-colors hover:border-text active:bg-surface/60"
        >
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-surface text-muted group-hover:text-text">
                <Cog className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-black text-text">
                        {row.equipment_name}
                    </p>
                    {row.form_count > 1 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-muted">
                            {row.form_count} forms
                        </span>
                    )}
                </div>
                <p className="mt-0.5 truncate text-xs text-muted">
                    on {row.workstation_name}
                    {row.serial_number && ` · SN ${row.serial_number}`}
                </p>
                {row.category_name && (
                    <p className="mt-0.5 truncate text-[11px] text-muted">
                        {row.category_name}
                    </p>
                )}
            </div>
        </button>
    );
}

/* ------------------------------------------------------------------ */

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
