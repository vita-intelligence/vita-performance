"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { z } from "zod";
import gsap from "gsap";
import { useAuth } from "@/hooks/useAuth";

const schema = z.object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

type FormData = z.infer<typeof schema>;

export default function ResetPasswordForm() {
    const router = useRouter();
    const { payload } = useParams<{ payload: string }>();
    const { passwordResetConfirm, isPasswordResetConfirmLoading } = useAuth();
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        gsap.fromTo(formRef.current,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.6, delay: 0.15, ease: "power3.out" }
        );
    }, []);

    const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
    });

    if (!payload) {
        return (
            <div className="flex flex-col gap-4 border border-error p-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-error">Invalid Link</p>
                <p className="text-sm text-muted">
                    This reset link is invalid or has expired. Please request a new one.
                </p>
                <a href="/forgot-password" className="text-xs font-semibold uppercase tracking-widest text-text underline">
                    Request new link
                </a>
            </div>
        );
    }

    const onSubmit = async (data: FormData) => {
        try {
            await passwordResetConfirm({ payload, password: data.password });
            router.replace("/login");
        } catch {
            // errors handled by useAuth via addToast
        }
    };

    return (
        <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-widest text-text">
                    New Password
                </label>
                <input
                    type="password"
                    placeholder="••••••••"
                    {...register("password")}
                    className="border border-text bg-background text-text px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-text transition-all placeholder:text-muted"
                />
                {errors.password && (
                    <p className="text-error text-xs mt-1">{errors.password.message}</p>
                )}
            </div>
            <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-widest text-text">
                    Confirm Password
                </label>
                <input
                    type="password"
                    placeholder="••••••••"
                    {...register("confirmPassword")}
                    className="border border-text bg-background text-text px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-text transition-all placeholder:text-muted"
                />
                {errors.confirmPassword && (
                    <p className="text-error text-xs mt-1">{errors.confirmPassword.message}</p>
                )}
            </div>
            <button
                type="submit"
                disabled={isPasswordResetConfirmLoading}
                className="mt-2 bg-text text-background text-xs font-semibold uppercase tracking-widest py-4 hover:opacity-80 transition-opacity disabled:opacity-50"
            >
                {isPasswordResetConfirmLoading ? "Resetting..." : "Reset Password"}
            </button>
            <p className="text-xs text-muted text-center">
                Remember your password?{" "}
                <a href="/login" className="text-text font-semibold underline">Sign in</a>
            </p>
        </form>
    );
}