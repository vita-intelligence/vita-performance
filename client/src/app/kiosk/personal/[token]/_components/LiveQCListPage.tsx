"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@heroui/react";
import {
    AlertTriangle,
    Bell,
    Check,
    ClipboardCheck,
    Factory,
    Loader2,
    Users,
} from "lucide-react";
import { personalKioskService } from "@/services/personal-kiosk.service";

interface LiveMoRow {
    mo_uuid: string;
    item_name: string;
    item_id: number | null;
    started_at: string;
    elapsed_seconds: number;
    last_qc_note_at: string | null;
    minutes_since_last_qc_note: number;
    qc_check_overdue: boolean;
    sessions: Array<{
        session_id: number;
        workstation_id: number;
        workstation_name: string;
        worker_id: number;
        worker_full_name: string;
        started_at: string;
        mo_step_uuid: string | null;
    }>;
}

// Shared with WorkerHome via the same-shape service response — every
// 20 min since the last note for an MO, every QA sees a reminder;
// the moment anyone logs a note for that MO, the timer resets
// globally (BE returns the same `last_qc_note_at` to every reader).
const QC_CHECK_INTERVAL_MIN = 20;

interface LiveQCListPageProps {
    token: string;
    sessionToken: string;
    onOpenMo: (moUuid: string, workstationId: number | null) => void;
}

/**
 * List every MO currently being run somewhere on the shop floor.
 *
 * A "running MO" = at least one WorkSession with status='in_progress'
 * and activity_kind='mo'. The BE groups multiple sessions on the
 * same MO across workstations into one row so the QC operator sees
 * the whole picture ("MO X is running on two lines by three people").
 *
 * Tap a row → navigate to the MO's note-taking page.
 */
export default function LiveQCListPage({
    token,
    sessionToken,
    onOpenMo,
}: LiveQCListPageProps) {
    const [rows, setRows] = useState<LiveMoRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await personalKioskService.getLiveQCMOs(
                token,
                sessionToken,
            );
            setRows(res.results);
            setError(null);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Load failed");
        } finally {
            setLoading(false);
        }
    }, [token, sessionToken]);

    useEffect(() => {
        void load();
        // Poll every 20s so a freshly-started MO shows up without
        // the QC operator having to pull-to-refresh.
        const id = window.setInterval(() => void load(), 20_000);
        return () => window.clearInterval(id);
    }, [load]);

    if (loading && rows.length === 0) {
        return (
            <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-3 px-4 py-10 text-muted">
                <Loader2 className="size-6 animate-spin" />
                <p className="text-sm">Loading live MOs…</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-3 px-4 py-10 text-danger">
                <AlertTriangle className="size-6" />
                <p className="text-sm">{error}</p>
                <Button variant="light" onPress={() => void load()}>
                    Retry
                </Button>
            </div>
        );
    }

    if (rows.length === 0) {
        return (
            <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-3 px-4 py-10 text-muted">
                <Factory className="size-6" />
                <p className="text-sm font-medium">No MOs running right now.</p>
                <p className="text-xs">
                    Come back once operators start a job.
                </p>
            </div>
        );
    }

    const overdueCount = rows.filter((r) => r.qc_check_overdue).length;

    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-6">
            <div className="flex items-center justify-between">
                <p className="text-[11px] font-black uppercase tracking-widest text-muted">
                    Live QC · {rows.length} running
                </p>
                <Button
                    variant="light"
                    size="sm"
                    onPress={() => void load()}
                    isDisabled={loading}
                >
                    {loading ? (
                        <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                        "Refresh"
                    )}
                </Button>
            </div>

            {/* Shared reminder banner. Any QA who opens the list sees
                the same count; when one of them logs a note, the MO
                falls out of the overdue set for everyone. */}
            {overdueCount > 0 && (
                <div className="flex items-center gap-2 rounded-2xl border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger">
                    <Bell className="size-4 shrink-0" />
                    <p className="font-black">
                        {overdueCount} MO{overdueCount === 1 ? "" : "s"} due for
                        a {QC_CHECK_INTERVAL_MIN}-min QC check
                    </p>
                </div>
            )}

            {rows.map((row) => (
                <button
                    key={row.mo_uuid}
                    type="button"
                    onClick={() =>
                        onOpenMo(
                            row.mo_uuid,
                            row.sessions[0]?.workstation_id ?? null,
                        )
                    }
                    className={`group flex w-full flex-col gap-2 rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.99] ${
                        row.qc_check_overdue
                            ? "border-danger/50 bg-danger/5 hover:border-danger"
                            : "border-border bg-surface hover:border-primary/40"
                    }`}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-black text-text">
                                {row.item_name || "(unnamed product)"}
                            </p>
                            <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-wider text-muted">
                                MO {row.mo_uuid.slice(0, 8)}
                            </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                            <span className="rounded-full bg-success/10 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-success">
                                {formatElapsed(row.elapsed_seconds)}
                            </span>
                            <QcCheckPill row={row} />
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-[11px] text-muted">
                        {uniqueWorkstations(row.sessions).map((ws) => (
                            <span
                                key={ws.workstation_id}
                                className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5"
                            >
                                <Factory className="size-3" />
                                {ws.workstation_name}
                            </span>
                        ))}
                        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5">
                            <Users className="size-3" />
                            {row.sessions.length}{" "}
                            {row.sessions.length === 1 ? "operator" : "operators"}
                        </span>
                    </div>

                    <div
                        className={`flex items-center gap-1 text-[11px] font-black uppercase tracking-widest transition-opacity ${
                            row.qc_check_overdue
                                ? "text-danger opacity-100"
                                : "text-primary opacity-0 group-hover:opacity-100"
                        }`}
                    >
                        <ClipboardCheck className="size-3.5" />
                        {row.qc_check_overdue
                            ? "Log the check"
                            : "Add QC note"}
                    </div>
                </button>
            ))}
        </div>
    );
}

