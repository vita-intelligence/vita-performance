"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { useRef } from "react";

interface DrawerProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export default function Drawer({ isOpen, onClose, title, children }: DrawerProps) {
    const drawerRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
            gsap.fromTo(overlayRef.current,
                { opacity: 0 },
                { opacity: 1, duration: 0.3, ease: "power2.out" }
            );
            gsap.fromTo(drawerRef.current,
                { x: "100%" },
                { x: "0%", duration: 0.4, ease: "power3.out" }
            );
        } else {
            document.body.style.overflow = "";
        }

        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    const handleClose = () => {
        gsap.to(drawerRef.current, {
            x: "100%",
            duration: 0.3,
            ease: "power3.in",
        });
        gsap.to(overlayRef.current, {
            opacity: 0,
            duration: 0.3,
            ease: "power2.in",
            onComplete: onClose,
        });
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex">
            {/* Overlay */}
            <div
                ref={overlayRef}
                className="absolute inset-0 bg-black/50"
                onClick={handleClose}
            />

            {/* Drawer */}
            <div
                ref={drawerRef}
                className="absolute right-0 top-0 h-full w-full sm:w-[480px] bg-background flex flex-col shadow-2xl"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-border">
                    <h2 className="text-sm font-semibold uppercase tracking-widest text-text">
                        {title}
                    </h2>
                    <button
                        onClick={handleClose}
                        className="text-muted hover:text-text transition-colors text-xl leading-none"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-6">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
}