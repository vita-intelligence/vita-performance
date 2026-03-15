"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import gsap from "gsap";
import Button from "@/components/ui/Button";
import { useSOP } from "@/hooks/useSOP";
import { X, Eye, Code, Trash2 } from "lucide-react";
import { marked } from "marked";
import { useThemeStore } from "@/lib/stores";
import "@blocknote/mantine/style.css";
import "@blocknote/react/style.css";

marked.setOptions({ breaks: true, gfm: true });

const BlockNoteEditor = dynamic(
    () => import("./_SOPRichEditor"),
    { ssr: false }
);

interface SOPEditorProps {
    workstationId: number;
    workstationName: string;
    onClose: () => void;
}

type EditorMode = "rich" | "code";
type CodeTab = "write" | "preview";

const DARK_THEMES = ["dark", "industrial", "midnight"];

function CodeEditor({ content, onChange }: { content: string; onChange: (val: string) => void }) {
    const [tab, setTab] = useState<CodeTab>("write");
    const preview = marked(content || "") as string;

    return (
        <div className="flex flex-col h-full">
            {/* Mobile tab switcher */}
            <div className="flex md:hidden border-b border-border shrink-0">
                <button
                    onClick={() => setTab("write")}
                    className={`flex-1 py-2 text-xs font-semibold uppercase tracking-widest transition-colors ${tab === "write" ? "bg-text text-background" : "text-muted"
                        }`}
                >
                    Write
                </button>
                <button
                    onClick={() => setTab("preview")}
                    className={`flex-1 py-2 text-xs font-semibold uppercase tracking-widest transition-colors ${tab === "preview" ? "bg-text text-background" : "text-muted"
                        }`}
                >
                    Preview
                </button>
            </div>

            {/* Desktop: side by side — Mobile: tabs */}
            <div className="flex-1 flex overflow-hidden">
                <textarea
                    value={content}
                    onChange={(e) => onChange(e.target.value)}
                    className={`resize-none outline-none p-6 font-mono text-sm bg-gray-900 text-green-400 border-r border-border ${tab === "preview" ? "hidden md:flex md:flex-1" : "flex-1 md:flex-1"
                        }`}
                    placeholder="Write markdown here..."
                    spellCheck={false}
                />
                <div
                    className={`overflow-y-auto p-6 prose prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-table:border-collapse prose-td:border prose-td:border-gray-300 prose-td:px-3 prose-td:py-2 prose-th:border prose-th:border-gray-300 prose-th:px-3 prose-th:py-2 prose-th:bg-gray-50 max-w-none bg-white ${tab === "write" ? "hidden md:block md:flex-1" : "flex-1 md:flex-1"
                        }`}
                    dangerouslySetInnerHTML={{ __html: preview }}
                />
            </div>
        </div>
    );
}

export default function SOPEditor({ workstationId, workstationName, onClose }: SOPEditorProps) {
    const { sop, isLoading, updateSOP, isUpdating } = useSOP(workstationId);
    const [richContent, setRichContent] = useState("");
    const [codeContent, setCodeContent] = useState("");
    const [contentReady, setContentReady] = useState(false);
    const [mode, setMode] = useState<EditorMode>("rich");
    const [editorKey, setEditorKey] = useState(0);
    const panelRef = useRef<HTMLDivElement>(null);
    const { theme } = useThemeStore();
    const isDark = DARK_THEMES.includes(theme);

    useEffect(() => {
        if (sop === undefined) return;
        const raw = sop?.content || "";
        const isJson = raw.trimStart().startsWith('[');
        if (isJson) {
            setRichContent(raw);
            setCodeContent("# Note\n\nThis SOP was created in Rich mode.\nSwitch to Rich mode to edit it properly.\n\nTo use Code mode, clear the content in Rich mode first.");
        } else {
            setRichContent(raw);
            setCodeContent(raw);
        }
        setContentReady(true);
    }, [sop]);

    useEffect(() => {
        document.body.style.overflow = "hidden";
        gsap.fromTo(panelRef.current,
            { opacity: 0, scale: 0.98 },
            { opacity: 1, scale: 1, duration: 0.3, ease: "power3.out" }
        );
        return () => {
            document.body.style.overflow = "";
        };
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
        const toSave = mode === "rich" ? richContent : codeContent;
        await updateSOP(toSave);
        handleClose();
    };

    const handleClear = () => {
        setRichContent("");
        setCodeContent("");
        setEditorKey((k) => k + 1);
    };

    return createPortal(
        <div ref={panelRef} className="fixed inset-0 z-[100] bg-background flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-border shrink-0 gap-3">
                {/* Left — title */}
                <div className="flex flex-col gap-0.5 min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted hidden sm:block">SOP Editor</p>
                    <p className="text-sm font-black text-text uppercase truncate">{workstationName}</p>
                </div>

                {/* Center — mode toggle */}
                <div className="flex items-center gap-1 border border-border p-1 shrink-0">
                    <button
                        onClick={() => setMode("rich")}
                        className={`flex items-center gap-1.5 px-2 md:px-3 py-1.5 text-xs font-semibold uppercase tracking-widest transition-colors ${mode === "rich" ? "bg-text text-background" : "text-muted hover:text-text"
                            }`}
                    >
                        <Eye size={12} />
                        <span className="hidden sm:inline">Rich</span>
                    </button>
                    <button
                        onClick={() => setMode("code")}
                        className={`flex items-center gap-1.5 px-2 md:px-3 py-1.5 text-xs font-semibold uppercase tracking-widest transition-colors ${mode === "code" ? "bg-text text-background" : "text-muted hover:text-text"
                            }`}
                    >
                        <Code size={12} />
                        <span className="hidden sm:inline">Code</span>
                    </button>
                </div>

                {/* Right — actions */}
                <div className="flex items-center gap-2 md:gap-3 shrink-0">
                    <button
                        onClick={handleClear}
                        className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted hover:text-error transition-colors"
                    >
                        <Trash2 size={14} />
                        <span className="hidden sm:inline">Clear</span>
                    </button>
                    <Button
                        onPress={handleSave}
                        isLoading={isUpdating}
                        className="bg-text text-background rounded-none text-xs font-semibold uppercase tracking-widest hover:opacity-80 px-3 md:px-4"
                    >
                        <span className="hidden sm:inline">Save SOP</span>
                        <span className="sm:hidden">Save</span>
                    </Button>
                    <button onClick={handleClose} className="text-muted hover:text-text transition-colors">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Editor area */}
            <div className={`flex-1 flex flex-col overflow-y-auto ${isDark ? "bg-gray-900" : "bg-white"}`}>
                {!isLoading && contentReady && (
                    <>
                        {mode === "rich" && (
                            <div className="flex-1">
                                <BlockNoteEditor
                                    key={editorKey}
                                    content={richContent}
                                    onChange={setRichContent}
                                    isDark={isDark}
                                />
                            </div>
                        )}
                        {mode === "code" && (
                            <div className="flex-1">
                                <CodeEditor
                                    content={codeContent}
                                    onChange={setCodeContent}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>,
        document.body
    );
}