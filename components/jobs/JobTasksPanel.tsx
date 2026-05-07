"use client";

import { useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { cn } from "@/lib/utils";
import { IconPlus as PlusIcon } from "@tabler/icons-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useProfiles } from "@/lib/swr";

type Task = {
    id: string;
    title: string;
    status: "pending" | "in_progress" | "completed" | "cancelled";
    priority: number;
    due_date: string | null;
    assigned_user: { id: string; full_name: string | null } | null;
};

const statusDot: Record<string, string> = {
    completed: "bg-emerald-500",
    in_progress: "bg-blue-500",
    cancelled: "bg-rose-500",
    pending: "bg-amber-500",
};

const priorityLabels: Record<number, string> = { 1: "Urgent", 2: "High", 3: "Normal", 4: "Low" };
const priorityColors: Record<number, string> = { 1: "text-rose-500", 2: "text-orange-500", 3: "text-muted-foreground", 4: "text-muted-foreground" };

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface JobTasksPanelProps {
    jobId: string;
    /** Whether this panel is rendered as a full-height right rail (inline page) or inside a tab. */
    variant?: "rail" | "tab";
}

/** Tasks list for a specific job. Fetches /api/tasks?job_id={id}, supports add + toggle status. */
export function JobTasksPanel({ jobId, variant = "rail" }: JobTasksPanelProps) {
    const endpoint = `/api/tasks?job_id=${jobId}`;
    const { data, mutate, isLoading } = useSWR<{ items: Task[] }>(endpoint, fetcher);
    const tasks = data?.items || [];

    const [adding, setAdding] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newAssignee, setNewAssignee] = useState<string>("");
    const [saving, setSaving] = useState(false);

    const { data: profilesData } = useProfiles();
    const users: Array<{ id: string; full_name: string | null; email: string | null }> = profilesData?.users || [];

    const resetForm = () => {
        setNewTitle("");
        setNewAssignee("");
        setAdding(false);
    };

    const createTask = async () => {
        const title = newTitle.trim();
        if (!title || saving) return;
        setSaving(true);
        try {
            const res = await fetch("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title,
                    job_id: jobId,
                    assigned_to: newAssignee || null,
                }),
            });
            if (!res.ok) throw new Error();
            resetForm();
            mutate();
            globalMutate("/api/tasks?assigned_to=me");
        } catch {
            toast.error("Failed to create task");
        } finally {
            setSaving(false);
        }
    };

    const toggleTask = async (task: Task) => {
        const next = task.status === "completed" ? "pending" : "completed";
        // Optimistic update
        mutate(
            { items: tasks.map((t) => (t.id === task.id ? { ...t, status: next } : t)) },
            false
        );
        try {
            const res = await fetch("/api/tasks", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: task.id, status: next }),
            });
            if (!res.ok) throw new Error();
            mutate();
            globalMutate("/api/tasks?assigned_to=me");
        } catch {
            toast.error("Failed to update task");
            mutate();
        }
    };

    return (
        <div className={cn(
            "flex flex-col w-full h-full min-h-0",
            variant === "rail" && "border-l border-border bg-background"
        )}>
            <div className="px-5 pt-5 pb-3 flex items-center justify-between shrink-0">
                <h3 className="text-xl font-bold tracking-wide">Tasks</h3>
                <Button
                    type="button"
                    size="sm"
                    onClick={() => setAdding((v) => !v)}
                >
                    <PlusIcon className="w-3.5 h-3.5 mr-1" />
                    Add task
                </Button>
            </div>

            {adding && (
                <div className="px-5 pb-3 shrink-0">
                    <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                        <input
                            type="text"
                            autoFocus
                            data-no-focus-style
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") { e.preventDefault(); createTask(); }
                                if (e.key === "Escape") { resetForm(); }
                            }}
                            placeholder="Task title..."
                            className="w-full px-2 py-1.5 text-sm bg-transparent border-0 outline-none focus:outline-none"
                        />
                        <select
                            value={newAssignee}
                            onChange={(e) => setNewAssignee(e.target.value)}
                            className="w-full h-8 rounded-lg border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                            <option value="">Unassigned</option>
                            {users.map((u) => (
                                <option key={u.id} value={u.id}>{u.full_name || u.email || u.id}</option>
                            ))}
                        </select>
                        <div className="flex items-center gap-2 justify-end">
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={resetForm}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={createTask}
                                disabled={!newTitle.trim() || saving}
                            >
                                {saving ? "Adding..." : "Add"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2">
                {isLoading ? (
                    <div className="text-xs text-muted-foreground text-center py-8">Loading...</div>
                ) : tasks.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-8">No tasks yet.</div>
                ) : (
                    tasks.map((task) => (
                        <div
                            key={task.id}
                            className="group rounded-xl border border-border bg-card p-3 flex items-start gap-2.5 hover:border-border/80 transition-colors"
                        >
                            <button
                                type="button"
                                onClick={() => toggleTask(task)}
                                className={cn(
                                    "w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 transition-colors flex items-center justify-center",
                                    task.status === "completed"
                                        ? "bg-emerald-500 border-emerald-500"
                                        : "border-muted-foreground/40 hover:border-foreground"
                                )}
                                aria-label={task.status === "completed" ? "Mark incomplete" : "Mark complete"}
                            >
                                {task.status === "completed" && (
                                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </button>
                            <div className="flex-1 min-w-0">
                                <p className={cn(
                                    "text-sm font-medium leading-tight",
                                    task.status === "completed" && "line-through text-muted-foreground"
                                )}>
                                    {task.title}
                                </p>
                                <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                                    {task.due_date && (
                                        <span>{new Date(task.due_date).toLocaleDateString("en-AU", { dateStyle: "medium" })}</span>
                                    )}
                                    {task.due_date && <span>·</span>}
                                    <span className="flex items-center gap-1">
                                        <span className={cn("w-1.5 h-1.5 rounded-full", statusDot[task.status] || "bg-gray-400")} />
                                        <span className="capitalize">{task.status.replace(/_/g, " ")}</span>
                                    </span>
                                    {task.priority !== 3 && (
                                        <>
                                            <span>·</span>
                                            <span className={cn("font-medium", priorityColors[task.priority] || "")}>
                                                {priorityLabels[task.priority] || "Normal"}
                                            </span>
                                        </>
                                    )}
                                    {task.assigned_user?.full_name && (
                                        <>
                                            <span>·</span>
                                            <span className="truncate">{task.assigned_user.full_name}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

