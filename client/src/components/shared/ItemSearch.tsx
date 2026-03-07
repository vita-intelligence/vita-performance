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
}

export default function ItemSearch({ value, onChange, error }: ItemSearchProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Item[]>([]);
    const debouncedQuery = useDebounce(query, 300);

    useEffect(() => {
        itemService.search(debouncedQuery).then(setResults);
    }, [debouncedQuery]);

    return (
        <Autocomplete
            label="Item"
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
        >
            {(item) => (
                <AutocompleteItem key={String(item.id)}>
                    {item.name}
                </AutocompleteItem>
            )}
        </Autocomplete>
    );
}