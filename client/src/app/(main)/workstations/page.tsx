"use client";

import { useState } from "react";
import { useWorkstations } from "@/hooks/useWorkstations";
import { Workstation } from "@/types/workstation";
import WorkstationTable from "./_components/WorkstationTable";
import WorkstationCards from "./_components/WorkstationCards";
import WorkstationForm from "./_components/WorkstationForm";
import Drawer from "@/components/ui/Drawer";
import WorkstationsHeader from "./_components/WorkstationHeader";

export default function WorkstationsPage() {
    const { workstations, isLoading } = useWorkstations();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedWorkstation, setSelectedWorkstation] = useState<Workstation | undefined>(undefined);

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
        <main className="min-h-screen bg-background px-4 py-12 sm:px-8 lg:px-16">
            <div className="max-w-6xl mx-auto flex flex-col gap-10">
                <WorkstationsHeader onAdd={handleAdd} />

                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <p className="text-muted text-sm uppercase tracking-widest">Loading...</p>
                    </div>
                ) : !workstations?.length ? (
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
                        <WorkstationTable workstations={workstations} onEdit={handleEdit} />
                        <WorkstationCards workstations={workstations} onEdit={handleEdit} />
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