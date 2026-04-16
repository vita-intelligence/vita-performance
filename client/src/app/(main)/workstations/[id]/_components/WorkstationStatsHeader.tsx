"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { BreadcrumbItem, Breadcrumbs } from "@heroui/react";
import { WorkstationStats } from "@/types/workstation";

interface WorkstationStatsHeaderProps {
    stats: WorkstationStats;
}

export default function WorkstationStatsHeader({ stats }: WorkstationStatsHeaderProps) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        gsap.fromTo(ref.current,
            { opacity: 0, y: -20 },
            { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }
        );
    }, []);

    const ws = stats.workstation;

    return (
        <div ref={ref} className="flex flex-col gap-3">
            <Breadcrumbs>
                <BreadcrumbItem href="/workstations">Workstations</BreadcrumbItem>
                <BreadcrumbItem>{ws.name}</BreadcrumbItem>
            </Breadcrumbs>
            <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-black text-text">{ws.name}</h1>
                        <span className={`text-xs font-semibold uppercase tracking-widest px-2 py-1 border ${ws.is_active
                            ? "border-success text-success"
                            : "border-error text-error"
                            }`}>
                            {ws.is_active ? "Active" : "Inactive"}
                        </span>
                        {ws.is_general && (
                            <span className="text-xs font-semibold uppercase tracking-widest px-2 py-1 border border-border text-muted">
                                General
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted">
                        {ws.target_quantity && ws.target_duration && (
                            <span>
                                Target: {ws.target_quantity} {ws.uom || "units"} / {ws.target_duration}h
                            </span>
                        )}
                        {ws.description && <span>{ws.description}</span>}
                    </div>
                </div>
            </div>
        </div>
    );
}
