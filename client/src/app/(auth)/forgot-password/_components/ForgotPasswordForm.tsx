"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useEffect, useState } from "react";
import { z } from "zod";
import gsap from "gsap";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

const schema = z.object({
    email: z.string().email("Please enter a valid email"),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordForm() {
    const { passwordReset, isPasswordResetLoading } = useAuth();
    const formRef = useRef<HTMLFormElement>(null);
    const [sent, setSent] = useState(false);

    useEffect(() => {
        gsap.fromTo(formRef.current,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.6, delay: 0.15, ease: "power3.out" }
        );
    }, []);

    const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
    });

    const onSubmit = async (data: FormData) => {
        try {
            await passwordReset(data);
            setSent(true);
        } catch {
            // errors handled by useAuth via addToast
        }
    };

    if (sent) {
        return (
            <div className="flex flex-col gap-4 border border-border p-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-success">Link Sent</p>
                <p className="text-sm text-muted">
                    If that email exists in our system, you'll receive a reset link shortly. Check your inbox.
                </p>

                <Link href="/login" className="text-xs font-semibold uppercase tracking-widest text-text underline">
                    Back to login
                </Link>
            </div>
        );
    }

    return (
        <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-widest text-text">
                    Email
                </label>
                <input
                    type="email"
                    placeholder="you@example.com"
                    {...register("email")}
                    className="border border-text bg-background text-text px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-text transition-all placeholder:text-muted"
                />
                {errors.email && (
                    <p className="text-error text-xs mt-1">{errors.email.message}</p>
                )}
            </div>

            <button
                type="submit"
                disabled={isPasswordResetLoading}
                className="mt-2 bg-text text-background text-xs font-semibold uppercase tracking-widest py-4 hover:opacity-80 transition-opacity disabled:opacity-50"
            >
                {isPasswordResetLoading ? "Sending..." : "Send Reset Link"}
            </button>

            <p className="text-xs text-muted text-center">
                Remember your password?{" "}
                <a href="/login" className="text-text font-semibold underline">
                    Sign in
                </a>
            </p>
        </form>
    );
}