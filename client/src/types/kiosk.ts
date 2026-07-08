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
    /** PSP's `operation_description` for the MO step this session is
     *  attributed to. Null when the session is non-MO (cleaning /
     *  maintenance / other) or the workstation isn't PSP-linked. */
    operation_description: string | null;
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

/** One MO step routed to this workstation, ready for a kiosk operator
 *  to pick up. Comes from PSP via ``GET /api/kiosk/<token>/mos/`` on
 *  ``psp_source_of_truth`` workstations.
 *
 *  ``step_name`` carries PSP's ``operation_description`` — often long
 *  multi-sentence procedure text ("Zero the scale, weigh each…"). The
 *  card shows a short group badge + an "Operation details" button
 *  that opens the full text in a modal, so a hundred MOs on the
 *  picker don't turn into a wall of paragraphs. */
export interface KioskMO {
    mo_uuid: string;
    mo_status: string | null;
    step_uuid: string;
    step_name: string | null;
    step_sort_order: number | null;
    step_status: string | null;
    step_planned_start: string | null;
    step_planned_finish: string | null;
    /** Compact label for the card — "Weighing", "Bottling", etc. */
    workstation_group_name: string | null;
    item_name: string | null;
    quantity: string | null;
    due_date: string | null;
}

export interface KioskMOsResponse {
    psp_source_of_truth: boolean;
    items: KioskMO[];
}

/** What the item-picker step emits. Discriminated so the kiosk knows
 *  whether to send legacy item_id or PSP mo/step uuids to /start/. */
export type KioskSelection =
    | { kind: "item"; item: KioskItem }
    | { kind: "mo"; mo: KioskMO };

export interface KioskCompletedSession {
    id: number;
    performance_percentage: number | null;
    duration_hours: number | null;
    quantity_produced: number | null;
    item_name: string | null;
    worker_name: string;
    uom: string | null;
}