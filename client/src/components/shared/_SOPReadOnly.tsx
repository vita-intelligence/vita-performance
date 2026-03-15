"use client";

import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { Block } from "@blocknote/core";
import "@blocknote/mantine/style.css";

export interface SOPReadOnlyHandle {
    getHeadings: () => { id: string; text: string; level: number }[];
    scrollToBlock: (id: string) => void;
}

const SOPReadOnly = forwardRef<SOPReadOnlyHandle, { content: string; isDark?: boolean }>(
    ({ content, isDark }, ref) => {
        const [isReady, setIsReady] = useState(false);

        const editor = useCreateBlockNote({
            domAttributes: {
                editor: { class: "px-8 py-6" },
            },
        });

        useImperativeHandle(ref, () => ({
            getHeadings: () => {
                return editor.document
                    .filter((b: Block) => b.type === "heading")
                    .map((b: Block) => ({
                        id: b.id,
                        text: b.content
                            ? (b.content as any[]).map((c: any) => c.text || "").join("")
                            : "",
                        level: (b.props as any).level ?? 1,
                    }));
            },
            scrollToBlock: (id: string) => {
                const el = document.querySelector(`[data-id="${id}"]`);
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            },
        }));

        useEffect(() => {
            if (!editor || !content) {
                setIsReady(true);
                return;
            }
            try {
                const blocks = JSON.parse(content);
                editor.replaceBlocks(editor.document, blocks);
            } catch {
                // not JSON
            }
            setIsReady(true);
        }, [editor]);

        if (!isReady) return null;

        return (
            <BlockNoteView
                editor={editor}
                editable={false}
                theme={isDark ? "dark" : "light"}
                formattingToolbar={false}
                sideMenu={false}
                slashMenu={false}
            />
        );
    }
);

SOPReadOnly.displayName = "SOPReadOnly";
export default SOPReadOnly;