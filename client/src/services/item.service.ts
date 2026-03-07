import api from "@/lib/api";
import { API_CONFIG } from "@/config/api";
import { Item, CreateItemPayload, UpdateItemPayload } from "@/types/item";
import { PaginatedResponse } from "@/types/api";

const { items } = API_CONFIG.endpoints;

export const itemService = {
    getAll: async (): Promise<Item[]> => {
        const { data } = await api.get<PaginatedResponse<Item>>(items.base);
        return data.results;
    },

    search: async (q: string): Promise<Item[]> => {
        const { data } = await api.get<Item[]>(items.search, { params: { q } });
        return data;
    },

    create: async (payload: CreateItemPayload): Promise<Item> => {
        const { data } = await api.post<Item>(items.base, payload);
        return data;
    },

    update: async (id: number, payload: UpdateItemPayload): Promise<Item> => {
        const { data } = await api.patch<Item>(items.detail(id), payload);
        return data;
    },

    delete: async (id: number): Promise<void> => {
        await api.delete(items.detail(id));
    },
};