"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@heroui/react";
import { AlertTriangle, ClipboardCheck, Factory, Loader2, Users } from "lucide-react";
import { personalKioskService } from "@/services/personal-kiosk.service";

interface LiveMoRow {
    mo_uuid: string;
    item_name: string;
    item_id: number | null;
    started_at: string;
    elapsed_seconds: number;
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
                    className="group flex w-full flex-col gap-2 rounded-2xl border border-border bg-surface p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg active:scale-[0.99]"
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
                        <span className="shrink-0 rounded-full bg-success/10 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-success">
                            {formatElapsed(row.elapsed_seconds)}
                        </span>
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

                    <div className="flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-primary opacity-0 transition-opacity group-hover:opacity-100">
                        <ClipboardCheck className="size-3.5" />
                        Add QC note
                    </div>
                </button>
            ))}
        </div>
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
