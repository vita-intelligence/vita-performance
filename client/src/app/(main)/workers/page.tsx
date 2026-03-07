"use client";

import { useState } from "react";
import { useWorkers } from "@/hooks/useWorkers";
import { Worker } from "@/types/worker";
import WorkersHeader from "./_components/WorkersHeader";
import WorkerTable from "./_components/WorkerTable";
import WorkerCards from "./_components/WorkerCards";
import WorkerForm from "./_components/WorkerForm";
import Drawer from "@/components/ui/Drawer";
import QCLinkCard from "@/components/shared/QCLinkCard";

export default function WorkersPage() {
    const { workers, isWorkersLoading } = useWorkers();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedWorker, setSelectedWorker] = useState<Worker | undefined>(undefined);

    const handleAdd = () => {
        setSelectedWorker(undefined);
        setIsDrawerOpen(true);
    };

    const handleEdit = (worker: Worker) => {
        setSelectedWorker(worker);
        setIsDrawerOpen(true);
    };

    const handleClose = () => {
        setIsDrawerOpen(false);
        setSelectedWorker(undefined);
    };

    return (
        <main className="bg-background px-4 py-12 sm:px-8 lg:px-16">
            <div className="max-w-6xl mx-auto flex flex-col gap-10">
                <WorkersHeader onAdd={handleAdd} />
                <QCLinkCard />

                {isWorkersLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <p className="text-muted text-sm uppercase tracking-widest">Loading...</p>
                    </div>
                ) : !workers?.length ? (
                    <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border gap-4">
                        <p className="text-muted text-sm uppercase tracking-widest">No workers yet</p>
                        <button
                            onClick={handleAdd}
                            className="text-xs font-semibold uppercase tracking-widest text-text underline"
                        >
                            Add your first worker
                        </button>
                    </div>
                ) : (
                    <>
                        <WorkerTable workers={workers} onEdit={handleEdit} />
                        <WorkerCards workers={workers} onEdit={handleEdit} />
                    </>
                )}
            </div>

            <Drawer
                isOpen={isDrawerOpen}
                onClose={handleClose}
                title={selectedWorker ? "Edit Worker" : "New Worker"}
            >
                <WorkerForm
                    worker={selectedWorker}
                    onClose={handleClose}
                />
            </Drawer>
        </main>
    );
}