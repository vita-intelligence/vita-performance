export interface KioskWorkstation {
    id: number;
    name: string;
    is_general: boolean;
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