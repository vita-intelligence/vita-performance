"use client";

import { useEffect, useRef, useState } from "react";
import { useWorkstations } from "@/hooks/useWorkstations";
import { Workstation } from "@/types/workstation";
import WorkstationTable from "./_components/WorkstationTable";
import WorkstationCards from "./_components/WorkstationCards";
import WorkstationForm from "./_components/WorkstationForm";
import Drawer from "@/components/ui/Drawer";
import WorkstationsHeader from "./_components/WorkstationHeader";

export default function WorkstationsPage() {
    const {
        paginatedWorkstations,
        isPaginatedLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useWorkstations();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedWorkstation, setSelectedWorkstation] = useState<Workstation | undefined>(undefined);
    const loadMoreRef = useRef<HTMLDivElement | null>(null);

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

                {isPaginatedLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <p className="text-muted text-sm uppercase tracking-widest">Loading...</p>
                    </div>
                ) : !paginatedWorkstations.length ? (
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
                        <WorkstationTable workstations={paginatedWorkstations} onEdit={handleEdit} />
                        <WorkstationCards workstations={paginatedWorkstations} onEdit={handleEdit} />

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
