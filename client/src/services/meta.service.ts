import api from "@/lib/api";
import { API_CONFIG } from "@/config/api";
import { Currency, Language, Timezone } from "@/types/meta";

const { meta } = API_CONFIG.endpoints;

export const metaService = {
  getCurrencies: async (): Promise<Currency[]> => {
    const { data } = await api.get<Currency[]>(meta.currencies);
    return data;
  },

  getLanguages: async (): Promise<Language[]> => {
    const { data } = await api.get<Language[]>(meta.languages);
    return data;
  },

  getTimezones: async (): Promise<Timezone[]> => {
    const { data } = await api.get<Timezone[]>(meta.timezones);
    return data;
  },
};