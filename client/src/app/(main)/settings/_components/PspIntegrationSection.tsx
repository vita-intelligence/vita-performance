"use client";

import { useEffect, useState } from "react";
import {
    Plug,
    CheckCircle2,
    XCircle,
    RotateCcw,
    Building2,
    Download,
    Inbox,
    AlertTriangle,
    Users,
} from "lucide-react";

import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useCompanyIntegration } from "@/hooks/useCompanyIntegration";

/**
 * Standalone editor for the PSP integration credentials on the current
 * tenant's Company row. Sits on the settings page alongside the user
 * preferences form but posts to a different endpoint — deliberately
 * separate so mutating the bearer doesn't force a full form resubmit.
 *
 * Token UX:
 *   * When a token is already set, the input starts locked in
 *     "masked" mode showing a preview like "psp_live…a1b2". A
 *     "Replace" button unlocks it, letting the operator paste a fresh
 *     value. Empty submit clears the stored token.
 *   * When no token is set, the input is editable from the start.
 *
 * Base URL is always editable — no secret to protect.
 */
export default function PspIntegrationSection() {
    const {
        integration,
        isLoading,
        save,
        isSaving,
        createCompany,
        isCreating,
        testConnection,
        isTesting,
        testResult,
        resetTest,
        sync,
        isSyncing,
        syncResult,
        sweep,
        isSweeping,
        seedHR,
        isSeedingHR,
        seedHRResult,
    } = useCompanyIntegration();

    const [baseUrl, setBaseUrl] = useState("");
    const [token, setToken] = useState("");
    const [editingToken, setEditingToken] = useState(false);
    const [companyName, setCompanyName] = useState("");

    useEffect(() => {
        if (integration) {
            setBaseUrl(integration.psp_base_url ?? "");
            setEditingToken(!integration.psp_integration_token_masked);
        }
    }, [integration]);

    if (isLoading) {
        return (
            <div className="flex flex-col gap-4">
                <SectionHeader />
                <p className="text-muted text-sm uppercase tracking-widest">
                    Loading…
                </p>
            </div>
        );
    }

    // 404 from the endpoint — user has no Company row yet. Give them
    // a one-click create form so they can self-serve.
    if (!integration) {
        const onCreate = async (e: React.FormEvent) => {
            e.preventDefault();
            const name = companyName.trim();
            if (!name) return;
            await createCompany(name);
            setCompanyName("");
        };
        return (
            <form onSubmit={onCreate} className="flex flex-col gap-4">
                <SectionHeader />
                <div className="flex items-start gap-3 rounded-none border border-border bg-surface p-4">
                    <Building2 className="size-5 text-muted mt-0.5 shrink-0" />
                    <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium text-text">
                            Attach your company to unlock PSP integration
                        </p>
                        <p className="text-xs text-muted">
                            Every tenant needs a Company record before it
                            can talk to PSP. Give it a name — you can
                            wire the base URL + token immediately after.
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
                    <Input
                        label="Company name"
                        placeholder="Vita Manufacture Limited"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        maxLength={200}
                        autoFocus
                    />
                    <Button
                        type="submit"
                        isLoading={isCreating}
                        isDisabled={!companyName.trim()}
                        className="bg-text text-background px-8 h-12 rounded-none font-semibold uppercase tracking-widest text-xs hover:opacity-80 transition-opacity"
                    >
                        Create company
                    </Button>
                </div>
            </form>
        );
    }

    const isConnected =
        !!integration.psp_base_url &&
        !!integration.psp_integration_token_masked;

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload: {
            psp_base_url?: string | null;
            psp_integration_token?: string | null;
        } = {
            psp_base_url: baseUrl.trim() || null,
        };
        if (editingToken) {
            // Empty on the input clears the stored token; otherwise
            // send the pasted value.
            payload.psp_integration_token = token || "";
        }
        await save(payload);
        setToken("");
        setEditingToken(!integration.psp_integration_token_masked && !token);
    };

    return (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <SectionHeader />

            <div className="flex items-center gap-2 text-xs">
                {isConnected ? (
                    <>
                        <CheckCircle2 className="size-4 text-success" />
                        <span className="text-muted uppercase tracking-widest">
                            Connected to
                        </span>
                        <span className="text-text font-mono">
                            {integration.psp_base_url}
                        </span>
                    </>
                ) : (
                    <>
                        <XCircle className="size-4 text-error" />
                        <span className="text-muted uppercase tracking-widest">
                            Not connected — paste the PSP base URL + token
                        </span>
                    </>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                    label="PSP base URL"
                    placeholder="https://vita-psp-backend.azurewebsites.net"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    hint="Local dev: http://localhost:4000"
                />

                {editingToken ? (
                    <Input
                        label="Integration token"
                        placeholder="psp_live_…"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        type="password"
                        autoComplete="off"
                        hint="Mint at /settings/integrations on PSP — shown once"
                    />
                ) : (
                    <Input
                        label="Integration token"
                        value={
                            integration.psp_integration_token_masked ?? ""
                        }
                        isReadOnly
                        endContent={
                            <button
                                type="button"
                                onClick={() => {
                                    setEditingToken(true);
                                    setToken("");
                                }}
                                className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted hover:text-text shrink-0"
                            >
                                <RotateCcw className="size-3" />
                                Replace
                            </button>
                        }
                        hint="Stored — pasted values are never returned"
                    />
                )}
            </div>

            {testResult && (
                <div
                    className={`flex items-start gap-3 border p-3 text-xs ${
                        testResult.ok
                            ? "border-success/40 bg-success/5 text-success"
                            : "border-error/40 bg-error/5 text-error"
                    }`}
                >
                    {testResult.ok ? (
                        <CheckCircle2 className="size-4 mt-0.5 shrink-0" />
                    ) : (
                        <XCircle className="size-4 mt-0.5 shrink-0" />
                    )}
                    <div className="flex flex-col gap-1 flex-1">
                        <span className="font-semibold uppercase tracking-widest">
                            {testResult.ok
                                ? "Connected"
                                : `Failed — ${testResult.kind}`}
                        </span>
                        {testResult.ok && testResult.psp && (
                            <div className="flex flex-col gap-0.5 font-mono text-text/80">
                                <span>
                                    company:{" "}
                                    {testResult.psp.company?.name ?? "—"}
                                </span>
                                <span>
                                    token:{" "}
                                    {testResult.psp.token?.name ?? "unnamed"}
                                    {testResult.psp.token?.prefix
                                        ? ` (${testResult.psp.token.prefix}…)`
                                        : ""}
                                </span>
                                <span>
                                    scopes:{" "}
                                    {testResult.psp.token?.scopes?.length
                                        ? testResult.psp.token.scopes.join(
                                              ", "
                                          )
                                        : "none granted"}
                                </span>
                            </div>
                        )}
                        {!testResult.ok && testResult.detail && (
                            <span className="text-text/80">
                                {testResult.detail}
                            </span>
                        )}
                    </div>
                </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
                <Button
                    type="button"
                    isLoading={isTesting}
                    onPress={async () => {
                        // Test whatever's currently in the form — the
                        // draft, not the stored row — so operators can
                        // verify a token before saving.
                        await testConnection({
                            psp_base_url: baseUrl || null,
                            psp_integration_token: editingToken
                                ? token || null
                                : null,
                        });
                    }}
                    className="border border-border bg-transparent text-text px-6 rounded-none font-semibold uppercase tracking-widest text-xs hover:bg-surface transition-colors"
                >
                    Test connection
                </Button>
                <Button
                    type="submit"
                    isLoading={isSaving}
                    onPress={() => resetTest()}
                    className="bg-text text-background px-8 rounded-none font-semibold uppercase tracking-widest text-xs hover:opacity-80 transition-opacity"
                >
                    Save integration
                </Button>
            </div>

            {/* --- Data sync + outbox panels only make sense once the
                integration is wired. Hide them for the unconfigured
                state so the operator's not tempted to click a button
                that will 400. --- */}
            {isConnected && (
                <>
                    <SyncPanel
                        lastPullAt={integration.last_pull_at}
                        isSyncing={isSyncing}
                        onSync={() => sync()}
                        result={syncResult}
                    />
                    <OutboxPanel
                        outbox={integration.outbox}
                        isSweeping={isSweeping}
                        onSweep={() => sweep()}
                    />
                    <SeedHRPanel
                        isSeeding={isSeedingHR}
                        onSeed={() => seedHR()}
                        result={seedHRResult}
                    />
                </>
            )}
        </form>
    );
}

interface SyncPanelProps {
    lastPullAt: string | null;
    isSyncing: boolean;
    onSync: () => Promise<unknown>;
    result: import("@/types/company").SyncResult | undefined;
}

function SyncPanel({ lastPullAt, isSyncing, onSync, result }: SyncPanelProps) {
    return (
        <div className="flex flex-col gap-3 mt-4">
            <SubHeader icon={<Download className="size-3.5" />} label="Data sync — PSP → vita-performance" />

            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex flex-col gap-0.5">
                    <span className="text-xs uppercase tracking-widest text-muted">
                        Last sync
                    </span>
                    <span className="text-sm font-mono text-text">
                        {lastPullAt
                            ? formatRelative(lastPullAt)
                            : "never — hit Sync now to pull workstations, employees, and items from PSP"}
                    </span>
                </div>
                <Button
                    type="button"
                    isLoading={isSyncing}
                    onPress={() => onSync()}
                    className="border border-border bg-transparent text-text px-6 rounded-none font-semibold uppercase tracking-widest text-xs hover:bg-surface transition-colors"
                >
                    Sync now
                </Button>
            </div>

            {result && (
                <div
                    className={`flex flex-col gap-1 border p-3 text-xs ${
                        result.ok
                            ? "border-success/40 bg-success/5"
                            : "border-warning/40 bg-warning/5"
                    }`}
                >
                    <div className="flex items-center gap-2 font-semibold uppercase tracking-widest text-text">
                        {result.ok ? (
                            <CheckCircle2 className="size-4 text-success" />
                        ) : (
                            <AlertTriangle className="size-4 text-warning" />
                        )}
                        {result.ok ? "Sync complete" : "Sync finished with errors"}
                    </div>
                    <div className="font-mono text-text/80">
                        created: {result.created} · updated: {result.updated} ·
                        deactivated: {result.deactivated}
                    </div>
                    {result.errors.length > 0 && (
                        <ul className="mt-1 flex flex-col gap-0.5 text-error font-mono">
                            {result.errors.map((err, i) => (
                                <li key={i}>! {err}</li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}

interface OutboxPanelProps {
    outbox: { pending: number; delivered: number; failed: number };
    isSweeping: boolean;
    onSweep: () => Promise<unknown>;
}

function OutboxPanel({ outbox, isSweeping, onSweep }: OutboxPanelProps) {
    const hasWork = outbox.pending > 0 || outbox.failed > 0;
    return (
        <div className="flex flex-col gap-3 mt-4">
            <SubHeader icon={<Inbox className="size-3.5" />} label="Push outbox — vita-performance → PSP" />

            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="grid grid-cols-3 gap-6">
                    <Stat
                        label="Pending"
                        value={outbox.pending}
                        tone={outbox.pending > 0 ? "warning" : "muted"}
                    />
                    <Stat
                        label="Delivered"
                        value={outbox.delivered}
                        tone="success"
                    />
                    <Stat
                        label="Failed"
                        value={outbox.failed}
                        tone={outbox.failed > 0 ? "error" : "muted"}
                    />
                </div>
                <Button
                    type="button"
                    isLoading={isSweeping}
                    isDisabled={!hasWork}
                    onPress={() => onSweep()}
                    className="border border-border bg-transparent text-text px-6 rounded-none font-semibold uppercase tracking-widest text-xs hover:bg-surface transition-colors disabled:opacity-50"
                >
                    Retry stuck
                </Button>
            </div>

            <p className="text-xs text-muted">
                Sessions completed on a{" "}
                <span className="font-mono">psp_source_of_truth</span>{" "}
                workstation are auto-pushed to PSP. Anything the sync
                couldn't deliver ends up here — the periodic sweep
                (or this button) retries with exponential backoff.
            </p>
        </div>
    );
}

function SubHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
        <div className="flex items-center gap-3">
            <h3 className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted whitespace-nowrap">
                {icon}
                {label}
            </h3>
            <div className="h-px bg-border flex-1" />
        </div>
    );
}

function Stat({
    label,
    value,
    tone,
}: {
    label: string;
    value: number;
    tone: "success" | "warning" | "error" | "muted";
}) {
    const toneClass = {
        success: "text-success",
        warning: "text-warning",
        error: "text-error",
        muted: "text-muted",
    }[tone];
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-widest text-muted">
                {label}
            </span>
            <span className={`text-2xl font-mono font-semibold ${toneClass}`}>
                {value}
            </span>
        </div>
    );
}

/** Human-readable "3m ago" from an ISO timestamp — no dependency on
 *  date-fns / dayjs, this is the only place we need it. */
function formatRelative(iso: string): string {
    const then = new Date(iso).getTime();
    const now = Date.now();
    const seconds = Math.max(0, Math.floor((now - then) / 1000));
    if (seconds < 5) return "just now";
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function SectionHeader() {
    return (
        <div className="flex items-center gap-4">
            <h2 className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted whitespace-nowrap">
                <Plug className="size-3.5" />
                PSP Integration
            </h2>
            <div className="h-px bg-border flex-1" />
        </div>
    );
}

interface SeedHRPanelProps {
    isSeeding: boolean;
    onSeed: () => Promise<unknown>;
    result: import("@/types/company").SeedHRResult | undefined;
}

/** One-shot: push every active vp Worker to PSP as an HR Employee.
 *  Only shows workers with no `external_id` (already-linked ones are
 *  skipped server-side). After a successful run, each pushed Worker
 *  gets its PSP uuid stamped onto `external_id`, so kiosk sessions
 *  attribute correctly and repeat runs are no-ops. */
function SeedHRPanel({ isSeeding, onSeed, result }: SeedHRPanelProps) {
    return (
        <div className="flex flex-col gap-3 mt-4">
            <SubHeader
                icon={<Users className="size-3.5" />}
                label="HR seed — push workers to PSP"
            />

            <div className="flex items-center justify-between gap-4 flex-wrap">
                <p className="text-xs text-muted max-w-md">
                    Send every vp Worker that isn&apos;t yet linked to PSP.
                    PSP creates a matching Employee; the returned uuid gets
                    stamped onto the local Worker so future kiosk sessions
                    attribute correctly. Idempotent — safe to re-run.
                </p>
                <Button
                    type="button"
                    isLoading={isSeeding}
                    onPress={() => onSeed()}
                    className="border border-border bg-transparent text-text px-6 rounded-none font-semibold uppercase tracking-widest text-xs hover:bg-surface transition-colors"
                >
                    Seed HR now
                </Button>
            </div>

            {result && (
                <div
                    className={`flex flex-col gap-1 border p-3 text-xs ${
                        result.ok
                            ? "border-success/40 bg-success/5"
                            : "border-warning/40 bg-warning/5"
                    }`}
                >
                    <div className="flex items-center gap-2 font-semibold uppercase tracking-widest text-text">
                        {result.ok ? (
                            <CheckCircle2 className="size-4 text-success" />
                        ) : (
                            <AlertTriangle className="size-4 text-warning" />
                        )}
                        {result.ok ? "Seed complete" : "Seed finished with errors"}
                    </div>
                    <div className="font-mono text-text/80">
                        created: {result.created} employees ·{" "}
                        {result.wages_created} wages ·{" "}
                        {result.reputation_events_created} reputation events ·{" "}
                        {result.skipped_already_linked} already linked
                    </div>
                    <div className="font-mono text-text/60 text-[0.65rem]">
                        scanned: {result.scanned} · matched (existing on PSP):{" "}
                        {result.matched}
                    </div>
                    {result.failed.length > 0 && (
                        <ul className="mt-1 flex flex-col gap-0.5 text-error font-mono">
                            {result.failed.map((f) => (
                                <li key={`emp-${f.worker_id}`}>
                                    ! Worker {f.name} ({f.worker_id}): {f.detail}
                                </li>
                            ))}
                        </ul>
                    )}
                    {result.wage_failures.length > 0 && (
                        <ul className="mt-1 flex flex-col gap-0.5 text-warning font-mono">
                            {result.wage_failures.map((f) => (
                                <li key={`wage-${f.worker_id}`}>
                                    ! Wage for {f.name} ({f.worker_id}):{" "}
                                    {f.detail}
                                </li>
                            ))}
                        </ul>
                    )}
                    {result.reputation_failures.length > 0 && (
                        <ul className="mt-1 flex flex-col gap-0.5 text-warning font-mono">
                            {result.reputation_failures.map((f) => (
                                <li
                                    key={`rep-${f.worker_id}-${f.reputation_event_id}`}
                                >
                                    ! Reputation event {f.reputation_event_id}{" "}
                                    (worker {f.worker_id}): {f.detail}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
