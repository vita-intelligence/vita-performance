"use client";

import { Item } from "@/types/item";
import { useItems } from "@/hooks/useItems";
import { formatDate } from "@/lib/utils/date.utils";
import { useSettings } from "@/hooks/useSettings";

interface ItemListProps {
    items: Item[];
    onEdit: (item: Item) => void;
}

export default function ItemList({ items, onEdit }: ItemListProps) {
    const { deleteItem, isDeletingItem } = useItems();
    const { settings } = useSettings();

    return (
        <div className="flex flex-col gap-4">
            <div className="border border-border overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border bg-surface">
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Name</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted hidden sm:table-cell">Created</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr
                                key={item.id}
                                className={`border-b border-border hover:bg-surface transition-colors ${index % 2 === 0 ? "bg-background" : "bg-surface/50"
                                    }`}
                            >
                                <td className="px-4 py-3 font-medium text-text">{item.name}</td>
                                <td className="px-4 py-3 text-muted hidden sm:table-cell">
                                    {formatDate(item.created_at, settings)}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => onEdit(item)}
                                            className="text-xs font-semibold uppercase tracking-widest text-muted hover:text-text transition-colors"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => deleteItem(item.id)}
                                            disabled={isDeletingItem}
                                            className="text-xs font-semibold uppercase tracking-widest text-muted hover:text-error transition-colors disabled:opacity-50"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
