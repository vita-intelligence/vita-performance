"use client";

import { Plug, PlugZap, Building2 } from "lucide-react";
import { Workstation } from "@/types/workstation";

/**
 * Three-state badge that spells out where a row came from + whether
 * PSP still owns it. Renders inline on the workstations list so the
 * operator instantly knows which rows sessions will flow back to.
 *
 *   * PSP · Live       — external_id set, is_active=true. Sessions
 *                        auto-push to PSP.
 *   * PSP · Removed    — external_id set, is_active=false. The row
 *                        was pulled once but PSP no longer surfaces
 *                        it. Kept as an audit stub for old sessions.
 *   * Local            — no external_id. Never synced from PSP;
 *                        exists only in this vita-performance tenant.
 */
export type WorkstationSource = "psp_live" | "psp_removed" | "local";

export function workstationSource(w: Workstation): WorkstationSource {
    if (!w.external_id) return "local";
    return w.is_active ? "psp_live" : "psp_removed";
}

export default function WorkstationSourceBadge({
    workstation,
}: {
    workstation: Workstation;
}) {
    const source = workstationSource(workstation);

    if (source === "psp_live") {
        return (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest px-2 py-1 border border-success/40 bg-success/5 text-success whitespace-nowrap">
                <PlugZap className="size-3" />
                PSP · Live
            </span>
        );
    }
    if (source === "psp_removed") {
        return (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest px-2 py-1 border border-warning/40 bg-warning/5 text-warning whitespace-nowrap">
                <Plug className="size-3" />
                PSP · Removed
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest px-2 py-1 border border-border text-muted whitespace-nowrap">
            <Building2 className="size-3" />
            Local
        </span>
    );
}
