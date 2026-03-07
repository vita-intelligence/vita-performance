"use client";

import { useState } from "react";
import { Item } from "@/types/item";
import { useItems } from "@/hooks/useItems";
import { formatDate } from "@/lib/utils/date.utils";
import { useSettings } from "@/hooks/useSettings";

const PAGE_SIZE = 20;

interface ItemListProps {
    items: Item[];
    onEdit: (item: Item) => void;
}

export default function ItemList({ items, onEdit }: ItemListProps) {
    const { deleteItem, isDeletingItem } = useItems();
    const { settings } = useSettings();
    const [page, setPage] = useState(1);

    const totalPages = Math.ceil(items.length / PAGE_SIZE);
    const paginated = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
                        {paginated.map((item, index) => (
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

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between gap-4">
                    <p className="text-xs text-muted uppercase tracking-widest">
                        Page {page} of {totalPages}
                    </p>
                    <div className="flex border border-border">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-4 py-2 text-xs font-semibold uppercase tracking-widest text-muted hover:text-text border-r border-border transition-colors disabled:opacity-30"
                        >
                            Prev
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="px-4 py-2 text-xs font-semibold uppercase tracking-widest text-muted hover:text-text transition-colors disabled:opacity-30"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}