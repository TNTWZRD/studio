const counters: Record<string, number> = {};

export default {
  increment(key: string, n = 1) {
    counters[key] = (counters[key] || 0) + n;
    // lightweight console output for observability
    try { console.info(`[metrics] ${key} -> ${counters[key]}`); } catch {}
  },
  get(key: string) {
    return counters[key] || 0;
  },
  dump() {
    return { ...counters };
  }
} as const;
