"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";

export default function SettingsHeader() {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        gsap.fromTo(ref.current,
            { opacity: 0, y: -20 },
            { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }
        );
    }, []);

    return (
        <div ref={ref} className="flex flex-col gap-1">
            <h1 className="text-3xl font-black text-text">Settings</h1>
            <p className="text-muted text-sm">Manage your account preferences.</p>
        </div>
    );
}