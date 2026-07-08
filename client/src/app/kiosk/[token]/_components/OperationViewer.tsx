"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ListChecks } from "lucide-react";
import gsap from "gsap";

interface OperationViewerProps {
    /** Human label for the top strip — usually the item + group. */
    heading: string;
    /** The operation description text (PSP's operation_description).
     *  Rendered verbatim; kiosk operators read it as-is, no markdown. */
    body: string;
    onClose: () => void;
}

/**
 * Fullscreen operation-details modal. Mirrors the SOPViewer pattern —
 * portalled overlay, animated panel, ESC + backdrop close — but
 * lighter-weight: plain preformatted text, no markdown pipeline, no
 * theme code. Meant for kiosk-scale glance, not authoring.
 *
 * Why a modal instead of inline text: the MO picker can list dozens
 * of scheduled steps. Each `operation_description` can be a full
 * paragraph. Rendering them all inline burns vertical real estate
 * and forces the operator to scroll to reach whichever MO they
 * actually want. Modal = compact list + on-demand detail.
 */
export default function OperationViewer({
    heading,
    body,
    onClose,
}: OperationViewerProps) {
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        document.body.style.overflow = "hidden";
        gsap.fromTo(
            panelRef.current,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.25, ease: "power3.out" }
        );
        return () => {
            document.body.style.overflow = "";
        };
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    if (typeof document === "undefined") return null;

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-stretch justify-center bg-background/80 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={onClose}
        >
            <div
                ref={panelRef}
                onClick={(e) => e.stopPropagation()}
                // Phone: fill the viewport edge-to-edge — every mm of
                // screen counts when the operator's reading a long
                // procedure on a 5-inch handset. Tablet / kiosk: cap
                // width + height so the modal reads as a modal, not
                // a page takeover.
                className="w-full h-full flex flex-col border-border bg-background shadow-2xl sm:h-auto sm:max-h-[85vh] sm:max-w-xl sm:border"
            >
                {/* Sticky header — close button stays reachable
                    with a thumb no matter how far the operator
                    scrolls into the procedure. */}
                <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-background px-4 py-3 shrink-0 sm:px-5">
                    <div className="flex items-center gap-2 min-w-0">
                        <ListChecks className="size-4 text-muted shrink-0" />
                        <span className="text-xs font-semibold uppercase tracking-widest text-muted truncate">
                            {heading}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close operation details"
                        // Enlarged hit target on phone. iOS/Android
                        // guidelines both call for ~44×44px tap
                        // targets — this is 44×44 at min-width.
                        className="-mr-2 flex size-11 items-center justify-center text-muted hover:text-text transition-colors"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
                    {/*
                      * whitespace-pre-wrap  — keep line breaks the
                      *   author typed
                      * break-words          — a URL or SKU code without
                      *   spaces won't overflow horizontally on a phone
                      * text-[15px]/base     — 15px on phone, 16px+ on
                      *   tablet/kiosk. Both above the 12-14px cutoff
                      *   where operators start squinting on a shop
                      *   floor.
                      */}
                    <pre className="whitespace-pre-wrap break-words font-sans text-[15px] leading-relaxed text-text sm:text-base sm:leading-loose">
                        {body || (
                            <span className="italic text-muted">
                                No operation description on this step.
                            </span>
                        )}
                    </pre>
                </div>
            </div>
        </div>,
        document.body
    );
}
