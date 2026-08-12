import { FlaskConical } from "lucide-react";

/**
 * R&D / Sample chip for any row that maps to a PSP manufacturing
 * order. Renders nothing for `production` MOs and null / unknown
 * project types — the badge's absence is the "commercial production"
 * signal, matching the design intent of "mark R&D distinctly".
 *
 * `sample` MOs (customer sample kits) get their own `Sample` label
 * because operators need to know a sample is going out the door to a
 * customer vs an in-house R&D trial, but both use the same purple
 * palette because they share the R&D stock pool + QC cadence.
 *
 * ### Usage
 *
 * ```tsx
 * <RndBadge projectType={row.project_type} />          // inline chip
 * <RndBadge projectType={row.project_type} compact />  // tighter chip for dense lists
 * ```
 */
export function RndBadge({
    projectType,
    compact = false,
}: {
    projectType: string | null | undefined;
    compact?: boolean;
}) {
    if (projectType !== "trial" && projectType !== "sample") return null;
    const label = projectType === "sample" ? "Sample" : "R&D";
    const iconSize = compact ? "size-2.5" : "size-3";
    const padding = compact ? "px-1.5 py-px" : "px-2 py-0.5";
    const textSize = compact ? "text-[9px]" : "text-[10px]";
    return (
        <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-purple-500/15 ${padding} ${textSize} font-black uppercase tracking-wider text-purple-700 dark:text-purple-300`}
            title={
                projectType === "sample"
                    ? "Customer sample kit — R&D stream, segregated stock"
                    : "R&D trial batch — segregated stock, R&D QC cadence"
            }
        >
            <FlaskConical className={iconSize} />
            {label}
        </span>
    );
}

/** True when the project_type value indicates an R&D-stream MO
 *  (trial or sample). Handy for callers that want to swap other UI
 *  bits (icon colour, row background) alongside the chip. */
export function isRndProjectType(projectType: string | null | undefined): boolean {
    return projectType === "trial" || projectType === "sample";
}
