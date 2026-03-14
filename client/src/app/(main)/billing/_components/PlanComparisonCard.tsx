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

interface PlanComparisonCardsProps {
    plans: Plan[];
    currentPlan: string | null;
}

export default function PlanComparisonCards({ plans, currentPlan }: PlanComparisonCardsProps) {
    return (
        <div className="flex flex-col gap-4 md:hidden">
            {plans.map((p) => {
                const isCurrent = currentPlan === p.key;
                const features = [
                    { icon: Users, label: "Workers", value: p.workers },
                    { icon: MonitorCheck, label: "Workstations", value: p.workstations },
                    { icon: Clock, label: "History", value: p.history },
                ];
                const toggles = [
                    { icon: Tablet, label: "Kiosk", active: p.kiosk },
                    { icon: ShieldCheck, label: "QC", active: p.qc },
                    { icon: Radio, label: "Realtime", active: p.realtime },
                ];

                return (
                    <div
                        key={p.key}
                        className={`border p-5 flex flex-col gap-5 ${isCurrent ? "border-success" : "border-border"
                            }`}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <p className="text-xl font-black text-text uppercase">{p.name}</p>
                                {isCurrent && (
                                    <span className="text-xs font-semibold uppercase tracking-widest text-success border border-success px-2 py-0.5">
                                        Current
                                    </span>
                                )}
                            </div>
                            <p className="font-black text-text shrink-0 text-lg">
                                {p.price}
                                {p.price !== "Custom" && (
                                    <span className="text-muted font-normal text-xs">/mo</span>
                                )}
                            </p>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-2 border-t border-border pt-4">
                            {features.map((f) => (
                                <div key={f.label} className="flex flex-col items-center gap-1 border border-border px-2 py-3">
                                    <f.icon size={14} className="text-muted" />
                                    <p className="text-xs font-black text-text">{f.value}</p>
                                    <p className="text-xs text-muted uppercase tracking-widest">{f.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Feature toggles */}
                        <div className="flex items-center gap-3">
                            {toggles.map((t) => (
                                <div
                                    key={t.label}
                                    className={`flex-1 flex items-center gap-2 px-3 py-2 border ${t.active ? "border-success/30 bg-success/5" : "border-border opacity-40"
                                        }`}
                                >
                                    <t.icon size={12} className={t.active ? "text-success shrink-0" : "text-muted shrink-0"} />
                                    <p className={`text-xs font-semibold uppercase tracking-widest truncate ${t.active ? "text-success" : "text-muted"
                                        }`}>
                                        {t.label}
                                    </p>
                                    {t.active
                                        ? <Check size={10} className="text-success ml-auto shrink-0" />
                                        : <X size={10} className="text-muted ml-auto shrink-0" />
                                    }
                                </div>
                            ))}
                        </div>

                        {/* Action */}
                        {p.key === "enterprise" && (
                            <Link
                                href="mailto:support@vitaperformance.com"
                                className="w-full py-3 text-center text-xs font-semibold uppercase tracking-widest text-muted border border-border hover:border-text hover:text-text transition-colors"
                            >
                                Contact Us
                            </Link>
                        )}
                        {p.key !== "enterprise" && !isCurrent && (
                            <Button
                                variant="bordered"
                                className="w-full h-12 rounded-none border-border text-muted text-xs font-semibold uppercase tracking-widest hover:border-text hover:text-text"
                            >
                                Upgrade
                            </Button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}