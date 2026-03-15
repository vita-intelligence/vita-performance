"use client";

import { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { X, Clock, List, ChevronDown, ChevronUp } from "lucide-react";
import { SOP } from "@/types/workstation";
import { useSettings } from "@/hooks/useSettings";
import { formatDate } from "@/lib/utils/date.utils";
import { marked } from "marked";
import { useThemeStore } from "@/lib/stores";
import type { SOPReadOnlyHandle } from "./_SOPReadOnly";

marked.setOptions({ breaks: true, gfm: true });

const SOPReadOnly = dynamic(() => import("./_SOPReadOnly"), { ssr: false });

const DARK_THEMES = ["dark", "industrial", "midnight"];

interface SOPViewerProps {
    sop: SOP;
    workstationName: string;
    onClose: () => void;
}

interface Heading {
    id: string;
    text: string;
    level: number;
}

export default function SOPViewer({ sop, workstationName, onClose }: SOPViewerProps) {
    const { settings } = useSettings();
    const { theme } = useThemeStore();
    const isDark = DARK_THEMES.includes(theme);
    const panelRef = useRef<HTMLDivElement>(null);
    const readOnlyRef = useRef<SOPReadOnlyHandle>(null);
    const [tocOpen, setTocOpen] = useState(false);
    const [headings, setHeadings] = useState<Heading[]>([]);

    useEffect(() => {
        document.body.style.overflow = "hidden";
        gsap.fromTo(panelRef.current,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.3, ease: "power3.out" }
        );
        return () => { document.body.style.overflow = ""; };
    }, []);

    useEffect(() => {
        if (!sop.content) return;
        const isJson = sop.content.trimStart().startsWith('[');
        if (!isJson) return;
        const timer = setTimeout(() => {
            if (readOnlyRef.current) {
                setHeadings(readOnlyRef.current.getHeadings());
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [sop.content]);

    const handleClose = () => {
        gsap.to(panelRef.current, {
            opacity: 0, y: 20, duration: 0.2, ease: "power3.in",
            onComplete: onClose,
        });
    };

    const handleTOCClick = (id: string) => {
        readOnlyRef.current?.scrollToBlock(id);
        setTocOpen(false);
    };

    const isJson = sop.content?.trimStart().startsWith('[');
    const html = !isJson ? marked(sop.content || "") as string : "";

    return createPortal(
        <div ref={panelRef} className="fixed inset-0 z-[100] bg-background flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-border shrink-0 gap-3">
                <div className="flex flex-col gap-0.5 min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted hidden sm:block">
                        Standard Operating Procedure
                    </p>
                    <p className="text-sm font-black text-text uppercase truncate">{workstationName}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    {headings.length > 0 && (
                        <button
                            onClick={() => setTocOpen((o) => !o)}
                            className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest transition-colors ${tocOpen ? "text-text" : "text-muted hover:text-text"
                                }`}
                        >
                            <List size={14} />
                            <span className="hidden sm:inline">Contents</span>
                        </button>
                    )}
                    {sop.updated_at && (
                        <div className="hidden sm:flex items-center gap-1.5 text-muted">
                            <Clock size={12} />
                            <p className="text-xs">Updated {formatDate(sop.updated_at, settings)}</p>
                        </div>
                    )}
                    <button onClick={handleClose} className="text-muted hover:text-text transition-colors">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Mobile TOC dropdown */}
            {tocOpen && headings.length > 0 && (
                <div className={`md:hidden border-b border-border px-4 py-3 flex flex-col gap-1 ${isDark ? "bg-gray-800" : "bg-surface"}`}>
                    {headings.map((h) => (
                        <button
                            key={h.id}
                            onClick={() => handleTOCClick(h.id)}
                            className={`text-left text-sm text-muted hover:text-text transition-colors py-1 truncate ${h.level === 1 ? "font-semibold" :
                                    h.level === 2 ? "pl-3" : "pl-6 text-xs"
                                }`}
                        >
                            {h.text}
                        </button>
                    ))}
                </div>
            )}

            {/* Body */}
            <div className="flex-1 flex overflow-hidden">
                {/* Desktop TOC sidebar */}
                {tocOpen && headings.length > 0 && (
                    <div className={`hidden md:flex w-64 shrink-0 border-r border-border overflow-y-auto py-6 px-4 flex-col gap-1 ${isDark ? "bg-gray-900" : "bg-surface"}`}>
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-3">
                            Table of Contents
                        </p>
                        {headings.map((h) => (
                            <button
                                key={h.id}
                                onClick={() => handleTOCClick(h.id)}
                                className={`text-left text-sm text-muted hover:text-text transition-colors py-1 truncate ${h.level === 1 ? "font-semibold" :
                                        h.level === 2 ? "pl-3" : "pl-6 text-xs"
                                    }`}
                            >
                                {h.text}
                            </button>
                        ))}
                    </div>
                )}

                {/* Content */}
                <div className={`flex-1 overflow-y-auto ${isDark ? "bg-gray-900" : "bg-white"}`}>
                    {!sop.content ? (
                        <div className="flex items-center justify-center h-64">
                            <p className="text-muted text-sm uppercase tracking-widest">No SOP written yet.</p>
                        </div>
                    ) : isJson ? (
                        <SOPReadOnly ref={readOnlyRef} content={sop.content} isDark={isDark} />
                    ) : (
                        <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-8">
                            <div
                                className={`prose max-w-none prose-headings:font-bold prose-h1:text-2xl md:prose-h1:text-3xl prose-h2:text-xl md:prose-h2:text-2xl prose-h3:text-lg md:prose-h3:text-xl prose-table:border-collapse prose-td:border prose-td:px-3 prose-td:py-2 prose-th:border prose-th:px-3 prose-th:py-2 ${isDark
                                        ? "prose-invert prose-td:border-gray-600 prose-th:border-gray-600 prose-th:bg-gray-800"
                                        : "prose-td:border-gray-300 prose-th:border-gray-300 prose-th:bg-gray-50"
                                    }`}
                                dangerouslySetInnerHTML={{ __html: html }}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}