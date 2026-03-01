"use client";

import { Input as HeroInput } from "@heroui/react";
import type { InputProps } from "@heroui/react";

interface CustomInputProps extends InputProps {
    error?: string;
    hint?: string;
}

export default function Input({ error, hint, ...props }: CustomInputProps) {
    return (
        <div className="flex flex-col gap-1">
            <HeroInput
                isInvalid={!!error}
                errorMessage={error}
                {...props}
            />
            {hint && !error && (
                <p className="text-xs text-muted px-1">{hint}</p>
            )}
        </div>
    );
}