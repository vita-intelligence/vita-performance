export interface WorkerGroup {
  id: number;
  name: string;
  description: string | null;
  workers_count: number;
  created_at: string;
  updated_at: string;
}

export interface WorkerStatsSummary {
    sessions_count: number;
    avg_performance: number | null;
    best_performance: number | null;
    total_quantity: number;
    total_hours: number;
    total_wage_cost: number;
}

export interface WorkerStatsChartPoint {
    date: string;
    avg_performance: number | null;
    sessions_count: number;
    total_quantity: number;
}

export interface WorkerStatsSession {
    id: number;
    workstation_name: string;
    date: string;
    duration_hours: number | null;
    quantity_produced: number | null;
    performance_percentage: number | null;
    item_name?: string | null;
    wage_cost: number | null;
    worker_count: number;
    status: "completed" | "verified";
}

export type ReputationTier = 'poor' | 'fair' | 'good' | 'very_good' | 'excellent';

export type ReputationEventType =
    | 'auto_perf_excellent'
    | 'auto_perf_high'
    | 'auto_perf_low'
    | 'auto_perf_very_low'
    | 'manual_positive'
    | 'manual_negative';

export interface WorkerReputationEvent {
    id: number;
    event_type: ReputationEventType;
    score_delta: number;
    reason: string;
    session_id: number | null;
    session_workstation: string | null;
    created_by: string | null;
    created_at: string;
}

export interface ReputationTimelineEvent {
    id: number;
    worker_id: number;
    worker_name: string;
    event_type: ReputationEventType;
    score_delta: number;
    reason: string;
    session_id: number | null;
    session_workstation: string | null;
    created_by_id: number | null;
    created_by_name: string | null;
    created_at: string;
}

export interface ReputationTimelinePage {
    count: number;
    page: number;
    page_size: number;
    total_pages: number;
    has_more: boolean;
    results: ReputationTimelineEvent[];
}

export interface ReputationTimelineFilters {
    search?: string;
    worker?: number | null;
    category?: 'auto' | 'manual' | null;
    sign?: 'positive' | 'negative' | null;
    date_from?: string;
    date_to?: string;
    page_size?: number;
}

export interface WorkerStats {
    worker: {
        id: number;
        name: string;
        hourly_rate: number;
        is_active: boolean;
        reputation_score: number;
        reputation_tier: ReputationTier;
    };
    reputation_history: WorkerReputationEvent[];
    summary: WorkerStatsSummary;
    chart: WorkerStatsChartPoint[];
    sessions: WorkerStatsSession[];
    range: string;
    grouping: 'hour' | 'day' | 'week';
}

export interface WorkerLeaderboardEntry {
    id: number;
    name: string;
    hourly_rate: number;
    sessions_count: number;
    avg_performance: number | null;
    total_quantity: number | null;
}

export interface WorkerLeaderboard {
    range: string;
    results: WorkerLeaderboardEntry[];
}

export interface Worker {
  id: number;
  full_name: string;
  hourly_rate: number;
  is_active: boolean;
  is_qa: boolean;
  has_pin: boolean;
  group: number | null;
  group_name: string | null;
  reputation_score: number;
  reputation_tier: ReputationTier;
  created_at: string;
  updated_at: string;
}

export interface WorkerStationTile {
  id: number;
  name: string;
  description: string;
  kiosk_token: string;
  is_general: boolean;
  is_authorized: boolean;
}

export interface WorkerStationsPayload {
  stations: WorkerStationTile[];
  qa_enabled: boolean;
  /** Only present when qa_enabled — token to deep-link into /qc/<token>. */
  qc_token: string | null;
  total_available: number;
  /** Up to 3 stations the worker has clocked most recently, so they
   *  can jump back to their usual spot without searching. */
  recent: WorkerStationTile[];
  page: number;
  page_size: number;
  total_matches: number;
  has_more: boolean;
}

export interface HistorySessionRow {
  id: number;
  workstation_id: number | null;
  workstation_name: string | null;
  workstation_uom: string | null;
  item_name: string | null;
  activity_kind: 'mo' | 'cleaning' | 'maintenance' | 'other';
  activity_label: string | null;
  start_time: string | null;
  end_time: string | null;
  duration_hours: number | null;
  quantity_produced: number | null;
  performance_percentage: number | null;
  status: 'active' | 'completed' | 'verified';
}

export interface HistoryShiftRow {
  id: number;
  status: 'active' | 'closed';
  clocked_in_at: string;
  clocked_out_at: string | null;
  duration_seconds: number;
  device_id: string;
  notes: string;
  sessions_count: number;
  sessions: HistorySessionRow[];
}

export interface HistoryPayload {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  results: HistoryShiftRow[];
}

