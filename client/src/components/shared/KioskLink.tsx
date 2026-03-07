"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface KioskLinkProps {
    token: string;
}

export default function KioskLink({ token }: KioskLinkProps) {
    const [copied, setCopied] = useState(false);
    const url = `${window.location.origin}/kiosk/${token}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted hover:text-text transition-colors"
        >
            {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
            {copied ? "Copied" : "Kiosk"}
        </button>
    );
}