"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { BreadcrumbItem, Breadcrumbs } from "@heroui/react";

export default function NewSessionHeader() {
    const ref = useRef<HTMLDivElement>(null);

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
                <BreadcrumbItem>New</BreadcrumbItem>
            </Breadcrumbs>
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-black text-text">New Session</h1>
                <p className="text-muted text-sm hidden sm:block">Start a live session or log a manual entry.</p>
            </div>
        </div>
    );
}