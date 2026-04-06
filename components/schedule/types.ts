export type ScheduleEntryJob = {
    id: string;
    description: string;
    status: string;
    amount: number;
    company?: { id: string; name: string } | null;
    assignees?: { user: { id: string; full_name: string | null } }[];
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
