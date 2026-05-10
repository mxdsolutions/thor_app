import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getURL = () => {
  let url =
    process?.env?.NEXT_PUBLIC_APP_URL ?? // Set this to your site URL in production env.
    process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
    "http://localhost:3000/";
  // Make sure to include `https://` when not localhost.
  url = url.includes("http") ? url : `https://${url}`;
  // Make sure to include a trailing `/`.
  url = url.charAt(url.length - 1) === "/" ? url : `${url}/`;
  return url;
};

// --- Shared types ---

export type AppUser = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  tenant_role?: string;
  /** True when this row represents a pending tenant_invite (no membership yet). */
  is_pending?: boolean;
  user_metadata: {
    first_name?: string;
    last_name?: string;
    full_name?: string;
    user_type?: string;
    position?: string;
    hourly_rate?: number;
  };
};

// --- Display utilities ---

export function getInitials(user: AppUser): string {
  const { first_name, last_name, full_name } = user.user_metadata;
  if (first_name && last_name) return `${first_name[0]}${last_name[0]}`.toUpperCase();
  if (full_name) return full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  return user.email.slice(0, 2).toUpperCase();
}

export function getDisplayName(user: AppUser): string {
  const { first_name, last_name, full_name } = user.user_metadata;
  if (first_name && last_name) return `${first_name} ${last_name}`;
  if (full_name) return full_name;
  return user.email.split("@")[0];
}

export function formatLastActive(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min${mins !== 1 ? "s" : ""} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatCurrency(value: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(value);
}

/** Format a duration in milliseconds as `Hh Mm` (e.g. "2h 15m"). */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0m";
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

const pad2 = (n: number) => n.toString().padStart(2, "0");

/** Today as a `YYYY-MM-DD` string in the user's local timezone. */
export function todayISODate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Current time as a `HH:MM` string in the user's local timezone. */
export function nowHHMM(): string {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Combine a `YYYY-MM-DD` date and `HH:MM` time into a Date, or null if either
 *  is missing/invalid. Interprets the inputs as local time. */
export function combineDateTime(date: string, time: string): Date | null {
  if (!date || !time) return null;
  const dt = new Date(`${date}T${time}`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}
