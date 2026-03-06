"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { BreadcrumbItem, Breadcrumbs } from "@heroui/react";
import { WorkerStats } from "@/types/worker";
import { formatCurrency } from "@/lib/utils/number.utils";
import { useSettings } from "@/hooks/useSettings";

interface WorkerStatsHeaderProps {
    stats: WorkerStats;
}

export default function WorkerStatsHeader({ stats }: WorkerStatsHeaderProps) {
    const ref = useRef<HTMLDivElement>(null);
    const { settings } = useSettings();

    useEffect(() => {
        gsap.fromTo(ref.current,
            { opacity: 0, y: -20 },
            { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }
        );
    }, []);

    return (
        <div ref={ref} className="flex flex-col gap-3">
            <Breadcrumbs>
                <BreadcrumbItem href="/workers">Workers</BreadcrumbItem>
                <BreadcrumbItem>{stats.worker.name}</BreadcrumbItem>
            </Breadcrumbs>
            <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-black text-text">{stats.worker.name}</h1>
                        <span className={`text-xs font-semibold uppercase tracking-widest px-2 py-1 border ${stats.worker.is_active
                            ? "border-success text-success"
                            : "border-error text-error"
                            }`}>
                            {stats.worker.is_active ? "Active" : "Inactive"}
                        </span>
                    </div>
                    <p className="text-muted text-sm">{formatCurrency(stats.worker.hourly_rate, settings)}/hr</p>
                </div>
            </div>
        </div>
    );
}