"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, X, MoreHorizontal } from "lucide-react";
import { BOTTOM_NAV_ITEMS, NAV_ITEMS } from "@/config/nav.config";
import { useAuth } from "@/hooks/useAuth";
import gsap from "gsap";

export default function BottomNav() {
    const pathname = usePathname();
    const { logout, user } = useAuth();
    const [isMoreOpen, setIsMoreOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

    const openPanel = () => {
        setIsMoreOpen(true);
    };

    const closePanel = () => {
        gsap.to(panelRef.current, {
            y: "100%",
            duration: 0.3,
            ease: "power3.in",
        });
        gsap.to(overlayRef.current, {
            opacity: 0,
            duration: 0.3,
            ease: "power2.in",
            onComplete: () => setIsMoreOpen(false),
        });
    };

    useEffect(() => {
        if (isMoreOpen) {
            gsap.fromTo(panelRef.current,
                { y: "100%" },
                { y: "0%", duration: 0.4, ease: "power3.out" }
            );
            gsap.fromTo(overlayRef.current,
                { opacity: 0 },
                { opacity: 1, duration: 0.3, ease: "power2.out" }
            );
        }
    }, [isMoreOpen]);

    const moreItems = NAV_ITEMS.filter(
        (item) => !BOTTOM_NAV_ITEMS.some((b) => b.href === item.href)
    );

    return (
        <>
            {/* Overlay */}
            {isMoreOpen && (
                <div
                    ref={overlayRef}
                    className="fixed inset-0 z-40 bg-black/50 md:hidden"
                    onClick={closePanel}
                />
            )}

            {/* More Panel */}
            {isMoreOpen && (
                <div
                    ref={panelRef}
                    className="fixed bottom-16 left-0 right-0 z-50 bg-background border-t border-border md:hidden"
                >
                    {/* User Info */}
                    <div className="flex items-center gap-4 px-6 py-4 border-b border-border bg-surface">
                        <div className="w-8 h-8 bg-text flex items-center justify-center shrink-0">
                            <span className="text-background text-xs font-black uppercase">
                                {user?.username?.charAt(0)}
                            </span>
                        </div>
                        <div className="flex flex-col gap-0.5 overflow-hidden">
                            <p className="text-xs font-semibold text-text truncate">{user?.username}</p>
                            <p className="text-xs text-muted truncate">{user?.email}</p>
                        </div>
                    </div>

                    {/* Nav Items */}
                    <div className="flex flex-col">
                        {moreItems.map((item) => {
                            const Icon = item.icon;
                            const active = pathname === item.href || pathname.startsWith(item.href + "/");
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={closePanel}
                                    className={`flex items-center gap-4 px-6 py-4 border-b border-border transition-colors ${active ? "text-text" : "text-muted hover:text-text"
                                        }`}
                                >
                                    <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                                    <span className="text-xs font-semibold uppercase tracking-widest">
                                        {item.label}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Logout */}
                    <div className="border-t-2 border-border">
                        <button
                            onClick={() => { logout(); closePanel(); }}
                            className="w-full flex items-center gap-4 px-6 py-4 text-error hover:bg-error hover:text-background transition-colors"
                        >
                            <LogOut size={18} />
                            <span className="text-xs font-semibold uppercase tracking-widest">Logout</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Bottom Bar */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden">
                <div className="flex">
                    {BOTTOM_NAV_ITEMS.map((item) => {
                        const active = pathname === item.href || pathname.startsWith(item.href + "/");
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${active ? "text-text" : "text-muted hover:text-text"
                                    }`}
                            >
                                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                                <span className="text-[10px] font-semibold uppercase tracking-widest">
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                    <button
                        onClick={() => isMoreOpen ? closePanel() : openPanel()}
                        className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${isMoreOpen ? "text-text" : "text-muted hover:text-text"
                            }`}
                    >
                        {isMoreOpen ? <X size={20} /> : <MoreHorizontal size={20} />}
                        <span className="text-[10px] font-semibold uppercase tracking-widest">More</span>
                    </button>
                </div>
            </nav>
        </>
    );
}