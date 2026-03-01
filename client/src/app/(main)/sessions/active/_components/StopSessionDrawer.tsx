"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { stopSessionSchema, StopSessionFormData } from "@/validations/session.validation";
import { useSessions } from "@/hooks/useSessions";
import { WorkSession } from "@/types/session";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Drawer from "@/components/ui/Drawer";

interface StopSessionDrawerProps {
    session: WorkSession | null;
    onClose: () => void;
}

export default function StopSessionDrawer({ session, onClose }: StopSessionDrawerProps) {
    const { stopSession, isStopping } = useSessions();

    const { register, handleSubmit, reset, formState: { errors } } = useForm<StopSessionFormData>({
        resolver: zodResolver(stopSessionSchema),
    });

    const onSubmit = async (data: StopSessionFormData) => {
        if (!session) return;
        try {
            await stopSession({ id: session.id, payload: data });
            reset();
            onClose();
        } catch {
            // errors handled by useSessions via addToast
        }
    };

    return (
        <Drawer
            isOpen={!!session}
            onClose={onClose}
            title="Complete Session"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">

                {session && (
                    <div className="flex flex-col gap-3 p-4 border border-border bg-surface">
                        <div className="flex flex-col gap-1">
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Worker</p>
                            <p className="text-sm text-text">{session.worker_name}</p>
                        </div>
                        <div className="flex flex-col gap-1">
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Workstation</p>
                            <p className="text-sm text-text">{session.workstation_name}</p>
                        </div>
                    </div>
                )}

                <Input
                    label="Quantity Produced"
                    type="number"
                    placeholder="e.g. 120000"
                    hint="How many units were produced in this session."
                    error={errors.quantity_produced?.message}
                    {...register("quantity_produced")}
                />

                <Input
                    label="Notes"
                    placeholder="Optional notes about this session"
                    error={errors.notes?.message}
                    {...register("notes")}
                />

                <div className="flex gap-3 pt-4 border-t border-border">
                    <Button
                        type="button"
                        variant="bordered"
                        className="flex-1 rounded-none border-text text-text text-xs font-semibold uppercase tracking-widest"
                        onPress={onClose}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        isLoading={isStopping}
                        className="flex-1 bg-text text-background rounded-none text-xs font-semibold uppercase tracking-widest hover:opacity-80 transition-opacity"
                    >
                        Complete
                    </Button>
                </div>

            </form>
        </Drawer>
    );
}