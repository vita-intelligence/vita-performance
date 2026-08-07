export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  wsBase: process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000",
  endpoints: {
    auth: {
      register: "/api/accounts/register",
      login: "/api/accounts/login",
      logout: "/api/accounts/logout",
      refresh: "/api/accounts/refresh",
      user: "/api/accounts/user",
      passwordReset: "/api/accounts/password-reset/",
      passwordResetConfirm: "/api/accounts/password-reset/confirm/",
    },
    settings: {
      base: "/api/settings/",
    },
    companies: {
      mine: "/api/companies/mine/",
      integration: "/api/companies/integration/",
      integrationTest: "/api/companies/integration/test/",
      integrationSync: "/api/companies/integration/sync/",
      integrationOutbox: "/api/companies/integration/outbox/",
      integrationOutboxSweep: "/api/companies/integration/outbox/sweep/",
      integrationSeedHR: "/api/companies/integration/seed-hr/",
    },
    meta: {
      currencies: "/api/meta/currencies/",
      languages: "/api/meta/languages/",
      timezones: "/api/meta/timezones/",
    },
    workstations: {
      base: "/api/workstations/",
      detail: (id: number) => `/api/workstations/${id}/`,
      sop: (id: number) => `/api/workstations/${id}/sop/`,
    },
    workers: {
      base: "/api/workers/",
      detail: (id: number) => `/api/workers/${id}/`,
      groups: "/api/workers/groups/",
      groupDetail: (id: number) => `/api/workers/groups/${id}/`,
      leaderboard: '/api/workers/leaderboard/',
      reputationEvents: "/api/workers/reputation/events/",
      // Personal-kiosk clock-in / clock-out. `active` returns 204
      // when the worker is clocked out.
      shiftActive: "/api/workers/shifts/active/",
      shiftStart: "/api/workers/shifts/start/",
      shiftEnd: (id: number) => `/api/workers/shifts/${id}/end/`,
      todaySummary: (id: number) => `/api/workers/${id}/today-summary/`,
      stations: (id: number) => `/api/workers/${id}/stations/`,
      dayOverview: (id: number, date: string) =>
        `/api/workers/${id}/day/${date}/`,
    },
    sessions: {
      base: "/api/sessions/",
      detail: (id: number) => `/api/sessions/${id}/`,
      start: "/api/sessions/start/",
      stop: (id: number) => `/api/sessions/${id}/stop/`,
      active: "/api/sessions/active/",
    },
    dashboard: {
        overview: "/api/dashboard/overview/",
        wsToken: "/api/dashboard/ws-token/",
        ws: "/ws/dashboard/",
        workerStats: (id: number) => `/api/dashboard/workers/${id}/stats/`,
        workstationStats: (id: number) => `/api/dashboard/workstations/${id}/stats/`,
    },
    items: {
        base: "/api/items/",
        detail: (id: number) => `/api/items/${id}/`,
        search: "/api/items/search/",
    },
    personalKiosk: {
        // Admin-facing: get / regenerate the tablet-pairing token.
        token: "/api/kiosk/personal/token/",
        // Public (tenant identified by token in URL, no auth).
        roster: (token: string) =>
            `/api/kiosk/personal/${token}/workers/`,
        activeShift: (token: string, workerId: number) =>
            `/api/kiosk/personal/${token}/workers/${workerId}/shifts/active/`,
        todaySummary: (token: string, workerId: number) =>
            `/api/kiosk/personal/${token}/workers/${workerId}/today-summary/`,
        stations: (token: string, workerId: number) =>
            `/api/kiosk/personal/${token}/workers/${workerId}/stations/`,
        performance: (token: string, workerId: number) =>
            `/api/kiosk/personal/${token}/workers/${workerId}/performance/`,
        reputation: (token: string, workerId: number) =>
            `/api/kiosk/personal/${token}/workers/${workerId}/reputation/`,
        verifyPin: (token: string, workerId: number) =>
            `/api/kiosk/personal/${token}/workers/${workerId}/verify-pin/`,
        liveStatus: (token: string, workerId: number) =>
            `/api/kiosk/personal/${token}/workers/${workerId}/live-status/`,
        session: (token: string, sessionToken: string) =>
            `/api/kiosk/personal/${token}/sessions/${sessionToken}/`,
        stationContext: (token: string, wsId: number) =>
            `/api/kiosk/personal/${token}/workstations/${wsId}/context/`,
        stationItems: (token: string, wsId: number) =>
            `/api/kiosk/personal/${token}/workstations/${wsId}/items/`,
        stationMOs: (token: string, wsId: number) =>
            `/api/kiosk/personal/${token}/workstations/${wsId}/mos/`,
        jobs: (token: string) =>
            `/api/kiosk/personal/${token}/jobs/`,
        qcSessions: (token: string) =>
            `/api/kiosk/personal/${token}/qc/sessions/`,
        qcVerifySession: (token: string, sessionId: number) =>
            `/api/kiosk/personal/${token}/qc/sessions/${sessionId}/verify/`,
        qcWorkers: (token: string) =>
            `/api/kiosk/personal/${token}/qc/workers/`,
        qcFeedback: (token: string) =>
            `/api/kiosk/personal/${token}/qc/feedback/`,
        history: (token: string, workerId: number) =>
            `/api/kiosk/personal/${token}/workers/${workerId}/history/`,
        startStationSession: (token: string, wsId: number) =>
            `/api/kiosk/personal/${token}/workstations/${wsId}/sessions/start/`,
        stopStationSession: (token: string, sessId: number) =>
            `/api/kiosk/personal/${token}/work-sessions/${sessId}/stop/`,
        startShift: (token: string) =>
            `/api/kiosk/personal/${token}/shifts/start/`,
        endShift: (token: string, shiftId: number) =>
            `/api/kiosk/personal/${token}/shifts/${shiftId}/end/`,
    },
    kiosk: {
        base: (token: string) => `/api/kiosk/${token}/`,
        workers: (token: string) => `/api/kiosk/${token}/workers/`,
        verifyPin: (token: string) => `/api/kiosk/${token}/verify-pin/`,
        start: (token: string) => `/api/kiosk/${token}/start/`,
        active: (token: string) => `/api/kiosk/${token}/active/`,
        stop: (token: string) => `/api/kiosk/${token}/stop/`,
        searchItems: (token: string) => `/api/kiosk/${token}/items/`,
        mos: (token: string) => `/api/kiosk/${token}/mos/`,
        sop: (token: string) => `/api/kiosk/${token}/sop/`,
        forms: (token: string, trigger: string) => `/api/kiosk/${token}/forms/?trigger=${trigger}`,
        formRespond: (token: string, formId: number) => `/api/kiosk/${token}/forms/${formId}/respond/`,
        qcWorkers: (token: string) => `/api/kiosk/${token}/qc-workers/`,
    },
    qc: {
        token: "/api/qc/token/",
        workers: (token: string) => `/api/qc/${token}/workers/`,
        allWorkers: (token: string) => `/api/qc/${token}/all-workers/`,
        verifyPin: (token: string) => `/api/qc/${token}/verify-pin/`,
        workstations: (token: string) => `/api/qc/${token}/workstations/`,
        sessions: (token: string) => `/api/qc/${token}/sessions/`,
        verifySession: (token: string, sessionId: number) => `/api/qc/${token}/sessions/${sessionId}/verify/`,
        feedback: (token: string) => `/api/qc/${token}/feedback/`,
    },
    subscription: {
        base: "/api/subscription/",
    },
    dynamicForms: {
        base: "/api/dynamic-forms/",
        detail: (id: number) => `/api/dynamic-forms/${id}/`,
        sessionResponses: (sessionId: number) => `/api/dynamic-forms/sessions/${sessionId}/responses/`,
    },
  },
} as const;