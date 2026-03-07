"use client";

import { useState } from "react";
import { useItems } from "@/hooks/useItems";
import { Item } from "@/types/item";
import ItemsHeader from "./_components/ItemsHeader";
import ItemList from "./_components/ItemList";
import ItemForm from "./_components/ItemForm";
import Drawer from "@/components/ui/Drawer";

export default function ItemsPage() {
    const { items, isItemsLoading } = useItems();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<Item | undefined>(undefined);

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
            <div className="max-w-4xl mx-auto flex flex-col gap-10">
                <ItemsHeader onAdd={handleAdd} />

                {isItemsLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <p className="text-muted text-sm uppercase tracking-widest">Loading...</p>
                    </div>
                ) : !items?.length ? (
                    <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border gap-4">
                        <p className="text-muted text-sm uppercase tracking-widest">No items yet</p>
                        <button
                            onClick={handleAdd}
                            className="text-xs font-semibold uppercase tracking-widest text-text underline"
                        >
                            Add your first item
                        </button>
                    </div>
                ) : (
                    <ItemList items={items} onEdit={handleEdit} />
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