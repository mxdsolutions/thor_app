/** Lightweight in-memory rate limiter for public report endpoints.
 *  Mirrors the tenantCache pattern in middleware.ts. Tracks token misses per
 *  IP — legitimate clients hit-then-stay; only probes burn through the limit.
 */

const MAX_MISSES = 30;
const WINDOW_MS = 60_000;
const MAX_ENTRIES = 1000;

type Counter = { count: number; resetAt: number };

const counters = new Map<string, Counter>();

function evictExpired() {
    if (counters.size < MAX_ENTRIES) return;
    const now = Date.now();
    for (const [k, v] of counters) {
        if (v.resetAt <= now) counters.delete(k);
    }
    if (counters.size >= MAX_ENTRIES) {
        const keys = [...counters.keys()];
        for (let i = 0; i < keys.length / 2; i++) counters.delete(keys[i]);
    }
}

export function ipFromRequest(request: Request): string {
    const fwd = request.headers.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0]!.trim();
    const real = request.headers.get("x-real-ip");
    if (real) return real;
    return "anonymous";
}

/** Returns true if the IP is over the miss budget. Does NOT increment. */
export function isOverLimit(ip: string): boolean {
    const now = Date.now();
    const entry = counters.get(ip);
    if (!entry || entry.resetAt <= now) return false;
    return entry.count >= MAX_MISSES;
}

/** Record one token miss and return whether the client is now over the limit. */
export function recordMiss(ip: string): boolean {
    const now = Date.now();
    evictExpired();
    const existing = counters.get(ip);
    if (!existing || existing.resetAt <= now) {
        counters.set(ip, { count: 1, resetAt: now + WINDOW_MS });
        return false;
    }
    existing.count += 1;
    return existing.count >= MAX_MISSES;
}
