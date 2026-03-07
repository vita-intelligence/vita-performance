export interface QCWorker {
    id: number;
    name: string;
    has_pin: boolean;
}

export interface QCWorkstation {
    id: number;
    name: string;
}

export interface QCSession {
    id: number;
    start_time: string;
    end_time: string | null;
    duration_hours: number | null;
    quantity_produced: number | null;
    item_name: string | null;
    workers: { id: number; name: string }[];
}

export interface QCState {
    worker: QCWorker | null;
    workstation: QCWorkstation | null;
}