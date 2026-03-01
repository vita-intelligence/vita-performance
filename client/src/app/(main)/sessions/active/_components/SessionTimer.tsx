"use client";

import { useEffect, useState } from "react";

interface SessionTimerProps {
    startTime: string;
}

export default function SessionTimer({ startTime }: SessionTimerProps) {
    const [elapsed, setElapsed] = useState("");

    useEffect(() => {
        const calculate = () => {
            const start = new Date(startTime).getTime();
            const now = Date.now();
            const diff = Math.floor((now - start) / 1000);

            const hours = Math.floor(diff / 3600);
            const minutes = Math.floor((diff % 3600) / 60);
            const seconds = diff % 60;

            setElapsed(
                `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
            );
        };

        calculate();
        const interval = setInterval(calculate, 1000);
        return () => clearInterval(interval);
    }, [startTime]);

    return (
        <span className="font-mono text-2xl font-black text-text tracking-widest">
            {elapsed}
        </span>
    );
}