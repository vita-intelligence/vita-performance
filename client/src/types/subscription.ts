export interface Subscription {
    status: "trialing" | "active" | "past_due" | "expired" | "canceled";
    has_access: boolean;
    is_trialing: boolean;
    is_active: boolean;
    is_past_due: boolean;
    is_expired: boolean;
    days_remaining: number;
    trial_ends_at: string;
    current_period_ends_at: string | null;
    grace_period_ends_at: string | null;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
}