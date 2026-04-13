"use client";

import dynamic from "next/dynamic";
import { ReputationTier } from "@/types/worker";

// react-gauge-component touches `window` on import, so load it client-side only.
const GaugeComponent = dynamic(() => import("react-gauge-component"), { ssr: false });

interface CreditScoreGaugeProps {
    score: number;
    tier: ReputationTier;
    size?: "sm" | "md" | "lg";
}

const SCORE_MIN = 300;
const SCORE_MAX = 850;

const TIER_LABELS: Record<ReputationTier, string> = {
    poor: "Poor",
    fair: "Fair",
    good: "Good",
    very_good: "Very Good",
    excellent: "Excellent",
};

const TIER_COLORS: Record<ReputationTier, string> = {
    poor: "text-error",
    fair: "text-warning",
    good: "text-secondary",
    very_good: "text-success",
    excellent: "text-success",
};

const SIZE_PX = {
    sm: 220,
    md: 320,
    lg: 420,
};

const FONT_SCORE = {
    sm: "text-3xl",
    md: "text-5xl",
    lg: "text-6xl",
};

export default function CreditScoreGauge({ score, tier, size = "md" }: CreditScoreGaugeProps) {
    const width = SIZE_PX[size];
    const safeScore = Math.max(SCORE_MIN, Math.min(SCORE_MAX, score));

    return (
        <div className="flex flex-col items-center gap-1" style={{ width }}>
            <GaugeComponent
                type="semicircle"
                value={safeScore}
                minValue={SCORE_MIN}
                maxValue={SCORE_MAX}
                style={{ width: "100%" }}
                arc={{
                    width: 0.22,
                    padding: 0.01,
                    cornerRadius: 0,
                    subArcs: [
                        { limit: 580, color: "#ef4444" },
                        { limit: 670, color: "#f59e0b" },
                        { limit: 740, color: "#eab308" },
                        { limit: 800, color: "#84cc16" },
                        { limit: 850, color: "#22c55e" },
                    ],
                }}
                pointer={{
                    type: "needle",
                    color: "var(--color-text, #111)",
                    length: 0.78,
                    width: 14,
                    elastic: true,
                    animationDelay: 0,
                    animationDuration: 1500,
                }}
                labels={{
                    valueLabel: {
                        hide: true,
                    },
                    tickLabels: {
                        type: "outer",
                        ticks: [
                            { value: 300 },
                            { value: 580 },
                            { value: 670 },
                            { value: 740 },
                            { value: 800 },
                            { value: 850 },
                        ],
                        defaultTickValueConfig: {
                            style: { fontSize: "10px", fontWeight: 600, fill: "var(--color-muted, #666)" },
                        },
                        defaultTickLineConfig: {
                            color: "var(--color-border, #ccc)",
                        },
                    },
                }}
            />

            <div className="flex flex-col items-center gap-1 -mt-4">
                <p className={`font-mono font-black tracking-widest ${TIER_COLORS[tier]} ${FONT_SCORE[size]}`}>
                    {Math.round(safeScore)}
                </p>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                    {TIER_LABELS[tier]}
                </p>
            </div>
        </div>
    );
}
