"use client";

import { useEffect, useState } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import {
    FormattingToolbar,
    FormattingToolbarController,
    BlockTypeSelect,
    BasicTextStyleButton,
    TextAlignButton,
    ColorStyleButton,
    NestBlockButton,
    UnnestBlockButton,
    CreateLinkButton,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";

interface SOPRichEditorProps {
    content: string;
    onChange: (json: string) => void;
    isDark?: boolean;
}

export default function SOPRichEditor({ content, onChange, isDark }: SOPRichEditorProps) {
    const [isReady, setIsReady] = useState(false);

    const editor = useCreateBlockNote({
        domAttributes: {
            editor: {
                class: "px-8 py-6",
            },
        },
    });

    useEffect(() => {
        if (!editor) return;
        const load = async () => {
            if (content) {
                try {
                    const blocks = JSON.parse(content);
                    editor.replaceBlocks(editor.document, blocks);
                } catch {
                    const blocks = await editor.tryParseMarkdownToBlocks(content);
                    editor.replaceBlocks(editor.document, blocks);
                }
            }
            setIsReady(true);
        };
        load();
    }, [editor]);

    const handleChange = () => {
        const json = JSON.stringify(editor.document);
        onChange(json);
    };

    if (!isReady) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted text-xs uppercase tracking-widest">Loading...</p>
            </div>
        );
    }

    return (
        <BlockNoteView
            editor={editor}
            onChange={handleChange}
            theme={isDark ? "dark" : "light"}
            style={{ minHeight: "100%" }}
            formattingToolbar={false}
        >
            <FormattingToolbarController
                formattingToolbar={() => (
                    <FormattingToolbar>
                        <BlockTypeSelect key="blockTypeSelect" />
                        <BasicTextStyleButton basicTextStyle="bold" key="boldStyleButton" />
                        <BasicTextStyleButton basicTextStyle="italic" key="italicStyleButton" />
                        <BasicTextStyleButton basicTextStyle="underline" key="underlineStyleButton" />
                        <BasicTextStyleButton basicTextStyle="strike" key="strikeStyleButton" />
                        <TextAlignButton textAlignment="left" key="textAlignLeftButton" />
                        <TextAlignButton textAlignment="center" key="textAlignCenterButton" />
                        <TextAlignButton textAlignment="right" key="textAlignRightButton" />
                        <ColorStyleButton key="colorStyleButton" />
                        <NestBlockButton key="nestBlockButton" />
                        <UnnestBlockButton key="unnestBlockButton" />
                        <CreateLinkButton key="createLinkButton" />
                    </FormattingToolbar>
                )}
            />
        </BlockNoteView>
    );
}