"use client";

import { useState, useEffect } from "react";
import { Autocomplete, AutocompleteItem } from "@heroui/react";
import { useDebounce } from "@/hooks/useDebounce";
import { itemService } from "@/services/item.service";
import { Item } from "@/types/item";

interface ItemSearchProps {
    value?: number | null;
    onChange: (id: number | null) => void;
    error?: string;
    label?: string;
    defaultLabel?: string;
}

export default function ItemSearch({ value, onChange, error, label = "Item", defaultLabel }: ItemSearchProps) {
    const [query, setQuery] = useState(defaultLabel || "");
    const [results, setResults] = useState<Item[]>([]);
    const debouncedQuery = useDebounce(query, 300);

    useEffect(() => {
        setQuery(defaultLabel || "");
    }, [defaultLabel]);

    useEffect(() => {
        itemService.search(debouncedQuery).then(setResults);
    }, [debouncedQuery]);

    return (
        <Autocomplete
            label={label}
            placeholder="Search items..."
            isInvalid={!!error}
            errorMessage={error}
            inputValue={query}
            onInputChange={setQuery}
            selectedKey={value ? String(value) : null}
            onSelectionChange={(key) => {
                onChange(key ? Number(key) : null);
                const found = results.find((r) => String(r.id) === String(key));
                if (found) setQuery(found.name);
            }}
            items={results}
            classNames={{
                base: "!bg-transparent",
                listboxWrapper: "!bg-surface !rounded-none !border !border-border",
                popoverContent: "!bg-surface !rounded-none !border !border-border",
                listbox: "!bg-surface",
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
        >
            {(item) => (
                <AutocompleteItem
                    key={String(item.id)}
                    classNames={{
                        base: "!rounded-none !text-text data-[hover=true]:!bg-background data-[selected=true]:!bg-background",
                    }}
                >
                    {item.name}
                </AutocompleteItem>
            )}
        </Autocomplete>
    );
}