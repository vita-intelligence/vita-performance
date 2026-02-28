"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useRef, useEffect } from "react";
import gsap from "gsap";
import { registerSchema, RegisterFormData } from "@/validations/auth.validation";
import { useAuth } from "@/hooks/useAuth";

export default function RegisterForm() {
    const router = useRouter();
    const { register: registerUser, isRegisterLoading } = useAuth();
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        gsap.fromTo(formRef.current,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.6, delay: 0.15, ease: "power3.out" }
        );
    }, []);

    const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
    });

    const onSubmit = async (data: RegisterFormData) => {
        try {
            await registerUser(data);
            router.replace("/dashboard");
        } catch {
            // errors handled by useAuth via addToast
        }
    };

    return (
        <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-widest text-text">
                    Username
                </label>
                <input
                    type="text"
                    placeholder="johndoe"
                    {...register("username")}
                    className="border border-text bg-background text-text px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-text transition-all placeholder:text-muted"
                />
                {errors.username && (
                    <p className="text-error text-xs mt-1">{errors.username.message}</p>
                )}
            </div>

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

            <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-widest text-text">
                    Password
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

            <button
                type="submit"
                disabled={isRegisterLoading}
                className="mt-2 bg-text text-background text-xs font-semibold uppercase tracking-widest py-4 hover:opacity-80 transition-opacity disabled:opacity-50"
            >
                {isRegisterLoading ? "Creating account..." : "Create Account"}
            </button>

            <p className="text-xs text-muted text-center">
                Already have an account?{" "}
                <a href="/login" className="text-text font-semibold underline">
                    Sign in
                </a>
            </p>
        </form>
    );
}