"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { Button, addToast } from "@heroui/react";
import {
    AlertTriangle,
    ChevronRight,
    ClipboardCheck,
    FileCheck,
    FileText,
    Layers,
    Loader2,
    MessageSquarePlus,
} from "lucide-react";
import { personalKioskService } from "@/services/personal-kiosk.service";

type QcContext = Awaited<
    ReturnType<typeof personalKioskService.getQCMoContext>
>;

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
    const [context, setContext] = useState<QcContext | null>(null);
    const [contextLoading, setContextLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setContextLoading(true);
        personalKioskService
            .getQCMoContext(token, sessionToken, moUuid)
            .then((res) => {
                if (!cancelled) setContext(res);
            })
            .catch(() => {
                // Silent-degrade — the notes area still works even if
                // PSP is unreachable; missing context isn't blocking.
                if (!cancelled) setContext(null);
            })
            .finally(() => {
                if (!cancelled) setContextLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [token, sessionToken, moUuid]);

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

            {/* Product header — resolved from PSP so QC sees the real
                item name + qty even before typing a note. */}
            {context?.mo && (
                <div className="rounded-2xl border border-border bg-background p-3">
                    <p className="text-sm font-black text-text">
                        {context.mo.item_name || "—"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted">
                        Qty {context.mo.quantity ?? "—"}
                        {context.mo.status && ` · ${context.mo.status}`}
                        {context.mo.due_date && ` · due ${context.mo.due_date}`}
                    </p>
                </div>
            )}

            {/* Context sections — Spec, Validation, BOM. All three
                collapsed by default; iframe/table only mounts on the
                first open (keep-alive after that so re-open is
                instant). Empty when PSP is unreachable — the notes
                area below still works. */}
            <QCContextSections
                context={context}
                loading={contextLoading}
                token={token}
                sessionToken={sessionToken}
                moUuid={moUuid}
            />


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

/* =====================================================================
 *  Context sections — collapsible + lazy.
 *
 *  Order matches the PSP Output-QC page (spec → validation → BOM) so
 *  QC's mental flow is consistent across the office review and the
 *  live-floor kiosk.
 *
 *  All three sections are collapsed by default. On the first expand:
 *    • Spec / Validation → iframe MOUNTS (browser fires the proxy
 *      request); staying open thereafter is a CSS toggle so re-opening
 *      doesn't refetch NPD's HTML.
 *    • BOM → the table renders. The data itself piggybacks on the
 *      cheap context fetch that's already on mount, so opening is
 *      free — no extra network hit.
 * ================================================================== */
function QCContextSections({
    context,
    loading,
    token,
    sessionToken,
    moUuid,
}: {
    context: QcContext | null;
    loading: boolean;
    token: string;
    sessionToken: string;
    moUuid: string;
}) {
    if (loading) {
        return (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface/50 p-3 text-xs text-muted">
                <Loader2 className="size-3.5 animate-spin" />
                Loading MO context…
            </div>
        );
    }
    if (!context) return null;

    const hasSpec = !!context.finished_product_spec;
    const hasValidation = !!context.npd_links.validation;
    const parts = context.parts;

    if (!hasSpec && !hasValidation && parts.length === 0) return null;

    return (
        <div className="flex flex-col gap-2">
            {hasSpec && (
                <NpdIframeSection
                    title="Specification sheet"
                    icon={<FileText className="size-4 text-primary" />}
                    src={personalKioskService.qcMoNpdSpecIframeUrl(
                        token,
                        sessionToken,
                        moUuid,
                    )}
                    loadingLabel="Loading NPD spec sheet…"
                />
            )}
            {hasValidation && (
                <NpdIframeSection
                    title="Product validation"
                    icon={<FileCheck className="size-4 text-primary" />}
                    src={personalKioskService.qcMoNpdValidationIframeUrl(
                        token,
                        sessionToken,
                        moUuid,
                    )}
                    loadingLabel="Loading NPD validation…"
                />
            )}
            {parts.length > 0 && (
                <CollapsibleShell
                    title={`Bill of materials · ${parts.length} line${
                        parts.length === 1 ? "" : "s"
                    }`}
                    icon={<Layers className="size-4 text-primary" />}
                >
                    <ul className="divide-y divide-border text-[12px]">
                        {parts.map((p) => (
                            <li
                                key={p.uuid ?? `${p.sort_order}-${p.part_code}`}
                                className="flex items-baseline justify-between gap-3 py-1.5"
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-text">
                                        {p.part_name || p.part_code || "—"}
                                    </p>
                                    {p.part_code && p.part_name && (
                                        <p className="truncate text-[10px] text-muted">
                                            {p.part_code}
                                        </p>
                                    )}
                                </div>
                                <p className="shrink-0 font-mono text-[12px] tabular-nums text-text">
                                    {p.required_qty ?? "—"}
                                    {p.uom && (
                                        <span className="ml-1 text-muted">
                                            {p.uom}
                                        </span>
                                    )}
                                </p>
                            </li>
                        ))}
                    </ul>
                </CollapsibleShell>
            )}
        </div>
    );
}

/**
 * Card shell with a chevron + title header that toggles open/closed
 * and keeps its children mounted after the first open.
 */
function CollapsibleShell({
    title,
    icon,
    defaultOpen = false,
    children,
}: {
    title: string;
    icon: ReactNode;
    defaultOpen?: boolean;
    children: ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen);
    const [hasOpened, setHasOpened] = useState(defaultOpen);

    const toggle = () => {
        setOpen((v) => {
            if (!v) setHasOpened(true);
            return !v;
        });
    };

    return (
        <section className="overflow-hidden rounded-2xl border border-border bg-surface">
            <button
                type="button"
                onClick={toggle}
                className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-background/40"
            >
                <ChevronRight
                    className={`size-4 text-muted transition-transform ${
                        open ? "rotate-90" : ""
                    }`}
                />
                {icon}
                <p className="flex-1 text-sm font-black text-text">{title}</p>
                <span className="text-[10px] uppercase tracking-widest text-muted">
                    {open ? "Hide" : "Show"}
                </span>
            </button>
            {hasOpened && (
                <div
                    className="border-t border-border px-3 py-3"
                    hidden={!open}
                >
                    {children}
                </div>
            )}
        </section>
    );
}

/**
 * Collapsible iframe embed for one of PSP's NPD-proxied HTML docs
 * (spec sheet / validation). Iframe DOM node is not mounted until
 * the section is expanded the first time — same rule as PSP's
 * ``NpdSheetEmbed``, so the browser only fires the upstream request
 * on-demand and re-opening is a CSS toggle after that.
 *
 * The mount-race guard (readyState poll) is the same trick PSP uses:
 * cached upstream responses can resolve before React binds the
 * ``onLoad`` handler, so we poll ``contentDocument.readyState`` and
 * clear the spinner ourselves as a fallback. Iframe scrolls
 * internally rather than resizing — the tablet viewport is small
 * enough that a fixed height per section keeps the notes composer
 * within thumb reach at all times.
 */
function NpdIframeSection({
    title,
    icon,
    src,
    loadingLabel,
}: {
    title: string;
    icon: ReactNode;
    src: string;
    loadingLabel: string;
}) {
    const [open, setOpen] = useState(false);
    const [hasOpened, setHasOpened] = useState(false);
    const [loading, setLoading] = useState(true);
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const pollRef = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            if (pollRef.current !== null) {
                window.clearInterval(pollRef.current);
                pollRef.current = null;
            }
        };
    }, []);

    const finishLoad = () => {
        setLoading(false);
        if (pollRef.current !== null) {
            window.clearInterval(pollRef.current);
            pollRef.current = null;
        }
    };

    const attachIframe = (el: HTMLIFrameElement | null) => {
        iframeRef.current = el;
        if (!el) return;
        if (pollRef.current !== null) return;
        pollRef.current = window.setInterval(() => {
            const doc = el.contentDocument;
            if (doc?.readyState === "complete") finishLoad();
        }, 150);
    };

    const toggle = () => {
        setOpen((v) => {
            if (!v) setHasOpened(true);
            return !v;
        });
    };

    return (
        <section className="overflow-hidden rounded-2xl border border-border bg-surface">
            <button
                type="button"
                onClick={toggle}
                className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-background/40"
            >
                <ChevronRight
                    className={`size-4 text-muted transition-transform ${
                        open ? "rotate-90" : ""
                    }`}
                />
                {icon}
                <p className="flex-1 text-sm font-black text-text">{title}</p>
                <span className="text-[10px] uppercase tracking-widest text-muted">
                    {open ? "Hide" : "Show"}
                </span>
            </button>
            {hasOpened && (
                <div
                    className="relative border-t border-border bg-white"
                    hidden={!open}
                >
                    {loading && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white text-xs text-muted">
                            <Loader2 className="mr-2 size-4 animate-spin" />
                            {loadingLabel}
                        </div>
                    )}
                    <iframe
                        ref={attachIframe}
                        src={src}
                        title={title}
                        onLoad={finishLoad}
                        onError={() => setLoading(false)}
                        className="block h-[70vh] w-full border-0 bg-white"
                    />
                </div>
            )}
        </section>
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
