"use client";

import { useEffect, useRef, useState } from "react";
import { useWorkers } from "@/hooks/useWorkers";
import { WorkerGroup } from "@/types/worker";
import GroupsHeader from "./_components/GroupsHeader";
import GroupTable from "./_components/GroupTable";
import GroupCards from "./_components/GroupCards";
import GroupForm from "./_components/GroupForm";
import Drawer from "@/components/ui/Drawer";

export default function GroupsPage() {
    const {
        paginatedGroups,
        isPaginatedGroupsLoading,
        fetchNextGroupsPage,
        hasNextGroupsPage,
        isFetchingNextGroupsPage,
    } = useWorkers();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<WorkerGroup | undefined>(undefined);
    const loadMoreRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!hasNextGroupsPage) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    fetchNextGroupsPage();
                }
            },
            { threshold: 1 }
        );

        const el = loadMoreRef.current;
        if (el) observer.observe(el);
        return () => { if (el) observer.unobserve(el); };
    }, [fetchNextGroupsPage, hasNextGroupsPage]);

    const handleAdd = () => {
        setSelectedGroup(undefined);
        setIsDrawerOpen(true);
    };

    const handleEdit = (group: WorkerGroup) => {
        setSelectedGroup(group);
        setIsDrawerOpen(true);
    };

    const handleClose = () => {
        setIsDrawerOpen(false);
        setSelectedGroup(undefined);
    };

    return (
        <main className="bg-background px-4 py-12 sm:px-8 lg:px-16">
            <div className="max-w-6xl mx-auto flex flex-col gap-10">
                <GroupsHeader onAdd={handleAdd} />

                {isPaginatedGroupsLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <p className="text-muted text-sm uppercase tracking-widest">Loading...</p>
                    </div>
                ) : !paginatedGroups.length ? (
                    <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border gap-4">
                        <p className="text-muted text-sm uppercase tracking-widest">No groups yet</p>
                        <button
                            onClick={handleAdd}
                            className="text-xs font-semibold uppercase tracking-widest text-text underline"
                        >
                            Create your first group
                        </button>
                    </div>
                ) : (
                    <>
                        <GroupTable groups={paginatedGroups} onEdit={handleEdit} />
                        <GroupCards groups={paginatedGroups} onEdit={handleEdit} />

                        <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
                            {isFetchingNextGroupsPage && (
                                <p className="text-muted text-xs uppercase tracking-widest">Loading more...</p>
                            )}
                        </div>
                    </>
                )}
            </div>

            <Drawer
                isOpen={isDrawerOpen}
                onClose={handleClose}
                title={selectedGroup ? "Edit Group" : "New Group"}
            >
                <GroupForm
                    group={selectedGroup}
                    onClose={handleClose}
                />
            </Drawer>
        </main>
    );
}