export interface WorkerPerformanceTrendPoint {
  date: string;
  avg_performance: number | null;
  sessions_count: number;
}

export interface WorkerPerformanceRecentSession {
  id: number;
  workstation_name: string | null;
  item_name: string | null;
  started_at: string | null;
  ended_at: string | null;
  performance_percentage: number | null;
  quantity_produced: number | null;
  status: string;
}

export interface WorkerPerformancePayload {
  worker: { id: number; name: string };
  window_days: number;
  summary: {
    sessions_count: number;
    avg_performance: number | null;
    total_quantity: number;
  };
  trend: WorkerPerformanceTrendPoint[];
  recent_sessions: WorkerPerformanceRecentSession[];
}

export interface WorkerReputationEventLite {
  id: number;
  event_type: string;
  score_delta: number;
  reason: string;
  author_name: string | null;
  session_workstation: string | null;
  created_at: string;
}

export interface WorkerReputationPayload {
  worker: { id: number; name: string };
  score: number;
  tier: ReputationTier;
  next_tier: ReputationTier | null;
  points_to_next: number | null;
  recent_events: WorkerReputationEventLite[];
}

/** Slim item shape returned by the station panel's item shortlist +
 *  live search endpoint. Only what the FE needs to render a picker. */
export interface StationItem {
  id: number;
  name: string;
}

/** Full session snapshot as returned by every start/stop/context call
 *  in the personal-kiosk workstation embed. */
export interface StationSession {
  id: number;
  workstation_id: number;
  workstation_name: string | null;
  item_id: number | null;
  item_name: string | null;
  activity_kind: 'mo' | 'cleaning' | 'maintenance' | 'other';
  activity_label: string | null;
  started_at: string | null;
  ended_at: string | null;
  status: 'active' | 'completed' | 'verified';
  quantity_produced: number | null;
  performance_percentage: number | null;
  /** Human-readable "what to do" pulled from the PSP MO step when the
   *  session is MO-attributed. Null for non-MO / non-active sessions. */
  operation_description: string | null;
  /** Server-computed session length in decimal hours — populated on stop. */
  duration_hours: number | null;
  /** Snapshot of workstation.uom at the time the snapshot was built,
   *  so the completion screen can label quantity without a second call. */
  workstation_uom: string | null;
  /** First worker name attached to the session — used on the celebration
   *  screen as "Well done, {name}". Null when no worker is linked yet. */
  worker_name: string | null;
}

/** MO row surfaced on a PSP-linked station. `step_uuid` +
 *  `mo_uuid` are what the FE sends back when starting a session. */
export interface StationMORow {
  mo_uuid: string;
  mo_status: string;
  step_uuid: string;
  step_name: string;
  step_sort_order: number | null;
  step_status: string;
  step_planned_start: string | null;
  step_planned_finish: string | null;
  /** Group uuid — echoed back on session start so the BE can pull the
   *  group's throughput from PSP and score the session. Without this,
   *  PSP-mirrored workstations can't produce a performance %. */
  workstation_group_uuid: string | null;
  workstation_group_name: string | null;
  item_name: string | null;
  quantity: string | number | null;
  /** Running total from every session already booked against this step
   *  (SUM(quantity_produced) on PSP). Null when nothing's been logged.
   *  Powers the progress bar on the MO picker row. */
  quantity_produced: string | number | null;
  due_date: string | null;
}

export interface StationMOsPayload {
  psp_source_of_truth: boolean;
  items: StationMORow[];
}

/** One row on the cross-workstation Jobs list. Server pre-resolves the
 *  workstation the worker should route to for this MO, so the FE just
 *  navigates into StationView with `mo_uuid` + `step_uuid` pre-selected. */
export interface JobRow {
  mo_uuid: string;
  mo_status: string;
  step_uuid: string;
  step_name: string;
  step_sort_order: number | null;
  step_status: string;
  step_planned_start: string | null;
  step_planned_finish: string | null;
  workstation_group_uuid: string | null;
  workstation_group_name: string | null;
  workstation_id: number;
  workstation_name: string;
  workstation_kiosk_token: string;
  item_uuid: string | null;
  item_code: string | null;
  item_name: string | null;
  quantity: string | number | null;
  quantity_produced: string | number | null;
  due_date: string | null;
  /** PSP stream: ``production`` (commercial), ``trial`` (R&D
   *  scientist batch), or ``sample`` (customer sample kit). Drives
   *  the R&D chip on the job card so the operator knows to expect
   *  R&D-flavoured quality cadence + separate stock pool. May be
   *  ``null`` if PSP omitted the field (older responses). */
  project_type: string | null;
}

export interface JobsPayload {
  psp_source_of_truth: boolean;
  items: JobRow[];
  /** Server truncated to a hard row cap — the FE renders a "showing
   *  first N" hint so operators know to filter down. Absent when the
   *  full list fit. */
  truncated?: boolean;
}

