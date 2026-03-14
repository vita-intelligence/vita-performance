import axios from "axios";
import { API_CONFIG } from "@/config/api";
import { addToast } from "@heroui/react";

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/reset-password"];
const SKIP_REFRESH_URLS = [
  API_CONFIG.endpoints.auth.login,
  API_CONFIG.endpoints.auth.register,
  API_CONFIG.endpoints.auth.refresh,
];

const api = axios.create({
  baseURL: API_CONFIG.baseUrl,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const shouldSkip = SKIP_REFRESH_URLS.some(url => original.url.includes(url));

    // Subscription expired — redirect to billing
    if (error.response?.status === 402) {
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/billing")
      ) {
        window.location.href = "/billing";
      }
      return Promise.reject(error);
    }

    // Plan limit or feature not available — show toast
    if (error.response?.status === 403) {
      const data = error.response?.data;
      const detail = typeof data?.detail === 'object' ? data.detail.detail : data?.detail;
      const code = typeof data?.detail === 'object' ? data.detail.code : data?.code;

      const isPlanError = [
        'worker_limit_reached',
        'workstation_limit_reached',
        'kiosk_not_available',
        'qc_not_available',
        'realtime_not_available',
      ].includes(code);

      if (isPlanError && detail) {
        addToast({
          title: "Plan limit reached",
          description: detail,
          color: "danger",
          timeout: 5000,
        });
      }
      return Promise.reject(error);
    }

    if (
      error.response?.status === 401 &&
      !original._retry &&
      !shouldSkip
    ) {
      original._retry = true;

      try {
        await axios.post(
          `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.auth.refresh}`,
          {},
          { withCredentials: true }
        );
        return api(original);
      } catch {
        if (
          typeof window !== "undefined" &&
          !PUBLIC_PATHS.some(path => window.location.pathname.startsWith(path))
        ) {
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;