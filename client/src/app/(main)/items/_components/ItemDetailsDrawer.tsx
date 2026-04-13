"use client";

import { Item } from "@/types/item";
import { useItems } from "@/hooks/useItems";
import { useSettings } from "@/hooks/useSettings";
import { formatDateTime } from "@/lib/utils/date.utils";
import Drawer from "@/components/ui/Drawer";
import { Pencil, Trash2 } from "lucide-react";

interface ItemDetailsDrawerProps {
    item: Item | null;
    onClose: () => void;
    onEdit: (item: Item) => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="px-4 py-3 flex flex-col gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</p>
            <div className="text-sm text-text">{children}</div>
        </div>
    );
}

export default function ItemDetailsDrawer({ item, onClose, onEdit }: ItemDetailsDrawerProps) {
    const { deleteItem, isDeletingItem } = useItems();
    const { settings } = useSettings();

    const handleDelete = () => {
        if (!item) return;
        if (confirm("Delete this item? This action cannot be undone.")) {
            deleteItem(item.id);
            onClose();
        }
    };

    return (
        <Drawer isOpen={!!item} onClose={onClose} title="Item Details">
            {!item ? null : (
                <div className="flex flex-col gap-6">
                    <div className="border border-border flex flex-col divide-y divide-border">
                        <Field label="Name">{item.name}</Field>
                        <Field label="Created">{formatDateTime(item.created_at, settings)}</Field>
                    </div>

                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => { onEdit(item); onClose(); }}
                            className="flex items-center justify-center gap-2 px-4 py-3 border border-border text-xs font-semibold uppercase tracking-widest text-text hover:bg-surface transition-colors"
                        >
                            <Pencil size={14} />
                            Edit Item
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={isDeletingItem}
                            className="flex items-center justify-center gap-2 px-4 py-3 border border-error text-xs font-semibold uppercase tracking-widest text-error hover:bg-error hover:text-background transition-colors disabled:opacity-50"
                        >
                            <Trash2 size={14} />
                            Delete Item
                        </button>
                    </div>
                </div>
            )}
        </Drawer>
    );
}
