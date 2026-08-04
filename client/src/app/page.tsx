"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { useAuth } from "@/hooks/useAuth";

export default function LandingPage() {
    const router = useRouter();
    const { isAuthenticated, isLoading } = useAuth();
    const headerRef = useRef<HTMLDivElement>(null);
    const ctaRef = useRef<HTMLDivElement>(null);

    // Authed visitors go straight to the dashboard — the landing is
    // for signed-out marketing / onboarding.
    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            router.replace("/dashboard");
        }
    }, [isAuthenticated, isLoading, router]);

    useEffect(() => {
        gsap.fromTo(
            headerRef.current,
            { opacity: 0, y: -20 },
            { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" },
        );
        gsap.fromTo(
            ctaRef.current,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.6, delay: 0.15, ease: "power3.out" },
        );
    }, []);

    // Avoid the flash of landing content before the redirect fires.
    if (isLoading || isAuthenticated) return null;

    return (
        <main className="flex min-h-screen">
            <div className="hidden lg:flex w-1/2 bg-text flex-col justify-between p-16">
                <span className="text-background text-xs font-semibold uppercase tracking-[0.3em]">
                    Vita Performance
                </span>
                <div className="flex flex-col gap-4">
                    <h2 className="text-background text-5xl font-black leading-tight">
                        Track.<br />Perform.<br />Improve.
                    </h2>
                    <p className="text-muted text-sm max-w-xs">
                        Your performance data, all in one place.
                    </p>
                </div>
                <span className="text-muted text-xs opacity-50">
                    © {new Date().getFullYear()} Vita Performance
                </span>
            </div>

            <div className="flex flex-1 flex-col justify-center px-8 sm:px-16 lg:px-24 bg-background">
                <div className="w-full max-w-sm mx-auto flex flex-col gap-10">
                    <div ref={headerRef} className="flex flex-col gap-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
                            Vita Performance
                        </p>
                        <h1 className="text-4xl font-black text-text leading-tight">
                            Ready when<br />you are.
                        </h1>
                        <p className="text-muted text-sm mt-1">
                            Real-time production insights, worker sessions, and QC in one dashboard.
                        </p>
                    </div>

                    <div ref={ctaRef} className="flex flex-col gap-4">
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
                        >
                            Go to dashboard
                        </Link>

                        <div className="flex items-center gap-3">
                            <span className="h-px flex-1 bg-border" />
                            <span className="text-xs uppercase tracking-widest text-muted">
                                or
                            </span>
                            <span className="h-px flex-1 bg-border" />
                        </div>

                        <div className="flex flex-col gap-2 text-sm">
                            <Link
                                href="/login"
                                className="inline-flex items-center justify-center rounded-md border border-border px-5 py-3 font-semibold text-text transition-colors hover:bg-surface"
                            >
                                Sign in
                            </Link>
                            <p className="text-center text-muted text-xs">
                                New here?{" "}
                                <Link
                                    href="/register"
                                    className="font-semibold text-primary hover:underline"
                                >
                                    Create an account
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
