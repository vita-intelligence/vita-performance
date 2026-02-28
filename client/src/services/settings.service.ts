import api from "@/lib/api";
import { API_CONFIG } from "@/config/api";
import { UserSettings, UpdateSettingsPayload } from "@/types/settings";

const { settings } = API_CONFIG.endpoints;

export const settingsService = {
  getSettings: async (): Promise<UserSettings> => {
    const { data } = await api.get<UserSettings>(settings.base);
    return data;
  },

  updateSettings: async (payload: UpdateSettingsPayload): Promise<UserSettings> => {
    const { data } = await api.patch<UserSettings>(settings.base, payload);
    return data;
  },
};