"use client";

import { useState } from "react";
import { Item } from "@/types/item";
import { formatDate } from "@/lib/utils/date.utils";
import { useSettings } from "@/hooks/useSettings";
import ItemDetailsDrawer from "./ItemDetailsDrawer";

interface ItemListProps {
    items: Item[];
    onEdit: (item: Item) => void;
}

export default function ItemList({ items, onEdit }: ItemListProps) {
    const { settings } = useSettings();
    const [detailsItem, setDetailsItem] = useState<Item | null>(null);

    return (
        <div className="flex flex-col gap-4">
            <div className="border border-border overflow-hidden">
                <table className="w-full text-sm table-fixed">
                    <thead>
                        <tr className="border-b border-border bg-surface">
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Name</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted hidden sm:table-cell w-[40%]">Created</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr
                                key={item.id}
                                onClick={() => setDetailsItem(item)}
                                className={`border-b border-border hover:bg-surface transition-colors cursor-pointer ${index % 2 === 0 ? "bg-background" : "bg-surface/50"
                                    }`}
                            >
                                <td className="px-4 py-3 font-medium text-text truncate">{item.name}</td>
                                <td className="px-4 py-3 text-muted hidden sm:table-cell truncate">
                                    {formatDate(item.created_at, settings)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <ItemDetailsDrawer
                item={detailsItem}
                onClose={() => setDetailsItem(null)}
                onEdit={onEdit}
            />
        </div>
    );
}
