import SettingsHeader from "./_components/SettingsHeader";
import SettingsForm from "./_components/SettingsForm";

export default function SettingsPage() {
    return (
        <main className="min-h-screen bg-background px-4 py-12 sm:px-8 lg:px-16">
            <div className="max-w-3xl mx-auto flex flex-col gap-10">
                <SettingsHeader />
                <SettingsForm />
            </div>
        </main>
    );
}