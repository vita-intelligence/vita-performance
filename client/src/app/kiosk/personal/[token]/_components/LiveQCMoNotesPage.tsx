"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, addToast } from "@heroui/react";
import { AlertTriangle, ClipboardCheck, Loader2, MessageSquarePlus } from "lucide-react";
import { personalKioskService } from "@/services/personal-kiosk.service";

interface QcNote {
    uuid: string;
    mo_uuid: string;
    mo_step_uuid: string | null;
    note_text: string;
    created_at: string;
    author: { worker_id: number; full_name: string };
    workstation: { id: number; name: string } | null;
}

interface LiveQCMoNotesPageProps {
    token: string;
    sessionToken: string;
    moUuid: string;
    workstationId: number | null;
    onBack: () => void;
}

/**
 * Note-taking page for a single in-progress MO.
 *
 * Top: MO ID + Back to the live-MOs list. Middle: text area + Save.
 * Bottom: reverse-chronological timeline of every QC note captured
 * so far. Save appends; the local list refreshes optimistically.
 *
 * Universal text area on purpose — QC writes whatever they want per
 * observation (weight measurement, colour drift, machine noise, …).
 * Every save is immutable so the audit trail is honest.
 */
export default function LiveQCMoNotesPage({
    token,
    sessionToken,
    moUuid,
    workstationId,
    onBack,
}: LiveQCMoNotesPageProps) {
    const [notes, setNotes] = useState<QcNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [draft, setDraft] = useState("");
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await personalKioskService.getQCMoNotes(
                token,
                sessionToken,
                moUuid,
            );
            setNotes(res.results);
            setError(null);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Load failed");
        } finally {
            setLoading(false);
        }
    }, [token, sessionToken, moUuid]);

    useEffect(() => {
        void load();
    }, [load]);

    const onSave = useCallback(async () => {
        const trimmed = draft.trim();
        if (!trimmed) {
            addToast({
                title: "Nothing to save",
                description: "Write a note first.",
                color: "warning",
            });
            return;
        }
        setSaving(true);
        try {
            await personalKioskService.createQCMoNote(
                token,
                sessionToken,
                moUuid,
                {
                    noteText: trimmed,
                    workstationId: workstationId ?? null,
                },
            );
            setDraft("");
            addToast({
                title: "Note saved",
                description: "Added to the MO timeline.",
                color: "success",
            });
            await load();
        } catch (err: unknown) {
            addToast({
                title: "Couldn't save note",
                description: err instanceof Error ? err.message : "Try again.",
                color: "danger",
            });
        } finally {
            setSaving(false);
        }
    }, [draft, token, sessionToken, moUuid, workstationId, load]);

    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
            <div className="flex items-center justify-between">
                <button
                    type="button"
                    onClick={onBack}
                    className="text-sm font-black uppercase tracking-widest text-muted hover:text-text"
                >
                    ← Back
                </button>
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
                    MO {moUuid.slice(0, 8)}
                </p>
            </div>

            {/* Compose */}
            <div className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-center gap-2 pb-2">
                    <MessageSquarePlus className="size-4 text-primary" />
                    <p className="text-sm font-black text-text">Add QC note</p>
                </div>
                <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={5}
                    maxLength={8000}
                    placeholder="What did you observe? (weights, colour, machine behaviour, corrective actions, ...)"
                    disabled={saving}
                    className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-muted focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <div className="mt-2 flex items-center justify-between">
                    <p className="text-[10px] text-muted">
                        {draft.length} / 8000
                    </p>
                    <Button
                        color="primary"
                        onPress={() => void onSave()}
                        isDisabled={saving || draft.trim().length === 0}
                    >
                        {saving && <Loader2 className="mr-1 size-3.5 animate-spin" />}
                        Save note
                    </Button>
                </div>
            </div>

            {/* Timeline */}
            <div>
                <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-muted">
                    Notes {notes.length > 0 && `· ${notes.length}`}
                </p>

                {loading && notes.length === 0 && (
                    <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted">
                        <Loader2 className="size-4 animate-spin" />
                        Loading history…
                    </div>
                )}

                {error && (
                    <div className="flex items-center gap-2 rounded-xl border border-danger/40 bg-danger/5 p-3 text-sm text-danger">
                        <AlertTriangle className="size-4" />
                        {error}
                    </div>
                )}

                {!loading && notes.length === 0 && !error && (
                    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface/50 p-6 text-center text-muted">
                        <ClipboardCheck className="size-6" />
                        <p className="text-sm">
                            No QC notes for this MO yet — yours will be the first.
                        </p>
                    </div>
                )}

                <ul className="flex flex-col gap-2">
                    {notes.map((n) => (
                        <li
                            key={n.uuid}
                            className="rounded-2xl border border-border bg-background p-3"
                        >
                            <div className="flex items-baseline justify-between gap-2 pb-1">
                                <p className="text-xs font-black text-text">
                                    {n.author.full_name || "QC operator"}
                                    {n.workstation && (
                                        <span className="ml-1 font-normal text-muted">
                                            · {n.workstation.name}
                                        </span>
                                    )}
                                </p>
                                <p className="shrink-0 text-[10px] uppercase tracking-wider text-muted">
                                    {formatWhen(n.created_at)}
                                </p>
                            </div>
                            <p className="whitespace-pre-wrap text-sm text-text">
                                {n.note_text}
                            </p>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

function formatWhen(iso: string): string {
    try {
        const d = new Date(iso);
        const now = new Date();
        const diffSec = Math.max(0, (now.getTime() - d.getTime()) / 1000);
        if (diffSec < 60) return "just now";
        if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
        if (diffSec < 86_400) return `${Math.floor(diffSec / 3600)}h ago`;
        return d.toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return iso;
    }
}
