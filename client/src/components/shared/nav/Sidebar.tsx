"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, ChevronLeft, ChevronDown, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import VPLogo from "@/components/shared/brand/VPLogo";
import { NAV_ITEMS } from "@/config/nav.config";

export default function Sidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const [collapsed, setCollapsed] = useState(false);
    const [openSections, setOpenSections] = useState<string[]>(["/sessions"]);

    const toggleSection = (href: string) => {
        setOpenSections((prev) =>
            prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href]
        );
    };

    const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

    return (
        <aside className={`hidden md:flex flex-col h-screen bg-background border-r border-border transition-all duration-300 shrink-0 ${collapsed ? "w-16" : "w-56"}`}>

            {/* Logo */}
            <div className="flex items-center justify-between px-4 py-5 border-b border-border">
                <VPLogo collapsed={collapsed} />
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="text-muted hover:text-text transition-colors shrink-0"
                >
                    {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 overflow-y-auto py-4 flex flex-col gap-1 px-2">
                {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    const hasChildren = "children" in item && item.children;
                    const isOpen = openSections.includes(item.href);

                    return (
                        <div key={item.href}>
                            {hasChildren ? (
                                <>
                                    <button
                                        onClick={() => !collapsed && toggleSection(item.href)}
                                        className={`w-full flex items-center gap-3 px-3 py-2 transition-colors ${active ? "text-text" : "text-muted hover:text-text"
                                            } ${collapsed ? "justify-center" : "justify-between"}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                                            {!collapsed && (
                                                <span className="text-xs font-semibold uppercase tracking-widest">
                                                    {item.label}
                                                </span>
                                            )}
                                        </div>
                                        {!collapsed && (
                                            <ChevronDown
                                                size={14}
                                                className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
                                            />
                                        )}
                                    </button>
                                    {!collapsed && isOpen && (
                                        <div className="ml-4 border-l border-border pl-3 flex flex-col gap-1 mt-1">
                                            {item.children.map((child) => {
                                                const ChildIcon = child.icon;
                                                const childActive = pathname === child.href;
                                                return (
                                                    <Link
                                                        key={child.href}
                                                        href={child.href}
                                                        className={`flex items-center gap-3 px-3 py-2 transition-colors ${childActive ? "text-text" : "text-muted hover:text-text"
                                                            }`}
                                                    >
                                                        <ChildIcon size={16} strokeWidth={childActive ? 2.5 : 2} />
                                                        <span className="text-xs font-semibold uppercase tracking-widest">
                                                            {child.label}
                                                        </span>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <Link
                                    href={item.href}
                                    className={`flex items-center gap-3 px-3 py-2 transition-colors ${active ? "text-text" : "text-muted hover:text-text"
                                        } ${collapsed ? "justify-center" : ""}`}
                                >
                                    <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                                    {!collapsed && (
                                        <span className="text-xs font-semibold uppercase tracking-widest">
                                            {item.label}
                                        </span>
                                    )}
                                </Link>
                            )}
                        </div>
                    );
                })}
            </nav>

            {/* User + Logout */}
            <div className="border-t border-border px-4 py-4 flex items-center justify-between gap-3">
                {!collapsed && (
                    <div className="flex flex-col gap-0.5 overflow-hidden">
                        <p className="text-xs font-semibold text-text truncate">{user?.username}</p>
                        <p className="text-xs text-muted truncate">{user?.email}</p>
                    </div>
                )}
                <button
                    onClick={() => logout()}
                    className="text-muted hover:text-error transition-colors shrink-0"
                >
                    <LogOut size={16} />
                </button>
            </div>

        </aside>
    );
}