"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PlugZap, Info } from "lucide-react";
import { useWorkstations } from "@/hooks/useWorkstations";
import { useCompanyIntegration } from "@/hooks/useCompanyIntegration";
import { Workstation } from "@/types/workstation";
import WorkstationTable from "./_components/WorkstationTable";
import WorkstationCards from "./_components/WorkstationCards";
import WorkstationForm from "./_components/WorkstationForm";
import Drawer from "@/components/ui/Drawer";
import WorkstationsHeader from "./_components/WorkstationHeader";
import { workstationSource } from "./_components/WorkstationSourceBadge";

export default function WorkstationsPage() {
    const {
        paginatedWorkstations,
        isPaginatedLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useWorkstations();
    const { integration } = useCompanyIntegration();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedWorkstation, setSelectedWorkstation] = useState<Workstation | undefined>(undefined);
    const [hideLegacy, setHideLegacy] = useState(true);
    const loadMoreRef = useRef<HTMLDivElement | null>(null);

    // "Legacy" = a local row PSP doesn't own OR a PSP row PSP has
    // since removed. Both are meaningless for kiosk work once the
    // integration is live — hide them by default, expose behind a
    // toggle so the operator can still audit them.
    const pspConnected = Boolean(
        integration?.psp_base_url && integration.psp_integration_token_masked
    );
    const legacyCount = useMemo(
        () =>
            paginatedWorkstations.filter(
                (w) => workstationSource(w) !== "psp_live"
            ).length,
        [paginatedWorkstations]
    );
    const visibleWorkstations = useMemo(
        () =>
            hideLegacy && pspConnected
                ? paginatedWorkstations.filter(
                    (w) => workstationSource(w) === "psp_live"
                )
                : paginatedWorkstations,
        [paginatedWorkstations, hideLegacy, pspConnected]
    );

    useEffect(() => {
        if (!hasNextPage) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    fetchNextPage();
                }
            },
            { threshold: 1 }
        );

        const el = loadMoreRef.current;
        if (el) observer.observe(el);
        return () => { if (el) observer.unobserve(el); };
    }, [fetchNextPage, hasNextPage]);

    const handleAdd = () => {
        setSelectedWorkstation(undefined);
        setIsDrawerOpen(true);
    };

    const handleEdit = (workstation: Workstation) => {
        setSelectedWorkstation(workstation);
        setIsDrawerOpen(true);
    };

    const handleClose = () => {
        setIsDrawerOpen(false);
        setSelectedWorkstation(undefined);
    };

    return (
        <main className="bg-background px-4 py-12 sm:px-8 lg:px-16">
            <div className="max-w-6xl mx-auto flex flex-col gap-10">
                <WorkstationsHeader onAdd={handleAdd} />

                {pspConnected && legacyCount > 0 && (
                    <div className="flex items-start gap-3 border border-border bg-surface p-4">
                        <Info className="size-5 text-muted mt-0.5 shrink-0" />
                        <div className="flex flex-col gap-2 flex-1">
                            <div className="flex items-center gap-2">
                                <PlugZap className="size-4 text-success" />
                                <p className="text-sm font-semibold text-text">
                                    PSP is the source of truth for workstations
                                </p>
                            </div>
                            <p className="text-xs text-muted leading-relaxed">
                                Kiosk sessions push back to PSP only from{" "}
                                <span className="text-success font-semibold">
                                    PSP · Live
                                </span>{" "}
                                rows. Anything else is a stale mirror
                                (removed from PSP) or a local-only row
                                that predates the integration.{" "}
                                {hideLegacy ? (
                                    <>
                                        {legacyCount} legacy row
                                        {legacyCount === 1 ? "" : "s"}{" "}
                                        hidden.
                                    </>
                                ) : (
                                    <>
                                        Showing {legacyCount} legacy row
                                        {legacyCount === 1 ? "" : "s"} for
                                        audit.
                                    </>
                                )}
                            </p>
                            <button
                                type="button"
                                onClick={() => setHideLegacy((v) => !v)}
                                className="self-start text-xs font-semibold uppercase tracking-widest text-text underline underline-offset-4 hover:opacity-80"
                            >
                                {hideLegacy ? "Show legacy rows" : "Hide legacy rows"}
                            </button>
                        </div>
                    </div>
                )}

                {isPaginatedLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <p className="text-muted text-sm uppercase tracking-widest">Loading...</p>
                    </div>
                ) : !visibleWorkstations.length ? (
                    <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border gap-4">
                        <p className="text-muted text-sm uppercase tracking-widest">No workstations yet</p>
                        <button
                            onClick={handleAdd}
                            className="text-xs font-semibold uppercase tracking-widest text-text underline"
                        >
                            Create your first workstation
                        </button>
                    </div>
                ) : (
                    <>
                        <WorkstationTable workstations={visibleWorkstations} onEdit={handleEdit} />
                        <WorkstationCards workstations={visibleWorkstations} onEdit={handleEdit} />

                        <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
                            {isFetchingNextPage && (
                                <p className="text-muted text-xs uppercase tracking-widest">Loading more...</p>
                            )}
                        </div>
                    </>
                )}
            </div>

            <Drawer
                isOpen={isDrawerOpen}
                onClose={handleClose}
                title={selectedWorkstation ? "Edit Workstation" : "New Workstation"}
            >
                <WorkstationForm
                    workstation={selectedWorkstation}
                    onClose={handleClose}
                />
            </Drawer>
        </main>
    );
}
