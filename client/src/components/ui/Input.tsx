"use client";

import { Input as HeroInput } from "@heroui/react";
import type { InputProps as HeroInputProps } from "@heroui/react";

interface InputProps extends HeroInputProps {
    error?: string;
}

export default function Input({ error, ...props }: InputProps) {
    return (
        <HeroInput
            isInvalid={!!error}
            errorMessage={error}
            {...props}
        />
    );
}