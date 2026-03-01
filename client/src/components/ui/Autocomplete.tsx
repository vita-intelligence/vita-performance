"use client";

import { Autocomplete as HeroAutocomplete, AutocompleteItem } from "@heroui/react";
import type { AutocompleteProps } from "@heroui/react";

interface Option {
    value: string;
    label: string;
}

interface AutocompleteComponentProps extends Omit<AutocompleteProps, "children"> {
    options: Option[];
    error?: string;
    onValueChange?: (value: string) => void;
}

export default function Autocomplete({ options, error, onValueChange, ...props }: AutocompleteComponentProps) {
    return (
        <HeroAutocomplete
            isInvalid={!!error}
            errorMessage={error}
            onSelectionChange={(key) => onValueChange?.(key as string)}
            {...props}
        >
            {options.map((option) => (
                <AutocompleteItem key={option.value}>
                    {option.label}
                </AutocompleteItem>
            ))}
        </HeroAutocomplete>
    );
}