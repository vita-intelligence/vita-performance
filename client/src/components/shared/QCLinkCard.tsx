"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { Copy, Check, RefreshCw } from "lucide-react";
import { useQCToken } from "@/hooks/useQCToken";

export default function QCLinkCard() {
    const { token, isLoading, regenerateToken, isRegenerating } = useQCToken();
    const [copied, setCopied] = useState(false);

    const url = token ? `${window.location.origin}/qc/${token}` : "";

    const handleCopy = () => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (isLoading) return null;

    return (
        <div className="border border-border p-4 flex flex-col gap-3">
            <div className="flex flex-col gap-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted">QC Kiosk Link</p>
                <p className="text-sm text-text break-all">{url}</p>
            </div>
            <div className="flex items-center gap-3 border-t border-border pt-3">
                <Button
                    onPress={handleCopy}
                    variant="bordered"
                    size="sm"
                    className="rounded-none border-border text-muted hover:text-text text-xs font-semibold uppercase tracking-widest"
                    startContent={copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                >
                    {copied ? "Copied" : "Copy Link"}
                </Button>
                <Button
                    onPress={() => regenerateToken()}
                    isLoading={isRegenerating}
                    variant="light"
                    size="sm"
                    className="rounded-none text-muted hover:text-error text-xs font-semibold uppercase tracking-widest"
                    startContent={<RefreshCw size={12} />}
                >
                    Regenerate
                </Button>
            </div>
        </div>
    );
}