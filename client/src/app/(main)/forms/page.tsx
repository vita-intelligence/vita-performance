"use client";

import Link from "next/link";
import { ArrowRight, ClipboardList, ExternalLink } from "lucide-react";
import { Button } from "@heroui/react";

/**
 * Retired page — forms authoring moved to PSP.
 *
 * The `dynamic_forms` table on vita-perf is now a read-only mirror:
 * PSP publishes into it via `/api/dynamic-forms/publish/` and the
 * kiosk consumes those rows locally so it stays offline-resilient.
 * Existing `source='legacy'` rows keep working on the kiosk until
 * they're re-authored on PSP, at which point the publisher upserts
 * them by `psp_uuid` and stamps `source='psp'`.
 *
 * The old builder / drawer / cards components remain in the
 * codebase (referenced from earlier commits' history) but are no
 * longer routed. Delete them in a follow-up sweep once we're
 * confident nothing hidden depends on them.
 */
export default function FormsRetiredPage() {
    return (
        <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-start justify-center gap-6 px-4 py-10">
            <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <ClipboardList className="size-5" />
                </span>
                <div>
                    <p className="text-xs font-black uppercase tracking-widest text-muted">
                        Moved
                    </p>
                    <h1 className="text-xl font-black text-text sm:text-2xl">
                        Forms are authored on PSP now
                    </h1>
                </div>
            </div>

            <p className="text-sm text-muted">
                The vita-performance forms builder retired — PSP is the
                source of truth for checklists. Author templates over there,
                assign them to workstations (start-of-job / end-of-job /
                cleaning), and PSP publishes them to this kiosk mirror on
                every save.
            </p>

            <ul className="w-full space-y-1.5 rounded-2xl border border-border bg-surface/40 p-4 text-xs text-muted">
                <li>
                    <span className="text-text">·</span> Existing forms keep
                    working on the kiosk until re-authored on PSP.
                </li>
                <li>
                    <span className="text-text">·</span> Assignments +
                    cleaning schedules live on the PSP workstation edit page.
                </li>
                <li>
                    <span className="text-text">·</span> Per-worker audience
                    filtering + auto-generated equipment sections are only
                    available on PSP.
                </li>
            </ul>

            <Button
                as={Link}
                href="/"
                color="primary"
                endContent={<ArrowRight className="size-4" />}
                className="rounded-2xl"
            >
                Back to dashboard
            </Button>

            <p className="text-[11px] text-muted">
                Ask your admin for the PSP link — the /forms page lives at
                the top level of the PSP UI.{" "}
                <ExternalLink className="inline size-3 -translate-y-px" />
            </p>
        </div>
    );
}
