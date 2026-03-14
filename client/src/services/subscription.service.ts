import api from "@/lib/api";
import { API_CONFIG } from "@/config/api";
import { Subscription } from "@/types/subscription";

const { subscription } = API_CONFIG.endpoints;

export const subscriptionService = {
    getStatus: async (): Promise<Subscription> => {
        const { data } = await api.get<Subscription>(subscription.base);
        return data;
    },
};