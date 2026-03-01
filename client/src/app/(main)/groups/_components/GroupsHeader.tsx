"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import Button from "@/components/ui/Button";

interface GroupsHeaderProps {
    onAdd: () => void;
}

export default function GroupsHeader({ onAdd }: GroupsHeaderProps) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        gsap.fromTo(ref.current,
            { opacity: 0, y: -20 },
            { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }
        );
    }, []);

    return (
        <div ref={ref} className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-black text-text">Groups</h1>
                <p className="text-muted text-sm hidden sm:block">Manage your worker groups.</p>
            </div>
            <Button
                onPress={onAdd}
                className="bg-text text-background rounded-none text-xs font-semibold uppercase tracking-widest px-4 sm:px-6 hover:opacity-80 transition-opacity shrink-0"
            >
                <span className="sm:hidden">Add</span>
                <span className="hidden sm:inline">Add Group</span>
            </Button>
        </div>
    );
}