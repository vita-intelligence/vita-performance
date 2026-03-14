"use client";

import Link from "next/link";
import Button from "@/components/ui/Button";
import { Users, MonitorCheck, Clock, Tablet, ShieldCheck, Radio, Check, X } from "lucide-react";

interface Plan {
    key: string;
    name: string;
    price: string;
    workers: string;
    workstations: string;
    history: string;
    kiosk: boolean;
    qc: boolean;
    realtime: boolean;
}

interface PlanComparisonTableProps {
    plans: Plan[];
    currentPlan: string | null;
}

export default function PlanComparisonTable({ plans, currentPlan }: PlanComparisonTableProps) {
    return (
        <div className="hidden md:block w-full overflow-x-auto border border-border">
            <table className="w-full text-sm min-w-[700px]">
                <thead>
                    <tr className="border-b border-border bg-surface">
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Plan</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">Price</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">
                            <div className="flex items-center gap-1.5"><Users size={12} /> Workers</div>
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">
                            <div className="flex items-center gap-1.5"><MonitorCheck size={12} /> Workstations</div>
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">
                            <div className="flex items-center gap-1.5"><Clock size={12} /> History</div>
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">
                            <div className="flex items-center gap-1.5"><Tablet size={12} /> Kiosk</div>
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">
                            <div className="flex items-center gap-1.5"><ShieldCheck size={12} /> QC</div>
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted">
                            <div className="flex items-center gap-1.5"><Radio size={12} /> Realtime</div>
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted"></th>
                    </tr>
                </thead>
                <tbody>
                    {plans.map((p, index) => {
                        const isCurrent = currentPlan === p.key;
                        return (
                            <tr
                                key={p.key}
                                className={`border-b border-border transition-colors ${isCurrent
                                        ? "bg-success/5"
                                        : index % 2 === 0
                                            ? "bg-background"
                                            : "bg-surface/50"
                                    }`}
                            >
                                <td className="px-4 py-4 font-black text-text uppercase whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        {p.name}
                                        {isCurrent && (
                                            <span className="text-xs font-semibold uppercase tracking-widest text-success border border-success px-2 py-0.5">
                                                Current
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-4 font-black text-text whitespace-nowrap">
                                    {p.price}
                                    {p.price !== "Custom" && (
                                        <span className="text-muted font-normal text-xs">/mo</span>
                                    )}
                                </td>
                                <td className="px-4 py-4 font-semibold text-text">{p.workers}</td>
                                <td className="px-4 py-4 font-semibold text-text">{p.workstations}</td>
                                <td className="px-4 py-4 font-semibold text-text whitespace-nowrap">{p.history}</td>
                                <td className="px-4 py-4">
                                    {p.kiosk
                                        ? <Check size={16} className="text-success" />
                                        : <X size={16} className="text-muted opacity-40" />
                                    }
                                </td>
                                <td className="px-4 py-4">
                                    {p.qc
                                        ? <Check size={16} className="text-success" />
                                        : <X size={16} className="text-muted opacity-40" />
                                    }
                                </td>
                                <td className="px-4 py-4">
                                    {p.realtime
                                        ? <Check size={16} className="text-success" />
                                        : <X size={16} className="text-muted opacity-40" />
                                    }
                                </td>
                                <td className="px-4 py-4">
                                    {p.key === "enterprise" && (
                                        <Link
                                            href="mailto:support@vitaperformance.com"
                                            className="text-xs font-semibold uppercase tracking-widest text-muted hover:text-text transition-colors whitespace-nowrap"
                                        >
                                            Contact Us
                                        </Link>
                                    )}
                                    {p.key !== "enterprise" && !isCurrent && (
                                        <Button
                                            size="sm"
                                            variant="bordered"
                                            className="rounded-none border-border text-muted text-xs font-semibold uppercase tracking-widest hover:border-text hover:text-text h-auto py-1.5 whitespace-nowrap"
                                        >
                                            Upgrade
                                        </Button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}