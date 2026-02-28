import api from "@/lib/api";
import { API_CONFIG } from "@/config/api";
import { AuthResponse, LoginPayload, RegisterPayload, User } from "@/types/auth";

const { auth } = API_CONFIG.endpoints;

export const authService = {
  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>(auth.register, payload);
    return data;
  },

  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>(auth.login, payload);
    return data;
  },

  logout: async (): Promise<void> => {
    await api.post(auth.logout);
  },

  getUser: async (): Promise<User> => {
    const { data } = await api.get<User>(auth.user);
    return data;
  },
};