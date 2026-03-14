"use client";

import { Button as HeroButton } from "@heroui/react";
import type { ButtonProps as HeroButtonProps } from "@heroui/react";

export default function Button({ children, className, ...props }: HeroButtonProps) {
    return (
        <HeroButton
            className={className}
            {...props}
        >
            {children}
        </HeroButton>
    );
}