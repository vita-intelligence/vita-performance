import { WorkstationStatus } from "@/types/realtime";

interface WorkstationGridProps {
    workstations: WorkstationStatus[];
}

export default function WorkstationGrid({ workstations }: WorkstationGridProps) {
    return (
        <div className="flex flex-col gap-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">
                Workstation Status
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {workstations.map((workstation) => (
                    <div
                        key={workstation.id}
                        className={`border p-4 flex flex-col gap-2 transition-colors ${workstation.has_active_session
                                ? "border-success bg-success/5"
                                : "border-border bg-surface"
                            }`}
                    >
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted truncate">
                                {workstation.name}
                            </p>
                            <div className={`w-2 h-2 rounded-full shrink-0 ${workstation.has_active_session
                                    ? "bg-success animate-pulse"
                                    : "bg-border"
                                }`} />
                        </div>
                        <p className={`text-xs font-semibold uppercase tracking-widest ${workstation.has_active_session ? "text-success" : "text-muted"
                            }`}>
                            {workstation.has_active_session ? "Active" : "Idle"}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}