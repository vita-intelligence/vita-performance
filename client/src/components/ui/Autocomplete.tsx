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
            classNames={{
                base: "!bg-transparent",
                listboxWrapper: "!bg-surface !rounded-none !border !border-border",
                popoverContent: "!bg-surface !rounded-none !border !border-border",
                listbox: "!bg-surface",
                endContentWrapper: "!text-muted",
                clearButton: "!text-muted hover:!text-text",
                selectorButton: "!text-muted hover:!text-text",
            }}
            inputProps={{
                classNames: {
                    inputWrapper: "!bg-surface !border-border hover:!border-text focus-within:!border-text !rounded-none !shadow-none",
                    input: "!text-text !bg-transparent placeholder:!text-muted",
                    label: "!text-muted",
                    errorMessage: "!text-error",
                }
            }}
            {...props}
        >
            {options.map((option) => (
                <AutocompleteItem
                    key={option.value}
                    classNames={{
                        base: "!rounded-none !text-text hover:!bg-background data-[hover=true]:!bg-background data-[selected=true]:!bg-background",
                    }}
                >
                    {option.label}
                </AutocompleteItem>
            ))}
        </HeroAutocomplete>
    );
}