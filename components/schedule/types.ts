export type ScheduleEntryJob = {
    id: string;
    job_title: string;
    description: string | null;
    reference_id?: string | null;
    status: string;
    amount: number;
    paid_status?: string;
    total_payment_received?: number;
    scheduled_date?: string | null;
    created_at?: string;
    company?: { id: string; name: string } | null;
    contact?: { id: string; first_name: string; last_name: string } | null;
    assignees?: { user: { id: string; full_name: string | null; email?: string | null } }[];
};

export type ScheduleEntry = {
    id: string;
    job_id: string;
    date: string;
    start_time: string | null;
    end_time: string | null;
    notes: string | null;
    job?: ScheduleEntryJob | null;
    created_at: string;
};
