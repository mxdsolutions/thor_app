export type CalendarDay = {
    date: Date;
    dateKey: string;
    isCurrentMonth: boolean;
};

/** Format a Date to "YYYY-MM-DD" string */
export function toDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

/** Parse "YYYY-MM-DD" to a Date at midnight local time */
export function fromDateKey(key: string): Date {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d);
}

/** Today's date key */
export function todayKey(): string {
    return toDateKey(new Date());
}

/** Get calendar days for a month grid (Mon-Sun weeks) */
export function getCalendarDays(month: Date): CalendarDay[] {
    const year = month.getFullYear();
    const m = month.getMonth();
    const firstOfMonth = new Date(year, m, 1);
    const lastOfMonth = new Date(year, m + 1, 0);

    // Walk back to Monday
    const start = new Date(firstOfMonth);
    const dayOfWeek = start.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    start.setDate(start.getDate() - mondayOffset);

    const days: CalendarDay[] = [];
    const cursor = new Date(start);

    while (cursor <= lastOfMonth || cursor.getDay() !== 1) {
        days.push({
            date: new Date(cursor),
            dateKey: toDateKey(cursor),
            isCurrentMonth: cursor.getMonth() === m,
        });
        cursor.setDate(cursor.getDate() + 1);
    }

    return days;
}

/** Format as "April 2026" */
export function formatMonthYear(date: Date): string {
    return date.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}

/** Format as "Tuesday, 7 April 2026" */
export function formatDayHeader(dateKey: string): string {
    const date = fromDateKey(dateKey);
    return date.toLocaleDateString("en-AU", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

/** Get the 7 date keys (Mon-Sun) for the week containing the given date */
export function getWeekDateKeys(date: Date): string[] {
    const d = new Date(date);
    const dayOfWeek = d.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    d.setDate(d.getDate() - mondayOffset);

    const keys: string[] = [];
    for (let i = 0; i < 7; i++) {
        keys.push(toDateKey(d));
        d.setDate(d.getDate() + 1);
    }
    return keys;
}

/** Get the Monday of the week containing the given date */
export function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const dayOfWeek = d.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    d.setDate(d.getDate() - mondayOffset);
    return d;
}

/** Get calendar days for a single week (Mon-Sun) */
export function getWeekDays(weekStart: Date): CalendarDay[] {
    const days: CalendarDay[] = [];
    const cursor = new Date(weekStart);
    for (let i = 0; i < 7; i++) {
        days.push({
            date: new Date(cursor),
            dateKey: toDateKey(cursor),
            isCurrentMonth: true,
        });
        cursor.setDate(cursor.getDate() + 1);
    }
    return days;
}

/** Format a week range like "6 – 12 Apr 2026" */
export function formatWeekRange(weekStart: Date): string {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    const sameMonth = weekStart.getMonth() === end.getMonth();
    if (sameMonth) {
        return `${weekStart.getDate()} – ${end.getDate()} ${end.toLocaleDateString("en-AU", { month: "short", year: "numeric" })}`;
    }
    return `${weekStart.getDate()} ${weekStart.toLocaleDateString("en-AU", { month: "short" })} – ${end.getDate()} ${end.toLocaleDateString("en-AU", { month: "short", year: "numeric" })}`;
}

/** Get first and last date keys of a month */
export function getMonthRange(month: Date): { start: string; end: string } {
    const y = month.getFullYear();
    const m = month.getMonth();
    return {
        start: toDateKey(new Date(y, m, 1)),
        end: toDateKey(new Date(y, m + 1, 0)),
    };
}
