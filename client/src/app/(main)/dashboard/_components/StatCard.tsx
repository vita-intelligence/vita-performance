interface StatCardProps {
    label: string;
    value: string | number;
    sub?: string;
    highlight?: "success" | "error" | "warning";
}

export default function StatCard({ label, value, sub, highlight }: StatCardProps) {
    const highlightClass = highlight === "success"
        ? "border-l-success"
        : highlight === "error"
            ? "border-l-error"
            : highlight === "warning"
                ? "border-l-secondary"
                : "border-l-border";

    return (
        <div className={`border border-border border-l-4 ${highlightClass} bg-background p-5 flex flex-col gap-2`}>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</p>
            <p className="text-3xl font-black text-text">{value}</p>
            {sub && <p className="text-xs text-muted">{sub}</p>}
        </div>
    );
}