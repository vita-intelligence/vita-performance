# Creating a Page

This document explains how to structure and build a new page using Next.js App Router, HeroUI, Tailwind, GSAP, React Hook Form, and Zod.

---

## Overview

Every page is built from small, focused components. The rule is simple:

- **Page file** — thin, just composes components, no logic
- **Page-private components** — components only used by that page
- **Shared components** — components reused across multiple pages
- **Validations** — Zod schemas and form types, one file per feature

---

## File Structure

```
src/
├── app/
│   └── (main)/
│       └── dashboard/
│           ├── page.tsx                  # composes components only
│           └── _components/             # private to this page
│               ├── DashboardHeader.tsx
│               └── DashboardStats.tsx
│
├── components/
│   ├── ui/                              # dumb, reusable across the whole app
│   │   ├── Button.tsx
│   │   └── Input.tsx
│   └── shared/                          # smarter, reused across pages
│       └── Navbar.tsx
│
├── validations/
│   ├── auth.validation.ts
│   └── workout.validation.ts
│
├── hooks/
│   └── useAuth.ts
│
└── services/
    └── auth.service.ts
```

---

## Step-by-Step: Adding a New Page

We'll use a **Login page** as a complete example.

---

### Step 1 — Validation Schema (`src/validations/auth.validation.ts`)

Always start with the schema. It defines the shape of the form and generates the TypeScript type.

```ts
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be less than 20 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores",
    ),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

// Types derived from schemas — use these in your form components
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
```

---

### Step 2 — UI Components (`src/components/ui/`)

Build or add pure, dumb UI components with no business logic. These only receive props and render UI.

```tsx
// src/components/ui/Input.tsx
"use client";

import { Input as HeroInput } from "@heroui/react";
import { ComponentProps } from "react";

interface InputProps extends ComponentProps<typeof HeroInput> {
  error?: string;
}

export default function Input({ error, ...props }: InputProps) {
  return <HeroInput isInvalid={!!error} errorMessage={error} {...props} />;
}
```

```tsx
// src/components/ui/Button.tsx
"use client";

import { Button as HeroButton } from "@heroui/react";
import { ComponentProps } from "react";

export default function Button({
  children,
  ...props
}: ComponentProps<typeof HeroButton>) {
  return <HeroButton {...props}>{children}</HeroButton>;
}
```

---

### Step 3 — Page-Private Components (`src/app/(auth)/login/_components/`)

These components are only used by the login page. They contain the actual form logic.

```tsx
// src/app/(auth)/login/_components/LoginForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useRef, useEffect } from "react";
import gsap from "gsap";
import { loginSchema, LoginFormData } from "@/validations/auth.validation";
import { useAuth } from "@/hooks/useAuth";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function LoginForm() {
  const router = useRouter();
  const { login, isLoginLoading, loginError } = useAuth();
  const formRef = useRef<HTMLFormElement>(null);

  // GSAP entrance animation
  useEffect(() => {
    gsap.fromTo(
      formRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
    );
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data);
      router.replace("/dashboard");
    } catch {
      // error is handled by useAuth via loginError
    }
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
    >
      <Input
        label="Email"
        type="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <Input
        label="Password"
        type="password"
        error={errors.password?.message}
        {...register("password")}
      />
      {loginError && (
        <p className="text-error text-sm">Invalid email or password</p>
      )}
      <Button type="submit" isLoading={isLoginLoading} color="primary">
        Login
      </Button>
    </form>
  );
}
```

```tsx
// src/app/(auth)/login/_components/LoginHeader.tsx
"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";

export default function LoginHeader() {
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.fromTo(
      headerRef.current,
      { opacity: 0, y: -20 },
      { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
    );
  }, []);

  return (
    <div ref={headerRef} className="flex flex-col gap-1 text-center">
      <h1 className="font-heading text-3xl text-text">Welcome back</h1>
      <p className="text-muted text-sm">Login to your account</p>
    </div>
  );
}
```

---

### Step 4 — Page File (`src/app/(auth)/login/page.tsx`)

The page file is always thin — it just composes the components together. No logic here.

```tsx
import LoginHeader from "./_components/LoginHeader";
import LoginForm from "./_components/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex w-full max-w-md flex-col gap-8 rounded-xl bg-surface p-8">
        <LoginHeader />
        <LoginForm />
      </div>
    </main>
  );
}
```

---

## Component Decision Guide

When building a component, ask yourself:

| Question                               | Answer | Where it lives                      |
| -------------------------------------- | ------ | ----------------------------------- |
| Is it used by more than one page?      | Yes    | `src/components/shared/`            |
| Is it a pure UI element with no logic? | Yes    | `src/components/ui/`                |
| Is it only used by one specific page?  | Yes    | `src/app/.../[page]/_components/`   |
| Does it contain form logic?            | Yes    | `_components/` of the relevant page |

---

## GSAP Guidelines

- Always use `useRef` + `useEffect` for animations
- Attach refs to the outermost element of the component
- Keep animations in the component they belong to, not in the page file
- For complex animation sequences, create a custom hook:

```ts
// src/hooks/useEntrance.ts
import { useEffect, useRef } from "react";
import gsap from "gsap";

export const useEntrance = () => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    gsap.fromTo(
      ref.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
    );
  }, []);

  return ref;
};
```

---

## Rules to Follow

- **Page files are dumb** — no hooks, no logic, just JSX composition
- **Never fetch data inside a component** — always go through a hook
- **Never import a service directly in a component** — services are for hooks only
- **Schemas live in `src/validations/`** — never define Zod schemas inside components
- **Form types come from schemas** — use `z.infer<typeof schema>`, not manual interfaces
- **GSAP animations belong to the component** — not the page
- **Private components go in `_components/`** — the underscore tells Next.js it's not a route
