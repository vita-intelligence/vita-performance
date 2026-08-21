"use client";

import { useEffect, useState } from "react";
import { ImageOff, Loader2, Package, X } from "lucide-react";
import { personalKioskService } from "@/services/personal-kiosk.service";
import { JobPreviewPart } from "@/types/worker";

interface BomCardProps {
    parts: JobPreviewPart[];
    loading?: boolean;
    error?: string | null;
    /** Rendered above the parts list — MO output qty x item name so the
     *  operator can sanity-check "yes, that's this MO." Optional. */
    subheading?: string | null;
    /** Kiosk token — required to build proxy URLs for the ingredient
     *  photo thumbnails. When omitted (or session_token absent),
     *  thumbnails just don't render — non-fatal for the card. */
    token?: string;
    sessionToken?: string;
}

/**
 * Shared BOM parts card used by the Jobs modal (interstitial preview
 * on tap) AND the RunningPanel (live during a session). Same shape
 * both places so an operator sees the same table before and after
 * Start — no muscle memory to relearn.
 */
export default function BomCard({
    parts,
    loading,
    error,
    subheading,
    token,
    sessionToken,
}: BomCardProps) {
    const [zoomedPhotoUrl, setZoomedPhotoUrl] = useState<string | null>(null);

    return (
        <div className="rounded-3xl border border-border bg-surface p-4">
            <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Package className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-black uppercase tracking-widest text-text">
                        Bill of materials
                    </p>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                        What this MO consumes
                    </p>
                </div>
                <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-[10px] font-semibold tabular-nums text-muted">
                    {parts.length} {parts.length === 1 ? "item" : "items"}
                </span>
            </div>

            {subheading && (
                <p className="mt-3 text-[11px] font-semibold text-muted">
                    {subheading}
                </p>
            )}

            {loading ? (
                <div className="mt-3 flex items-center gap-2 rounded-2xl bg-background p-4 text-xs text-muted">
                    <Loader2 className="size-4 animate-spin" />
                    Loading parts…
                </div>
            ) : error ? (
                <p className="mt-3 text-xs text-danger">{error}</p>
            ) : parts.length === 0 ? (
                <p className="mt-3 text-xs text-muted">
                    No BOM parts on record for this MO.
                </p>
            ) : (
                <ul className="mt-3 divide-y divide-border">
                    {parts.map((p) => {
                        const photoUrl =
                            token && sessionToken && p.last_photo_uuid
                                ? personalKioskService.movementPhotoUrl(
                                      token,
                                      p.last_photo_uuid,
                                      sessionToken,
                                  )
                                : null;
                        return (
                            <BomRow
                                key={p.uuid}
                                part={p}
                                photoUrl={photoUrl}
                                onZoom={() => photoUrl && setZoomedPhotoUrl(photoUrl)}
                            />
                        );
                    })}
                </ul>
            )}

            {zoomedPhotoUrl && (
                <PhotoZoom
                    src={zoomedPhotoUrl}
                    onClose={() => setZoomedPhotoUrl(null)}
                />
            )}
        </div>
    );
}

function BomRow({
    part,
    photoUrl,
    onZoom,
}: {
    part: JobPreviewPart;
    photoUrl: string | null;
    onZoom: () => void;
}) {
    const name = part.part?.name ?? part.part?.code ?? "Unknown part";
    const code = part.part?.code;
    const uom = part.uom_symbol ?? "";
    // Pharmacopoeial precision: mass/volume shows 5 decimals WITH
    // trailing zeros (0.00649 kg, 1.30522 kg) so the operator reads
    // the scale correctly; count-typed UoMs (pcs / ea) show whole
    // integers. Matches PSP's `formatQtyHumanized` convention.
    const qty = formatPharmaQty(part.required_qty, uom);
    const perUnitQty = formatPharmaQty(part.line_qty, uom);

    return (
        <li className="flex items-start gap-3 py-3">
            <PartThumbnail
                src={photoUrl}
                name={name}
                onClick={photoUrl ? onZoom : undefined}
            />
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text">{name}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                    {code && (
                        <span className="rounded-full bg-background px-2 py-0.5 font-semibold tabular-nums">
                            {code}
                        </span>
                    )}
                    {perUnitQty && (
                        <span>
                            {perUnitQty} {uom} / unit
                        </span>
                    )}
                    {part.is_fixed && (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-semibold uppercase text-amber-700 dark:text-amber-400">
                            per-batch
                        </span>
                    )}
                </div>
            </div>
            <div className="shrink-0 text-right">
                <p className="text-sm font-black tabular-nums text-text">
                    {qty ?? "—"}
                </p>
                {uom && (
                    <p className="text-[11px] font-semibold text-muted">{uom}</p>
                )}
            </div>
        </li>
    );
}

function PartThumbnail({
    src,
    name,
    onClick,
}: {
    src: string | null;
    name: string;
    onClick?: () => void;
}) {
    const [errored, setErrored] = useState(false);
    // Re-run on src change so a photo that showed up after a retry
    // renders instead of staying on the fallback.
    useEffect(() => {
        setErrored(false);
    }, [src]);

    const showFallback = !src || errored;
    const commonClass =
        "flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-background";

    if (showFallback) {
        return (
            <div className={`${commonClass} text-muted`} aria-hidden="true">
                <ImageOff className="size-5 opacity-60" />
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={`Open photo of ${name}`}
            className={`${commonClass} transition-transform hover:scale-[1.02] active:scale-[0.98]`}
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={src}
                alt={name}
                loading="lazy"
                onError={() => setErrored(true)}
                className="h-full w-full object-cover"
            />
        </button>
    );
}

function PhotoZoom({ src, onClose }: { src: string; onClose: () => void }) {
    // Lock body scroll + close on Escape, matching the SOP reader in
    // StationView so the modal feels native on tablets.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [onClose]);

    return (
        <div
            role="dialog"
            aria-label="Ingredient photo"
            onClick={onClose}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
        >
            <button
                type="button"
                onClick={onClose}
                aria-label="Close photo"
                className="absolute right-4 top-4 inline-flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 active:scale-95"
            >
                <X className="size-6" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={src}
                alt="Ingredient close-up"
                onClick={(e) => e.stopPropagation()}
                className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl"
            />
        </div>
    );
}

/** Pharma display: mass / volume renders at 5 decimals WITH trailing
 *  zeros (0.00649 kg, 1.30522 kg) so the operator can't misread the
 *  scale. Count-typed UoM (pcs / ea / unit / caps / tab / bottle /
 *  bag) render as whole integers — 5-decimal caps make no sense.
 *  Mirrors PSP's `formatQtyHumanized` in psp/client/src/lib/format
 *  /company.ts. */
const COUNT_UOM_SYMBOLS = new Set([
    "pcs",
    "ea",
    "unit",
    "units",
    "cap",
    "caps",
    "capsule",
    "capsules",
    "tab",
    "tabs",
    "tablet",
    "tablets",
    "bottle",
    "bottles",
    "bag",
    "bags",
    "sachet",
    "sachets",
    "pack",
    "packs",
]);

function isCountUom(uomSymbol: string): boolean {
    return COUNT_UOM_SYMBOLS.has(uomSymbol.trim().toLowerCase());
}

function formatPharmaQty(
    v: string | null | undefined,
    uomSymbol: string,
): string | null {
    if (v == null) return null;
    const n = Number(v);
    if (!Number.isFinite(n)) return v;
    if (isCountUom(uomSymbol)) return Math.round(n).toLocaleString();
    return n.toFixed(5);
}
