"use client";

import { useEffect, useRef, useState } from "react";
import { useDynamicForms } from "@/hooks/useDynamicForms";
import { DynamicForm } from "@/types/dynamic-form";
import FormsHeader from "./_components/FormsHeader";
import FormsTable from "./_components/FormsTable";
import FormsCards from "./_components/FormsCards";
import FormSettingsDrawer from "./_components/FormSettingsDrawer";
import FormBuilder from "./_components/FormBuilder";

export default function FormsPage() {
    const {
        paginatedForms,
        isPaginatedLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useDynamicForms();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedForm, setSelectedForm] = useState<DynamicForm | undefined>(undefined);
    const [buildingForm, setBuildingForm] = useState<DynamicForm | null>(null);
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
        setSelectedForm(undefined);
        setDrawerOpen(true);
    };

    const handleEdit = (form: DynamicForm) => {
        setSelectedForm(form);
        setDrawerOpen(true);
    };

    const handleBuild = (form: DynamicForm) => {
        setBuildingForm(form);
    };

    const handleCloseDrawer = () => {
        setDrawerOpen(false);
        setSelectedForm(undefined);
    };

    const handleCloseBuilder = () => {
        setBuildingForm(null);
    };

    return (
        <main className="bg-background px-4 py-12 sm:px-8 lg:px-16">
            <div className="max-w-6xl mx-auto flex flex-col gap-10">
                <FormsHeader onAdd={handleAdd} />

                {isPaginatedLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <p className="text-muted text-sm uppercase tracking-widest">Loading...</p>
                    </div>
                ) : !paginatedForms.length ? (
                    <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border gap-4">
                        <p className="text-muted text-sm uppercase tracking-widest">No forms yet</p>
                        <button
                            onClick={handleAdd}
                            className="text-xs font-semibold uppercase tracking-widest text-text underline"
                        >
                            Create your first form
                        </button>
                    </div>
                ) : (
                    <>
                        <FormsTable
                            forms={paginatedForms}
                            onEdit={handleEdit}
                            onBuild={handleBuild}
                        />
                        <FormsCards
                            forms={paginatedForms}
                            onEdit={handleEdit}
                            onBuild={handleBuild}
                        />

                        <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
                            {isFetchingNextPage && (
                                <p className="text-muted text-xs uppercase tracking-widest">Loading more...</p>
                            )}
                        </div>
                    </>
                )}
            </div>

            <FormSettingsDrawer
                form={selectedForm}
                isOpen={drawerOpen}
                onClose={handleCloseDrawer}
            />

            {buildingForm && (
                <FormBuilder
                    form={buildingForm}
                    onClose={handleCloseBuilder}
                />
            )}
        </main>
    );
}
