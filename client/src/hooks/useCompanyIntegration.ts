import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addToast } from "@heroui/react";

import { companyService } from "@/services/company.service";
import type {
    IntegrationTestResult,
    OutboxSweepResult,
    SeedHRResult,
    SyncResult,
    UpdateCompanyIntegrationPayload,
} from "@/types/company";
import { getErrorMessage } from "@/lib/utils";

const KEY = ["company", "integration"];

export const useCompanyIntegration = () => {
    const qc = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: KEY,
        queryFn: () => companyService.getIntegration(),
        retry: false,
    });

    const save = useMutation({
        mutationFn: (p: UpdateCompanyIntegrationPayload) =>
            companyService.updateIntegration(p),
        onSuccess: (fresh) => {
            qc.setQueryData(KEY, fresh);
            addToast({
                title: "PSP integration saved",
                color: "success",
                timeout: 3000,
            });
        },
        onError: (err) => {
            addToast({
                title: "Couldn't save integration",
                description: getErrorMessage(err),
                color: "danger",
                timeout: 4000,
            });
        },
    });

    const createCompany = useMutation({
        mutationFn: (name: string) => companyService.createMine(name),
        onSuccess: (fresh) => {
            qc.setQueryData(KEY, fresh);
            addToast({
                title: "Company created",
                color: "success",
                timeout: 3000,
            });
        },
        onError: (err) => {
            addToast({
                title: "Couldn't create company",
                description: getErrorMessage(err),
                color: "danger",
                timeout: 4000,
            });
        },
    });

    const testConnection = useMutation<
        IntegrationTestResult,
        Error,
        { psp_base_url?: string | null; psp_integration_token?: string | null } | undefined
    >({
        mutationFn: (payload) => companyService.testIntegration(payload ?? {}),
        onError: (err) => {
            addToast({
                title: "Couldn't test integration",
                description: getErrorMessage(err),
                color: "danger",
                timeout: 4000,
            });
        },
    });

    const sync = useMutation<SyncResult, Error, void>({
        mutationFn: () => companyService.syncFromPsp(),
        onSuccess: (result) => {
            qc.invalidateQueries({ queryKey: KEY });
            addToast({
                title: result.ok
                    ? "Synced from PSP"
                    : "Synced with errors",
                description: result.ok
                    ? `${result.created} created · ${result.updated} updated · ${result.deactivated} deactivated`
                    : `${result.errors.length} error(s) — see details`,
                color: result.ok ? "success" : "warning",
                timeout: 4000,
            });
        },
        onError: (err) => {
            addToast({
                title: "Sync failed",
                description: getErrorMessage(err),
                color: "danger",
                timeout: 4000,
            });
        },
    });

    const sweep = useMutation<OutboxSweepResult, Error, void>({
        mutationFn: () => companyService.sweepOutbox(),
        onSuccess: (result) => {
            qc.invalidateQueries({ queryKey: KEY });
            addToast({
                title: `Outbox swept — ${result.attempted} attempted`,
                color: "success",
                timeout: 3000,
            });
        },
        onError: (err) => {
            addToast({
                title: "Sweep failed",
                description: getErrorMessage(err),
                color: "danger",
                timeout: 4000,
            });
        },
    });

    const seedHR = useMutation<SeedHRResult, Error, void>({
        mutationFn: () => companyService.seedHR(),
        onSuccess: (result) => {
            qc.invalidateQueries({ queryKey: KEY });
            const totalFailures =
                result.failed.length +
                result.wage_failures.length +
                result.reputation_failures.length;
            addToast({
                title: result.ok
                    ? `Seeded ${result.created} employees to PSP`
                    : "Seed finished with errors",
                description: result.ok
                    ? `${result.created} employees · ${result.wages_created} wages · ${result.reputation_events_created} reputation events · ${result.skipped_already_linked} already linked`
                    : `${totalFailures} failure(s) — check logs`,
                color: result.ok ? "success" : "warning",
                timeout: 4000,
            });
        },
        onError: (err) => {
            addToast({
                title: "Seed failed",
                description: getErrorMessage(err),
                color: "danger",
                timeout: 4000,
            });
        },
    });

    return {
        integration: data,
        isLoading,
        save: save.mutateAsync,
        isSaving: save.isPending,
        createCompany: createCompany.mutateAsync,
        isCreating: createCompany.isPending,
        testConnection: testConnection.mutateAsync,
        isTesting: testConnection.isPending,
        testResult: testConnection.data,
        resetTest: testConnection.reset,
        sync: sync.mutateAsync,
        isSyncing: sync.isPending,
        syncResult: sync.data,
        sweep: sweep.mutateAsync,
        isSweeping: sweep.isPending,
        seedHR: seedHR.mutateAsync,
        isSeedingHR: seedHR.isPending,
        seedHRResult: seedHR.data,
    };
};
