export const RANGES = [
    { key: "today", label: "Today" },
    { key: "week", label: "This Week" },
    { key: "month", label: "This Month" },
    { key: "3months", label: "Last 3 Months" },
    { key: "year", label: "This Year" },
    { key: "all", label: "All Time" },
];

export type RangeKey = typeof RANGES[number]["key"];