"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";

export default function ForgotPasswordHeader() {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        gsap.fromTo(ref.current,
            { opacity: 0, y: -20 },
            { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }
        );
    }, []);

    return (
        <div ref={ref} className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
                Vita Performance
            </p>
            <h1 className="text-4xl font-black text-text leading-tight">
                Reset your<br />password.
            </h1>
            <p className="text-muted text-sm mt-1">
                Enter your email and we'll send you a reset link.
            </p>
        </div>
    );
}