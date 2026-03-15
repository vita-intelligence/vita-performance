"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import Button from "@/components/ui/Button";
import { useDynamicForms } from "@/hooks/useDynamicForms";
import { DynamicForm, FormField, FieldType } from "@/types/dynamic-form";
import { X } from "lucide-react";
import FieldPalette from "./builder/FieldPalette";
import FieldEditor from "./builder/FieldEditor";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    arrayMove,
} from "@dnd-kit/sortable";

interface FormBuilderProps {
    form: DynamicForm;
    onClose: () => void;
}

export default function FormBuilder({ form, onClose }: FormBuilderProps) {
    const { updateForm, isUpdating } = useDynamicForms();
    const panelRef = useRef<HTMLDivElement>(null);
    const [fields, setFields] = useState<FormField[]>(
        Array.isArray(form.schema) ? form.schema : []
    );

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        document.body.style.overflow = "hidden";
        gsap.fromTo(panelRef.current,
            { opacity: 0, scale: 0.98 },
            { opacity: 1, scale: 1, duration: 0.3, ease: "power3.out" }
        );
        return () => { document.body.style.overflow = ""; };
    }, []);

    const handleClose = () => {
        gsap.to(panelRef.current, {
            opacity: 0,
            scale: 0.98,
            duration: 0.2,
            ease: "power3.in",
            onComplete: onClose,
        });
    };

    const handleSave = async () => {
        await updateForm({ id: form.id, payload: { schema: fields } });
        handleClose();
    };

    const handleAddField = (type: FieldType) => {
        const newField: FormField = {
            id: crypto.randomUUID(),
            type,
            label: "",
            required: false,
            placeholder: "",
            options: (type === "checkbox" || type === "dropdown") ? [
                { id: crypto.randomUUID(), label: "" }
            ] : undefined,
            max_rating: type === "rating" ? 5 : undefined,
            condition: null,
        };
        setFields((prev) => [...prev, newField]);
    };

    const handleUpdateField = (id: string, updated: FormField) => {
        setFields((prev) => prev.map((f) => f.id === id ? updated : f));
    };

    const handleDeleteField = (id: string) => {
        setFields((prev) => prev.filter((f) => f.id !== id));
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setFields((prev) => {
                const oldIndex = prev.findIndex((f) => f.id === active.id);
                const newIndex = prev.findIndex((f) => f.id === over.id);
                return arrayMove(prev, oldIndex, newIndex);
            });
        }
    };

    return createPortal(
        <div ref={panelRef} className="fixed inset-0 z-[100] bg-background flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-border shrink-0 gap-3">
                <div className="flex flex-col gap-0.5 min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted hidden sm:block">Form Builder</p>
                    <p className="text-sm font-black text-text uppercase truncate">{form.name}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-muted hidden sm:block">
                        {fields.length} field{fields.length !== 1 ? "s" : ""}
                    </span>
                    <Button
                        onPress={handleSave}
                        isLoading={isUpdating}
                        className="bg-text text-background rounded-none text-xs font-semibold uppercase tracking-widest hover:opacity-80 px-3 md:px-4"
                    >
                        <span className="hidden sm:inline">Save Form</span>
                        <span className="sm:hidden">Save</span>
                    </Button>
                    <button onClick={handleClose} className="text-muted hover:text-text transition-colors">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left — palette */}
                <div className="w-64 shrink-0 border-r border-border overflow-y-auto p-4 hidden md:block">
                    <FieldPalette onAdd={handleAddField} />
                </div>

                {/* Center — fields */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                    {fields.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4 border border-dashed border-border">
                            <p className="text-muted text-sm uppercase tracking-widest">No fields yet</p>
                            <p className="text-muted text-xs">Add fields from the left panel</p>
                        </div>
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={fields.map((f) => f.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="flex flex-col gap-3 max-w-2xl mx-auto">
                                    {fields.map((field) => (
                                        <FieldEditor
                                            key={field.id}
                                            field={field}
                                            allFields={fields}
                                            onChange={(updated) => handleUpdateField(field.id, updated)}
                                            onDelete={() => handleDeleteField(field.id)}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    )}
                </div>

                {/* Mobile — bottom palette */}
                <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-background p-4 overflow-x-auto">
                    <div className="flex gap-2">
                        {(["text", "number", "yes_no", "checkbox", "dropdown", "rating", "signature"] as FieldType[]).map((type) => (
                            <button
                                key={type}
                                onClick={() => handleAddField(type)}
                                className="shrink-0 px-3 py-2 border border-border text-xs font-semibold uppercase tracking-widest text-muted hover:text-text hover:border-text transition-colors"
                            >
                                {type.replace("_", " ")}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}