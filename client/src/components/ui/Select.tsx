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
            {...props}
        >
            {options.map((option) => (
                <SelectItem key={option.value}>
                    {option.label}
                </SelectItem>
            ))}
        </HeroSelect>
    );
}