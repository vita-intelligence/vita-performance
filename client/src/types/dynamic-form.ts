export type FieldType =
    | "text"
    | "number"
    | "yes_no"
    | "checkbox"
    | "dropdown"
    | "rating"
    | "signature"
    | "qc_approval";

export interface FieldOption {
    id: string;
    label: string;
}

export interface FormField {
    id: string;
    type: FieldType;
    label: string;
    required: boolean;
    placeholder?: string;
    options?: FieldOption[];
    max_rating?: number;
    condition?: {
        field_id: string;
        operator: "equals" | "not_equals";
        value: string;
    } | null;
}

export interface DynamicForm {
    id: number;
    name: string;
    trigger: "start" | "end" | "both";
    schema: FormField[];
    is_active: boolean;
    workstation: number | null;
    workstation_name: string | null;
    created_at: string;
    updated_at: string;
}

export interface KioskForm {
    id: number;
    name: string;
    schema: FormField[];
}

export interface FormResponse {
    id: number;
    session: number;
    form: number;
    form_name: string;
    answers: Record<string, any>;
    submitted_at: string;
}

export interface CreateFormPayload {
    name: string;
    trigger: "start" | "end" | "both";
    schema: FormField[];
    workstation?: number | null;
    is_active?: boolean;
}

export interface UpdateFormPayload {
    name?: string;
    trigger?: "start" | "end" | "both";
    schema?: FormField[];
    workstation?: number | null;
    is_active?: boolean;
}

export interface SessionFormResponse {
    id: number;
    form_id: number;
    form_name: string;
    trigger: "start" | "end" | "both";
    submitted_at: string;
    answers: Record<string, any>;
    schema: FormField[];
}