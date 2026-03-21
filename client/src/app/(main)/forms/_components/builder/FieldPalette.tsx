"use client";

import { FieldType } from "@/types/dynamic-form";
import {
    Type,
    Hash,
    ToggleLeft,
    CheckSquare,
    ChevronDown,
    Star,
    PenLine,
    ShieldCheck,
} from "lucide-react";

interface FieldPaletteProps {
    onAdd: (type: FieldType) => void;
}

const FIELD_TYPES: { type: FieldType; label: string; icon: React.ElementType; description: string }[] = [
    { type: "text", label: "Text", icon: Type, description: "Short or long text answer" },
    { type: "number", label: "Number", icon: Hash, description: "Numeric input" },
    { type: "yes_no", label: "Yes / No", icon: ToggleLeft, description: "Simple boolean toggle" },
    { type: "checkbox", label: "Checkbox", icon: CheckSquare, description: "Multiple choice selection" },
    { type: "dropdown", label: "Dropdown", icon: ChevronDown, description: "Single choice from list" },
    { type: "rating", label: "Rating", icon: Star, description: "Star rating 1 to 5" },
    { type: "signature", label: "Signature", icon: PenLine, description: "Draw signature on screen" },
    { type: "qc_approval", label: "QC Approval", icon: ShieldCheck, description: "Requires QC person sign-off" },
];

export default function FieldPalette({ onAdd }: FieldPaletteProps) {
    return (
        <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-2">
                Add Field
            </p>
            {FIELD_TYPES.map((f) => (
                <button
                    key={f.type}
                    onClick={() => onAdd(f.type)}
                    className="flex items-center gap-3 px-4 py-3 border border-border hover:border-text hover:bg-surface transition-colors text-left w-full"
                >
                    <f.icon size={16} className="text-muted shrink-0" />
                    <div className="flex flex-col gap-0.5 min-w-0">
                        <p className="text-sm font-semibold text-text">{f.label}</p>
                        <p className="text-xs text-muted truncate">{f.description}</p>
                    </div>
                </button>
            ))}
        </div>
    );
}