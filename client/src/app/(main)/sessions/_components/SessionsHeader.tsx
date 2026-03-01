"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import Button from "@/components/ui/Button";
import { useRouter } from "next/navigation";

export default function SessionsHeader() {
    const ref = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        gsap.fromTo(ref.current,
            { opacity: 0, y: -20 },
            { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }
        );
    }, []);

    return (
        <div ref={ref} className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-black text-text">Sessions</h1>
                <p className="text-muted text-sm hidden sm:block">History of all completed work sessions.</p>
            </div>
            <div className="flex items-center gap-3">
                <Button
                    onPress={() => router.push("/sessions/active")}
                    variant="bordered"
                    className="rounded-none border-text text-text text-xs font-semibold uppercase tracking-widest px-4 sm:px-6 hover:opacity-80 transition-opacity shrink-0"
                >
                    <span className="sm:hidden">Active</span>
                    <span className="hidden sm:inline">Active Sessions</span>
                </Button>
                <Button
                    onPress={() => router.push("/sessions/new")}
                    className="bg-text text-background rounded-none text-xs font-semibold uppercase tracking-widest px-4 sm:px-6 hover:opacity-80 transition-opacity shrink-0"
                >
                    <span className="sm:hidden">New</span>
                    <span className="hidden sm:inline">New Session</span>
                </Button>
            </div>
        </div>
    );
}