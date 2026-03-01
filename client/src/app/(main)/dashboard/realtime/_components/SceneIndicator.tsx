interface SceneIndicatorProps {
    total: number;
    current: number;
}

export default function SceneIndicator({ total, current }: SceneIndicatorProps) {
    return (
        <div className="flex items-center gap-2">
            {Array.from({ length: total }).map((_, i) => (
                <div
                    key={i}
                    className={`h-1 transition-all duration-500 ${i === current
                            ? "w-6 bg-text"
                            : "w-2 bg-border"
                        }`}
                />
            ))}
        </div>
    );
}