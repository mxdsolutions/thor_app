"use client";

import { Button } from "@/components/ui/button";
import { Plus as PlusIcon } from "lucide-react";
import type { ScheduleEntry } from "@/components/schedule/types";

function formatTimeRange(start: string | null, end: string | null) {
    if (!start && !end) return "All day";
    const fmt = (t: string) => {
        const [h, m] = t.split(":");
        const hour = parseInt(h, 10);
        const ampm = hour >= 12 ? "pm" : "am";
        const display = hour % 12 || 12;
        return `${display}:${m}${ampm}`;
    };
    if (start && end) return `${fmt(start)} – ${fmt(end)}`;
    return fmt((start || end)!);
}

interface Props {
    appointments: ScheduleEntry[];
    onOpenAppointment: (entry: ScheduleEntry | null) => void;
}

export function JobAppointmentsTab({ appointments, onOpenAppointment }: Props) {
    return (
        <div className="space-y-2 px-1">
            <div className="flex items-center justify-between mb-2">
                <p className="text-base font-semibold text-foreground">Appointments</p>
                <Button size="sm" onClick={() => onOpenAppointment(null)}>
                    <PlusIcon className="w-3.5 h-3.5 mr-1" />
                    New Appointment
                </Button>
            </div>
            {appointments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No appointments yet</p>
            ) : appointments.map((appt) => (
                <button
                    key={appt.id}
                    type="button"
                    onClick={() => onOpenAppointment(appt)}
                    className="w-full flex items-center justify-between p-3 rounded-xl border bg-card text-sm cursor-pointer hover:bg-secondary/50 transition-colors text-left"
                >
                    <div>
                        <p className="font-medium">
                            {new Date(appt.date).toLocaleDateString("en-AU", { dateStyle: "medium" })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {formatTimeRange(appt.start_time, appt.end_time)}
                            {appt.notes && <span className="ml-2">· {appt.notes}</span>}
                        </p>
                    </div>
                </button>
            ))}
        </div>
    );
}
