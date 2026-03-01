"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import Button from "@/components/ui/Button";
import { BreadcrumbItem, Breadcrumbs } from "@heroui/react";
import { useRouter } from "next/navigation";

export default function ActiveSessionsHeader() {
    const ref = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        gsap.fromTo(ref.current,
            { opacity: 0, y: -20 },
            { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }
        );
    }, []);

    return (
        <div ref={ref} className="flex flex-col gap-3">
            <Breadcrumbs>
                <BreadcrumbItem href="/sessions">Sessions</BreadcrumbItem>
                <BreadcrumbItem>Active</BreadcrumbItem>
            </Breadcrumbs>
            <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-black text-text">Active Sessions</h1>
                    <p className="text-muted text-sm hidden sm:block">Currently running work sessions.</p>
                </div>
                <Button
                    onPress={() => router.push("/sessions/new")}
                    className="bg-text text-background rounded-none text-xs font-semibold uppercase tracking-widest px-4 sm:px-6 hover:opacity-80 transition-opacity shrink-0"
                >
                    <span className="sm:hidden">Start</span>
                    <span className="hidden sm:inline">Start Session</span>
                </Button>
            </div>
        </div>
    );
}