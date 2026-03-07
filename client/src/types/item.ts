export interface Item {
    id: number;
    name: string;
    created_at: string;
}

export interface CreateItemPayload {
    name: string;
}

export interface UpdateItemPayload {
    name: string;
}