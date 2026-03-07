"use client";

import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import ConnectionStatus from "./_components/ConnectionStatus";
import SceneIndicator from "./_components/SceneIndicator";
import ActiveSessionsScene from "./_components/ActiveSessionsScene";
import LeaderboardScene from "./_components/LeaderboardScene";
import SummaryScene from "./_components/SummaryScene";
import VPLogo from "@/components/shared/brand/VPLogo";
import { useRealtimeDashboard } from "@/hooks/useRealTimeDashboard";
import { Link } from "@heroui/react";
import { ArrowLeft } from "lucide-react";
import AlertToast from "./_components/AlertToast";
import { RealtimeAlert } from "@/types/realtime";

const SCENE_DURATION = 12000; // 12 seconds per scene
const TOTAL_SCENES = 3;

export default function RealtimeDashboardPage() {
    const { data, status, ping } = useRealtimeDashboard();
    const [currentScene, setCurrentScene] = useState(0);
    const [testAlerts, setTestAlerts] = useState<RealtimeAlert[]>([]);
    const sceneRef = useRef<HTMLDivElement>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const animateScene = () => {
        gsap.fromTo(sceneRef.current,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }
        );
    };

    const nextScene = () => {
        gsap.to(sceneRef.current, {
            opacity: 0,
            y: -20,
            duration: 0.4,
            ease: "power3.in",
            onComplete: () => {
                setCurrentScene((prev) => (prev + 1) % TOTAL_SCENES);
            },
        });
    };

    useEffect(() => {
        animateScene();
    }, [currentScene]);

    useEffect(() => {
        intervalRef.current = setInterval(() => {
            nextScene();
            ping();
        }, SCENE_DURATION);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [ping]);

    if (!data) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <VPLogo />
                    <p className="text-muted text-xs uppercase tracking-widest">
                        {status === "connecting" ? "Connecting to live dashboard..." : "Failed to connect."}
                    </p>
                    <ConnectionStatus status={status} />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-8 py-4 border-b border-border shrink-0">
                <div className="flex items-center gap-6">
                    <Link
                        href="/dashboard"
                        className="text-muted hover:text-text transition-colors"
                    >
                        <ArrowLeft size={18} />
                    </Link>
                    <VPLogo />
                </div>
                <div className="flex items-center gap-6">
                    <SceneIndicator total={TOTAL_SCENES} current={currentScene} />
                    <ConnectionStatus status={status} />
                </div>
                <div className="flex flex-col items-end gap-0.5">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                        {new Date().toLocaleDateString()}
                    </p>
                    <LiveClock />
                </div>
            </div>

            {/* Scene */}
            <div ref={sceneRef} className="flex-1 px-8 py-6 overflow-hidden">
                {currentScene === 0 && (
                    <ActiveSessionsScene sessions={data.active_sessions} />
                )}
                {currentScene === 1 && (
                    <LeaderboardScene leaderboard={data.leaderboard} />
                )}
                {currentScene === 2 && (
                    <SummaryScene data={data} />
                )}
            </div>

            <AlertToast alerts={[...(data?.alerts || []), ...testAlerts]} />

        </div>
    );
}

function LiveClock() {
    const [time, setTime] = useState("");

    useEffect(() => {
        const update = () => {
            setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <p className="text-xs font-mono font-black text-text tracking-widest">{time}</p>
    );
}