interface VPLogoProps {
    collapsed?: boolean;
}

export default function VPLogo({ collapsed }: VPLogoProps) {
    return (
        <div className="flex items-center gap-3 shrink-0">
            {/* Monogram */}
            <div className="w-8 h-8 bg-text flex items-center justify-center shrink-0">
                <span className="text-background text-xs font-black tracking-tighter">VP</span>
            </div>
            {/* Brand name */}
            {!collapsed && (
                <div className="flex flex-col leading-none">
                    <span className="text-text text-xs font-black uppercase tracking-widest">Vita</span>
                    <span className="text-muted text-xs font-semibold uppercase tracking-widest">Performance</span>
                </div>
            )}
        </div>
    );
}