"use client";

import Link from "next/link";
import Button from "@/components/ui/Button";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/react";
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
        <div className="hidden md:block w-full overflow-x-auto">
            <Table
                aria-label="Available plans"
                classNames={{
                    wrapper: "rounded-none border border-border shadow-none p-0",
                    th: "text-xs font-semibold uppercase tracking-widest text-muted bg-surface rounded-none",
                    td: "py-4 text-sm",
                    tr: "border-b border-border",
                }}
            >
                <TableHeader>
                    <TableColumn>Plan</TableColumn>
                    <TableColumn>Price</TableColumn>
                    <TableColumn>
                        <div className="flex items-center gap-1.5">
                            <Users size={12} /> Workers
                        </div>
                    </TableColumn>
                    <TableColumn>
                        <div className="flex items-center gap-1.5">
                            <MonitorCheck size={12} /> Workstations
                        </div>
                    </TableColumn>
                    <TableColumn>
                        <div className="flex items-center gap-1.5">
                            <Clock size={12} /> History
                        </div>
                    </TableColumn>
                    <TableColumn>
                        <div className="flex items-center gap-1.5">
                            <Tablet size={12} /> Kiosk
                        </div>
                    </TableColumn>
                    <TableColumn>
                        <div className="flex items-center gap-1.5">
                            <ShieldCheck size={12} /> QC
                        </div>
                    </TableColumn>
                    <TableColumn>
                        <div className="flex items-center gap-1.5">
                            <Radio size={12} /> Realtime
                        </div>
                    </TableColumn>
                    <TableColumn> </TableColumn>
                </TableHeader>
                <TableBody>
                    {plans.map((p) => {
                        const isCurrent = currentPlan === p.key;
                        return (
                            <TableRow
                                key={p.key}
                                className={isCurrent ? "bg-success/5" : ""}
                            >
                                <TableCell className="font-black text-text uppercase">
                                    <div className="flex items-center gap-2 whitespace-nowrap">
                                        {p.name}
                                        {isCurrent && (
                                            <span className="text-xs font-semibold uppercase tracking-widest text-success border border-success px-2 py-0.5">
                                                Current
                                            </span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="font-black text-text whitespace-nowrap">
                                    {p.price}
                                    {p.price !== "Custom" && (
                                        <span className="text-muted font-normal text-xs">/mo</span>
                                    )}
                                </TableCell>
                                <TableCell className="font-semibold text-text">{p.workers}</TableCell>
                                <TableCell className="font-semibold text-text">{p.workstations}</TableCell>
                                <TableCell className="font-semibold text-text whitespace-nowrap">{p.history}</TableCell>
                                <TableCell>
                                    {p.kiosk
                                        ? <Check size={16} className="text-success" />
                                        : <X size={16} className="text-muted opacity-40" />
                                    }
                                </TableCell>
                                <TableCell>
                                    {p.qc
                                        ? <Check size={16} className="text-success" />
                                        : <X size={16} className="text-muted opacity-40" />
                                    }
                                </TableCell>
                                <TableCell>
                                    {p.realtime
                                        ? <Check size={16} className="text-success" />
                                        : <X size={16} className="text-muted opacity-40" />
                                    }
                                </TableCell>
                                <TableCell>
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
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}