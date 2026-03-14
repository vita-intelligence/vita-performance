export interface Subscription {
    status: "trialing" | "active" | "past_due" | "expired" | "canceled";
    plan: "trial" | "starter" | "growth" | "pro" | "enterprise";
    plan_details: {
        name: string;
        price_gbp: number | null;
    };
    has_access: boolean;
    is_trialing: boolean;
    is_active: boolean;
    is_past_due: boolean;
    is_expired: boolean;
    days_remaining: number;
    has_kiosk: boolean;
    has_qc: boolean;
    has_realtime: boolean;
    worker_limit: number | null;
    workstation_limit: number | null;
    session_history_days: number | null;
    trial_ends_at: string;
    current_period_ends_at: string | null;
    grace_period_ends_at: string | null;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
}