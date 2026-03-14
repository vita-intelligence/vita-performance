"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { settingsSchema, SettingsFormData } from "@/validations/settings.validation";
import { useSettings } from "@/hooks/useSettings";
import { useMeta } from "@/hooks/useMeta";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Autocomplete from "@/components/ui/Autocomplete";
import Button from "@/components/ui/Button";
import {
    DATE_FORMATS,
    TIME_FORMATS,
    DECIMAL_SEPARATORS,
    THOUSANDS_SEPARATORS,
    WEEK_STARTS,
} from "@/constants/settings.constants";
import ThemeSelector from "./ThemeSelector";

interface SectionProps {
    title: string;
    children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted whitespace-nowrap">
                    {title}
                </h2>
                <div className="h-px bg-border flex-1" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {children}
            </div>
        </div>
    );
}

export default function SettingsForm() {
    const { settings, updateSettings, isUpdating } = useSettings();
    const { currencies, languages, timezones, isLoading: isMetaLoading } = useMeta();
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        gsap.fromTo(formRef.current,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.6, delay: 0.15, ease: "power3.out" }
        );
    }, []);

    const { register, handleSubmit, reset, control, setValue, formState: { errors } } = useForm<SettingsFormData>({
        resolver: zodResolver(settingsSchema),
    });

    useEffect(() => {
        if (settings) {
            reset({
                language: settings.language,
                timezone: settings.timezone,
                date_format: settings.date_format,
                time_format: settings.time_format,
                currency: settings.currency,
                currency_symbol: settings.currency_symbol,
                decimal_separator: settings.decimal_separator,
                thousands_separator: settings.thousands_separator,
                working_hours_per_day: settings.working_hours_per_day,
                working_days_per_week: settings.working_days_per_week,
                overtime_threshold: settings.overtime_threshold,
                overtime_multiplier: settings.overtime_multiplier,
                week_starts_on: settings.week_starts_on,
                work_start_time: settings.work_start_time?.slice(0, 5),
            });
        }
    }, [settings, reset]);

    const onSubmit = async (data: SettingsFormData) => {
        try {
            await updateSettings(data);
        } catch {
            // errors handled by useSettings via addToast
        }
    };

    if (isMetaLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <p className="text-muted text-sm uppercase tracking-widest">Loading...</p>
            </div>
        );
    }

    return (
        <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">

            <Section title="General">
                <Controller
                    name="language"
                    control={control}
                    render={({ field }) => (
                        <Autocomplete
                            label="Language"
                            options={languages}
                            selectedKey={field.value}
                            onValueChange={field.onChange}
                            error={errors.language?.message}
                        />
                    )}
                />
                <Controller
                    name="timezone"
                    control={control}
                    render={({ field }) => (
                        <Autocomplete
                            label="Timezone"
                            options={timezones}
                            selectedKey={field.value}
                            onValueChange={field.onChange}
                            error={errors.timezone?.message}
                        />
                    )}
                />
                <Controller
                    name="date_format"
                    control={control}
                    render={({ field }) => (
                        <Select
                            label="Date Format"
                            options={DATE_FORMATS}
                            selectedKeys={field.value ? [field.value] : []}
                            onSelectionChange={(keys) => field.onChange(Array.from(keys)[0])}
                            error={errors.date_format?.message}
                        />
                    )}
                />
                <Controller
                    name="time_format"
                    control={control}
                    render={({ field }) => (
                        <Select
                            label="Time Format"
                            options={TIME_FORMATS}
                            selectedKeys={field.value ? [field.value] : []}
                            onSelectionChange={(keys) => field.onChange(Array.from(keys)[0])}
                            error={errors.time_format?.message}
                        />
                    )}
                />
            </Section>

            <Section title="Currency">
                <Controller
                    name="currency"
                    control={control}
                    render={({ field }) => (
                        <Autocomplete
                            label="Currency"
                            options={currencies}
                            selectedKey={field.value}
                            onValueChange={(value) => {
                                field.onChange(value);
                                const selected = currencies.find((c) => c.value === value);
                                if (selected?.symbol) {
                                    setValue("currency_symbol", selected.symbol);
                                }
                            }}
                            error={errors.currency?.message}
                        />
                    )}
                />
                <Controller
                    name="currency_symbol"
                    control={control}
                    render={({ field }) => (
                        <Input
                            label="Currency Symbol"
                            placeholder="£"
                            value={field.value || ""}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            error={errors.currency_symbol?.message}
                        />
                    )}
                />
                <Controller
                    name="decimal_separator"
                    control={control}
                    render={({ field }) => (
                        <Select
                            label="Decimal Separator"
                            options={DECIMAL_SEPARATORS}
                            selectedKeys={field.value ? [field.value] : []}
                            onSelectionChange={(keys) => field.onChange(Array.from(keys)[0])}
                            error={errors.decimal_separator?.message}
                        />
                    )}
                />
                <Controller
                    name="thousands_separator"
                    control={control}
                    render={({ field }) => (
                        <Select
                            label="Thousands Separator"
                            options={THOUSANDS_SEPARATORS}
                            selectedKeys={field.value ? [field.value] : []}
                            onSelectionChange={(keys) => field.onChange(Array.from(keys)[0])}
                            error={errors.thousands_separator?.message}
                        />
                    )}
                />
            </Section>

            <Section title="Work Schedule">
                <Input
                    label="Working Hours Per Day"
                    type="number"
                    placeholder="8"
                    error={errors.working_hours_per_day?.message}
                    {...register("working_hours_per_day")}
                />
                <Input
                    label="Working Days Per Week"
                    type="number"
                    placeholder="5"
                    error={errors.working_days_per_week?.message}
                    {...register("working_days_per_week")}
                />
                <Input
                    label="Overtime After (hours)"
                    type="number"
                    placeholder="8"
                    error={errors.overtime_threshold?.message}
                    {...register("overtime_threshold")}
                />
                <Input
                    label="Overtime Multiplier"
                    type="number"
                    placeholder="1.5"
                    error={errors.overtime_multiplier?.message}
                    {...register("overtime_multiplier")}
                />
                <Controller
                    name="week_starts_on"
                    control={control}
                    render={({ field }) => (
                        <Select
                            label="Week Starts On"
                            options={WEEK_STARTS}
                            selectedKeys={field.value ? [field.value] : []}
                            onSelectionChange={(keys) => field.onChange(Array.from(keys)[0])}
                            error={errors.week_starts_on?.message}
                        />
                    )}
                />
                <Input
                    label="Work Start Time"
                    type="time"
                    error={errors.work_start_time?.message}
                    {...register("work_start_time")}
                />
            </Section>

            <ThemeSelector />

            <div className="flex justify-end pt-4 border-t border-border">
                <Button
                    type="submit"
                    isLoading={isUpdating}
                    className="bg-text text-background px-8 rounded-none font-semibold uppercase tracking-widest text-xs hover:opacity-80 transition-opacity"
                >
                    Save Changes
                </Button>
            </div>

        </form>
    );
}