/** Slim session row on the QC list. */
export interface QCPendingSession {
  id: number;
  workstation_id: number | null;
  workstation_name: string | null;
  workstation_uom: string | null;
  start_time: string;
  end_time: string | null;
  duration_hours: number | null;
  quantity_produced: number | null;
  item_name: string | null;
  workers: { id: number; name: string }[];
}

export interface QCSessionsPayload {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  results: QCPendingSession[];
}

export interface QCFeedbackItem {
  worker_id: number;
  mark: 'positive' | 'negative';
  reason: string;
}

/** Slim row for the QC "leave feedback on any worker" picker. */
export interface QCRosterWorker {
  id: number;
  full_name: string;
  group_name: string | null;
  reputation_score: number;
  reputation_tier: ReputationTier;
}

export interface StationContextPayload {
  workstation: {
    id: number;
    name: string;
    description: string;
    is_general: boolean;
    uom: string;
    kiosk_token: string;
    psp_source_of_truth: boolean;
    /** Full SOP text for this workstation. Empty when unwritten so
     *  the FE can render a "not written yet" nudge state. */
    sop_content: string;
    sop_updated_at: string | null;
  };
  /** Tenant-wide flag — when true, EVERY station on this tenant must
   *  show the PSP MO picker instead of the local item picker. Local
   *  items are only surfaced for tenants without PSP creds. */
  tenant_psp_integrated: boolean;
  active_session: StationSession | null;
  items: StationItem[];
}

export interface WorkerLiveSession {
  id: number;
  workstation_id: number | null;
  workstation_name: string | null;
  workstation_kiosk_token: string | null;
  item_name: string | null;
  task_label: string | null;
  activity_kind: 'mo' | 'cleaning' | 'maintenance' | 'other';
  started_at: string | null;
  mo_uuid: string | null;
}

export interface WorkerLiveStatusPayload {
  active_session: WorkerLiveSession | null;
}

export interface PersonalKioskAuthSessionPayload {
  worker: Worker;
  session_token: string;
  expires_at: string;
}

export interface WorkerTodaySummary {
  worker: {
    id: number;
    name: string;
    reputation_score: number;
    reputation_tier: ReputationTier;
    is_qa: boolean;
  };
  active_shift: WorkerShift | null;
  /** Total seconds across every shift the worker started today
   *  (open shift's live seconds + closed shifts' durations). */
  shift_seconds_today: number;
  sessions_today: {
    count: number;
    avg_performance: number | null;
    total_quantity: number;
  };
  latest_session: {
    id: number;
    workstation_name: string | null;
    performance_percentage: number | null;
    ended_at: string | null;
    status: string;
  } | null;
  qa_reviews_today: number;
}

export interface WorkerDaySession {
  id: number;
  workstation_name: string | null;
  item_name: string | null;
  start_time: string | null;
  end_time: string | null;
  duration_seconds: number | null;
  performance_percentage: number | null;
  quantity_produced: number | null;
  status: string;
  shift_id: number | null;
}

export interface WorkerDayReview {
  id: number;
  target_worker_name: string | null;
  author_name: string | null;
  event_type: string;
  score_delta: number;
  reason: string;
  session_workstation: string | null;
  created_at: string;
  shift_id: number | null;
}

export interface WorkerDayShift {
  id: number;
  clocked_in_at: string;
  clocked_out_at: string | null;
  is_active: boolean;
  duration_seconds: number;
  on_station_seconds: number;
  idle_seconds: number;
  sessions_count: number;
  qa_reviews_count: number;
  notes: string;
  sessions: WorkerDaySession[];
  qa_reviews: WorkerDayReview[];
}

export interface WorkerDayOverview {
  date: string;
  worker: { id: number; name: string; is_qa: boolean };
  shifts: WorkerDayShift[];
  unattached_sessions: WorkerDaySession[];
  unattached_reviews: WorkerDayReview[];
}

export type WorkerShiftStatus = 'active' | 'closed';

export interface WorkerShift {
  id: number;
  worker: number;
  worker_name: string;
  company: number;
  status: WorkerShiftStatus;
  clocked_in_at: string;
  clocked_out_at: string | null;
  /** Server-computed live duration on GETs; ticks up while active. */
  duration_seconds: number;
  is_active: boolean;
  device_id: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWorkerPayload {
  full_name: string;
  hourly_rate: number;
  group?: number;
}

export interface UpdateWorkerPayload extends Partial<CreateWorkerPayload> {
  is_active?: boolean;
}

export interface CreateWorkerGroupPayload {
  name: string;
  description?: string;
}

export interface UpdateWorkerGroupPayload extends Partial<CreateWorkerGroupPayload> {}