import { ConnectionStatus as StatusType } from "@/types/realtime";
import { Wifi, WifiOff, Loader } from "lucide-react";

interface ConnectionStatusProps {
    status: StatusType;
}

export default function ConnectionStatus({ status }: ConnectionStatusProps) {
    return (
        <div className="flex items-center gap-2">
            {status === "connected" && (
                <>
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    <span className="text-xs font-semibold uppercase tracking-widest text-success">Live</span>
                </>
            )}
            {status === "connecting" && (
                <>
                    <Loader size={14} className="text-muted animate-spin" />
                    <span className="text-xs font-semibold uppercase tracking-widest text-muted">Connecting</span>
                </>
            )}
            {status === "disconnected" && (
                <>
                    <WifiOff size={14} className="text-error" />
                    <span className="text-xs font-semibold uppercase tracking-widest text-error">Disconnected</span>
                </>
            )}
            {status === "error" && (
                <>
                    <WifiOff size={14} className="text-error" />
                    <span className="text-xs font-semibold uppercase tracking-widest text-error">Error</span>
                </>
            )}
        </div>
    );
}