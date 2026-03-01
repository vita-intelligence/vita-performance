import NewSessionHeader from "./_components/NewSessionHeader";
import NewSessionForm from "./_components/NewSessionForm";

export default function NewSessionPage() {
    return (
        <main className="bg-background px-4 py-12 sm:px-8 lg:px-16">
            <div className="max-w-6xl mx-auto flex flex-col gap-10">
                <NewSessionHeader />
                <NewSessionForm />
            </div>
        </main>
    );
}