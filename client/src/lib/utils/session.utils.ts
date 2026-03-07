export const getStatusBadge = (status: string) => {
    switch (status) {
        case "active":
            return { label: "Active", className: "border-success text-success" };
        case "completed":
            return { label: "QC Pending", className: "border-warning text-warning" };
        case "verified":
            return { label: "Verified", className: "border-success text-success" };
        default:
            return { label: status, className: "border-border text-muted" };
    }
};