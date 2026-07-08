export interface CompanyIntegration {
    id: number;
    name: string;
    psp_base_url: string | null;
    /** Preview like "psp_live…a1b2" — the raw token never leaves the
     *  server. When null, no token is set. */
    psp_integration_token_masked: string | null;
    /** ISO timestamp of the last successful pull, if any. Server-cached
     *  so it survives page reloads. */
    last_pull_at: string | null;
    outbox: {
        pending: number;
        delivered: number;
        failed: number;
    };
}

export interface SyncResult {
    ok: boolean;
    created: number;
    updated: number;
    deactivated: number;
    errors: string[];
    last_pull_at: string;
}

export interface OutboxSweepResult {
    ok: boolean;
    attempted: number;
    outbox: {
        counts: {
            pending: number;
            in_flight: number;
            delivered: number;
            failed: number;
        };
        has_stuck: boolean;
        has_pending: boolean;
    };
}

export interface SeedHRResult {
    ok: boolean;
    scanned: number;
    created: number;
    matched: number;
    /** New wage rows PSP opened for seeded workers (existing rows
     *  reused via external_id are not counted). */
    wages_created: number;
    /** New reputation events PSP inserted (existing rows reused via
     *  external_id are not counted). */
    reputation_events_created: number;
    skipped_already_linked: number;
    /** Workers where the Employee create itself failed. */
    failed: { worker_id: number; name: string; detail: string }[];
    /** Employees created OK but whose wage push failed. */
    wage_failures: { worker_id: number; name: string; detail: string }[];
    /** Employees created OK but whose reputation event push failed. */
    reputation_failures: {
        worker_id: number;
        reputation_event_id: number;
        detail: string;
    }[];
}

export interface UpdateCompanyIntegrationPayload {
    psp_base_url?: string | null;
    /** Empty string clears the stored token; omit the field to leave
     *  it untouched. */
    psp_integration_token?: string | null;
}

export type IntegrationTestKind =
    | "connected"
    | "not_configured"
    | "unauthorized"
    | "bad_request"
    | "unreachable"
    | "unknown";

export interface IntegrationTestResult {
    ok: boolean;
    kind: IntegrationTestKind;
    detail?: string;
    code?: string | null;
    status_code?: number;
    /** Present when ok=true — the raw PSP /health payload. Shape
     *  matches BackendWeb.IntegrationHealthController.show/2. */
    psp?: {
        ok?: boolean;
        token?: {
            uuid?: string;
            name?: string;
            prefix?: string;
            scopes?: string[];
            last_used_at?: string | null;
        };
        company?: {
            id?: number;
            name?: string;
        };
    };
    raw?: string;
}
