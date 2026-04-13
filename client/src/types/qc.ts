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
    workstation_id: number;
    workstation_name: string | null;
    workstation_uom: string | null;
    start_time: string;
    end_time: string | null;
    duration_hours: number | null;
    quantity_produced: number | null;
    item_name: string | null;
    workers: { id: number; name: string }[];
}

export interface QCSessionPage {
    count: number;
    page: number;
    page_size: number;
    total_pages: number;
    results: QCSession[];
}

export interface QCSessionFilters {
    search?: string;
    workstation?: number | null;
    date_from?: string;
    date_to?: string;
    page?: number;
    page_size?: number;
}

export interface QCState {
    worker: QCWorker | null;
}

export interface QCFeedbackMark {
    worker_id: number;
    mark: 'positive' | 'negative';
    reason: string;
}

export interface QCVerifyPayload {
    quantity_rejected: number;
    qc_inspector_id?: number;
    feedback?: QCFeedbackMark[];
}