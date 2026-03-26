"use client";

import { useEffect, useRef, useState } from "react";
import { useItems } from "@/hooks/useItems";
import { useDebounce } from "@/hooks/useDebounce";
import { Item } from "@/types/item";
import ItemsHeader from "./_components/ItemsHeader";
import ItemList from "./_components/ItemList";
import ItemForm from "./_components/ItemForm";
import Drawer from "@/components/ui/Drawer";

export default function ItemsPage() {
    const [searchInput, setSearchInput] = useState("");
    const debouncedSearch = useDebounce(searchInput, 300);
    const {
        items,
        isItemsLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useItems(debouncedSearch || undefined);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<Item | undefined>(undefined);
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
        setSelectedItem(undefined);
        setIsDrawerOpen(true);
    };

    const handleEdit = (item: Item) => {
        setSelectedItem(item);
        setIsDrawerOpen(true);
    };

    const handleClose = () => {
        setIsDrawerOpen(false);
        setSelectedItem(undefined);
    };

    return (
        <main className="bg-background px-4 py-12 sm:px-8 lg:px-16">
            <div className="max-w-6xl mx-auto flex flex-col gap-10">
                <ItemsHeader onAdd={handleAdd} />

                <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search items..."
                    className="w-full border border-border bg-background text-text px-4 py-3 text-sm outline-none focus:border-text transition-colors"
                />

                {isItemsLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <p className="text-muted text-sm uppercase tracking-widest">Loading...</p>
                    </div>
                ) : !items.length ? (
                    <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border gap-4">
                        <p className="text-muted text-sm uppercase tracking-widest">
                            {debouncedSearch ? "No items found" : "No items yet"}
                        </p>
                        {!debouncedSearch && (
                            <button
                                onClick={handleAdd}
                                className="text-xs font-semibold uppercase tracking-widest text-text underline"
                            >
                                Add your first item
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <ItemList items={items} onEdit={handleEdit} />

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
                title={selectedItem ? "Edit Item" : "New Item"}
            >
                <ItemForm item={selectedItem} onClose={handleClose} />
            </Drawer>
        </main>
    );
}
