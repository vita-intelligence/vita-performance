export interface KioskWorkstation {
    id: number;
    name: string;
    is_general: boolean;
    uom: string | null;
}

export interface KioskWorker {
    id: number;
    name: string;
    has_pin: boolean;
}

export interface KioskActiveSession {
    id: number;
    start_time: string;
    item_name: string | null;
    workers: { id: number; name: string }[];
}

export interface KioskState {
    workstation: KioskWorkstation;
    active_session: KioskActiveSession | null;
}

export interface KioskItem {
    id: number;
    name: string;
}

export interface KioskCompletedSession {
    id: number;
    performance_percentage: number | null;
    duration_hours: number | null;
    quantity_produced: number | null;
    item_name: string | null;
    worker_name: string;
    uom: string | null;
}