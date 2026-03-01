export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
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
  },
} as const;