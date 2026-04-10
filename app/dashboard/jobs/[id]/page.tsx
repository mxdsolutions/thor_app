"use client";

import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { JobDetailView, type JobDetailJob } from "@/components/jobs/JobDetailView";
import { usePageTitle } from "@/lib/page-title-context";
import { ROUTES } from "@/lib/routes";
import { mutate as globalMutate } from "swr";

const fetcher = (url: string) => fetch(url).then((r) => {
    if (!r.ok) throw new Error("Failed to load");
    return r.json();
});

export default function JobDetailPage() {
    usePageTitle("Job");
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const id = params.id;

    const { data, error, isLoading, mutate } = useSWR<{ item: JobDetailJob }>(
        id ? `/api/jobs/${id}` : null,
        fetcher
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                Loading job...
            </div>
        );
    }

    if (error || !data?.item) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-sm text-muted-foreground">
                <p>Job not found.</p>
                <button
                    onClick={() => router.push(ROUTES.OPS_JOBS)}
                    className="text-primary font-medium hover:underline"
                >
                    Back to jobs
                </button>
            </div>
        );
    }

    return (
        <JobDetailView
            job={data.item}
            mode="inline"
            onUpdate={() => {
                mutate();
                globalMutate("/api/jobs");
            }}
            onClose={() => router.push(ROUTES.OPS_JOBS)}
        />
    );
}
