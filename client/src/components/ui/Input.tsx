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
                classNames={{
                    base: "!bg-transparent",
                    inputWrapper: "!bg-surface !border-border hover:!border-text focus-within:!border-text !rounded-none !shadow-none",
                    input: "!text-text !bg-transparent placeholder:!text-muted",
                    label: "!text-muted",
                    errorMessage: "!text-error",
                }}
                {...props}
            />
            {hint && !error && (
                <p className="text-xs text-muted px-1">{hint}</p>
            )}
        </div>
    );
}