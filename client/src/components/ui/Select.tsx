"use client";

import { Select as HeroSelect, SelectItem } from "@heroui/react";
import type { SelectProps } from "@heroui/react";

interface Option {
    value: string;
    label: string;
}

interface CustomSelectProps extends Omit<SelectProps, "children"> {
    options: Option[];
    error?: string;
}

export default function Select({ options, error, ...props }: CustomSelectProps) {
    return (
        <HeroSelect
            isInvalid={!!error}
            errorMessage={error}
            classNames={{
                base: "!bg-transparent",
                trigger: "!bg-surface !border-border hover:!border-text !rounded-none !shadow-none",
                value: "!text-text",
                label: "!text-muted",
                errorMessage: "!text-error",
                popoverContent: "!bg-surface !rounded-none !border !border-border",
                listbox: "!bg-surface",
            }}
            {...props}
        >
            {options.map((option) => (
                <SelectItem
                    key={option.value}
                    classNames={{
                        base: "!rounded-none !text-text hover:!bg-background data-[hover=true]:!bg-background data-[selected=true]:!bg-background",
                    }}
                >
                    {option.label}
                </SelectItem>
            ))}
        </HeroSelect>
    );
}