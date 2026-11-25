interface Entry {
  count: number;
  resetAt: number;
}

/**
 * Simple fixed-window rate limiter.
 *
 * State is process-local, which is sufficient for the single app container.
 * The unit tests inject `now` so the window logic is deterministic.
 */
export class FixedWindowRateLimiter {
  private readonly entries = new Map<string, Entry>();

  constructor(
    private readonly maxAttempts: number,
    private readonly windowMs: number
  ) {}

  isLimited(key: string, now: number = Date.now()): boolean {
    const entry = this.entries.get(key);
    if (!entry) return false;
    if (now > entry.resetAt) {
      this.entries.delete(key);
      return false;
    }
    return entry.count >= this.maxAttempts;
  }

  recordFailure(key: string, now: number = Date.now()): void {
    const entry = this.entries.get(key);
    if (!entry || now > entry.resetAt) {
      this.entries.set(key, { count: 1, resetAt: now + this.windowMs });
      return;
    }
    entry.count += 1;
  }

  reset(key: string): void {
    this.entries.delete(key);
  }
}
