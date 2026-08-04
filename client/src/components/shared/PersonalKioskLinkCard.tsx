"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { Copy, Check, RefreshCw } from "lucide-react";
import { usePersonalKioskToken } from "@/hooks/usePersonalKioskToken";

/**
 * Twin of `QCLinkCard` for the personal-kiosk tablet. Lives on the
 * workers page so the same admin who manages the roster also gets
 * the pairing URL. Regenerating invalidates every tablet paired to
 * the old token — the toast reminds the admin of that.
 */
export default function PersonalKioskLinkCard() {
    const { token, isLoading, regenerateToken, isRegenerating } =
        usePersonalKioskToken();
    const [copied, setCopied] = useState(false);

    const url = token
        ? `${window.location.origin}/kiosk/personal/${token}`
        : "";

    const handleCopy = () => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (isLoading) return null;

    return (
        <div className="border border-border p-4 flex flex-col gap-3">
            <div className="flex flex-col gap-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                    Personal Kiosk Link
                </p>
                <p className="text-sm text-text break-all">{url}</p>
                <p className="text-[11px] text-muted">
                    Open this URL on the shared shift tablet. Workers
                    clock in with their PIN — no login required.
                </p>
            </div>
            <div className="flex items-center gap-3 border-t border-border pt-3">
                <Button
                    onPress={handleCopy}
                    variant="bordered"
                    size="sm"
                    className="rounded-none border-border text-muted hover:text-text text-xs font-semibold uppercase tracking-widest"
                    startContent={
                        copied ? (
                            <Check size={12} className="text-success" />
                        ) : (
                            <Copy size={12} />
                        )
                    }
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
