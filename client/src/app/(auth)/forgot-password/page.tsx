import ForgotPasswordHeader from "./_components/ForgotPasswordHeader";
import ForgotPasswordForm from "./_components/ForgotPasswordForm";

export default function ForgotPasswordPage() {
    return (
        <main className="flex min-h-screen">
            <div className="hidden lg:flex w-1/2 bg-text flex-col justify-between p-16">
                <span className="text-background text-xs font-semibold uppercase tracking-[0.3em]">
                    Vita Performance
                </span>
                <div className="flex flex-col gap-4">
                    <h2 className="text-background text-5xl font-black leading-tight">
                        Forgot your<br />password?
                    </h2>
                    <p className="text-muted text-sm max-w-xs">
                        No worries — we'll send you a reset link right away.
                    </p>
                </div>
                <span className="text-muted text-xs opacity-50">
                    © {new Date().getFullYear()} Vita Performance
                </span>
            </div>

            <div className="flex flex-1 flex-col justify-center px-8 sm:px-16 lg:px-24 bg-background">
                <div className="w-full max-w-sm mx-auto flex flex-col gap-10">
                    <ForgotPasswordHeader />
                    <ForgotPasswordForm />
                </div>
            </div>
        </main>
    );
}