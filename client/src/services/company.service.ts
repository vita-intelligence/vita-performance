import api from "@/lib/api";
import { API_CONFIG } from "@/config/api";
import type {
    CompanyIntegration,
    IntegrationTestResult,
    OutboxSweepResult,
    SeedHRResult,
    SyncResult,
    UpdateCompanyIntegrationPayload,
} from "@/types/company";

const {
    integration,
    integrationTest,
    integrationSync,
    integrationOutboxSweep,
    integrationSeedHR,
    mine,
} = API_CONFIG.endpoints.companies;

export const companyService = {
    getIntegration: async (): Promise<CompanyIntegration> => {
        const { data } = await api.get<CompanyIntegration>(integration);
        return data;
    },
    updateIntegration: async (
        payload: UpdateCompanyIntegrationPayload
    ): Promise<CompanyIntegration> => {
        const { data } = await api.patch<CompanyIntegration>(
            integration,
            payload
        );
        return data;
    },
    /** Create a Company for the current user + auto-attach it as
     *  their `owned_company`. Server returns 409 if they already
     *  have one — that's caught upstream in the hook. */
    createMine: async (name: string): Promise<CompanyIntegration> => {
        const { data } = await api.post<CompanyIntegration>(mine, { name });
        return data;
    },
    /** Ping PSP /api/integration/health with the current or draft
     *  creds. Server always 200s; inspect ``ok`` + ``kind``. */
    testIntegration: async (payload: {
        psp_base_url?: string | null;
        psp_integration_token?: string | null;
    } = {}): Promise<IntegrationTestResult> => {
        const { data } = await api.post<IntegrationTestResult>(
            integrationTest,
            payload
        );
        return data;
    },
    /** Pull workstations + employees + items from PSP. Synchronous
     *  on the server — response contains the counts. */
    syncFromPsp: async (): Promise<SyncResult> => {
        const { data } = await api.post<SyncResult>(integrationSync);
        return data;
    },
    /** Retry every pending / stuck outbox entry, one attempt each.
     *  Returns updated outbox counts inline. */
    sweepOutbox: async (): Promise<OutboxSweepResult> => {
        const { data } = await api.post<OutboxSweepResult>(
            integrationOutboxSweep
        );
        return data;
    },
    /** One-shot: push every unlinked vp Worker to PSP as an HR
     *  Employee. Idempotent — Workers with `external_id` already set
     *  are skipped. Returns counts + a per-failure list. */
    seedHR: async (): Promise<SeedHRResult> => {
        const { data } = await api.post<SeedHRResult>(integrationSeedHR);
        return data;
    },
};
