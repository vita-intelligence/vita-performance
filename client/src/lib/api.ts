import axios from "axios";
import { API_CONFIG } from "@/config/api";

const PUBLIC_PATHS = ["/login", "/register"];
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
      if (typeof window !== "undefined" && window.location.pathname !== "/billing") {
        window.location.href = "/billing";
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
          !PUBLIC_PATHS.includes(window.location.pathname)
        ) {
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;