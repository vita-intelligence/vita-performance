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
    },
  },
} as const;