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
    },
    settings: {
      base: "/api/settings/",
    },
    meta: {
      currencies: "/api/meta/currencies/",
      languages: "/api/meta/languages/",
      timezones: "/api/meta/timezones/",
    },
    workstations: {
      base: "/api/workstations/",
      detail: (id: number) => `/api/workstations/${id}/`,
    },
    workers: {
      base: "/api/workers/",
      detail: (id: number) => `/api/workers/${id}/`,
      groups: "/api/workers/groups/",
      groupDetail: (id: number) => `/api/workers/groups/${id}/`,
      leaderboard: '/api/workers/leaderboard/',
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
    },
    items: {
        base: "/api/items/",
        detail: (id: number) => `/api/items/${id}/`,
        search: "/api/items/search/",
    },
    kiosk: {
        base: (token: string) => `/api/kiosk/${token}/`,
        workers: (token: string) => `/api/kiosk/${token}/workers/`,
        verifyPin: (token: string) => `/api/kiosk/${token}/verify-pin/`,
        start: (token: string) => `/api/kiosk/${token}/start/`,
        active: (token: string) => `/api/kiosk/${token}/active/`,
        stop: (token: string) => `/api/kiosk/${token}/stop/`,
        searchItems: (token: string) => `/api/kiosk/${token}/items/`,
    },
    qc: {
        token: "/api/qc/token/",
        workers: (token: string) => `/api/qc/${token}/workers/`,
        verifyPin: (token: string) => `/api/qc/${token}/verify-pin/`,
        workstations: (token: string) => `/api/qc/${token}/workstations/`,
        sessions: (token: string, workstationId: number) => `/api/qc/${token}/workstations/${workstationId}/sessions/`,
        verifySession: (token: string, sessionId: number) => `/api/qc/${token}/sessions/${sessionId}/verify/`,
    },
  },
} as const;