/**
 * Compact pill telling the QA operator the state of the 20-min
 * check clock on this MO. Three states:
 *   fresh  (< 15 min)     → green "Checked Xm ago"
 *   due soon (15–19 min) → amber "Due in Xm"
 *   overdue (>= 20 min)  → red "Overdue by Xm"
 * When a note has never been logged, we treat the MO's start time
 * as the reference so a freshly-started MO doesn't render "Overdue"
 * for the first 20 minutes of its life either.
 */
function QcCheckPill({ row }: { row: LiveMoRow }) {
    const mins = row.minutes_since_last_qc_note;
    const overdue = row.qc_check_overdue;
    const dueSoon = !overdue && mins >= QC_CHECK_INTERVAL_MIN - 5;
    const label = row.last_qc_note_at
        ? overdue
            ? `Overdue by ${mins - QC_CHECK_INTERVAL_MIN}m`
            : dueSoon
              ? `Due in ${QC_CHECK_INTERVAL_MIN - mins}m`
              : `Checked ${mins}m ago`
        : overdue
          ? `No check in ${mins}m`
          : `Next check in ${QC_CHECK_INTERVAL_MIN - mins}m`;
    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${
                overdue
                    ? "bg-danger/15 text-danger"
                    : dueSoon
                      ? "bg-warning/15 text-warning"
                      : "bg-success/15 text-success"
            }`}
        >
            {overdue ? (
                <Bell className="size-3" />
            ) : (
                <Check className="size-3" />
            )}
            {label}
        </span>
    );
}

function uniqueWorkstations(
    sessions: LiveMoRow["sessions"],
): Array<{ workstation_id: number; workstation_name: string }> {
    const seen = new Set<number>();
    const out: Array<{ workstation_id: number; workstation_name: string }> = [];
    for (const s of sessions) {
        if (seen.has(s.workstation_id)) continue;
        seen.add(s.workstation_id);
        out.push({
            workstation_id: s.workstation_id,
            workstation_name: s.workstation_name || `#${s.workstation_id}`,
        });
    }
    return out;
}

function formatElapsed(totalSeconds: number): string {
    const s = Math.max(0, totalSeconds);
    if (s < 60) return `${s}s`;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
}
