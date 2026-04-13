import { ReputationTier } from "@/types/worker";

export const REPUTATION_TIER_LABELS: Record<ReputationTier, string> = {
    poor: "Poor",
    fair: "Fair",
    good: "Good",
    very_good: "Very Good",
    excellent: "Excellent",
};

export const REPUTATION_TIER_COLORS: Record<ReputationTier, string> = {
    poor: "text-error",
    fair: "text-warning",
    good: "text-secondary",
    very_good: "text-success",
    excellent: "text-success",
};

export const REPUTATION_TIER_BORDERS: Record<ReputationTier, string> = {
    poor: "border-error text-error",
    fair: "border-warning text-warning",
    good: "border-secondary text-secondary",
    very_good: "border-success text-success",
    excellent: "border-success text-success",
};
