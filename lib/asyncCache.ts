export interface CachePolicy<V> {
  ttlMs: number;
  emptyTtlMs: number;
  staleMs: number;
  retryTtlMs: number;
  isEmpty: (value: V) => boolean;
}

interface Entry<V> {
  value?: V;
  hasValue: boolean;
  expiresAt: number;
  staleUntil: number;
  inFlight?: Promise<V>;
}

export function createAsyncCache<K, V>(now: () => number = () => Date.now()) {
  const entries = new Map<K, Entry<V>>();

  return {
    async get(key: K, loader: () => Promise<V>, policy: CachePolicy<V>): Promise<V> {
      const current = now();
      const existing = entries.get(key);
      if (existing?.hasValue && current < existing.expiresAt) return existing.value as V;
      if (existing?.inFlight) return existing.inFlight;

      const entry = existing ?? { hasValue: false, expiresAt: 0, staleUntil: 0 };
      const task = loader()
        .then((loaded) => {
          const completed = now();
          const canUseStale = policy.isEmpty(loaded)
            && entry.hasValue
            && completed < entry.staleUntil
            && !policy.isEmpty(entry.value as V);

          if (canUseStale) {
            entry.expiresAt = completed + policy.retryTtlMs;
            return entry.value as V;
          }

          const ttl = policy.isEmpty(loaded) ? policy.emptyTtlMs : policy.ttlMs;
          entry.value = loaded;
          entry.hasValue = true;
          entry.expiresAt = completed + ttl;
          entry.staleUntil = completed + ttl + policy.staleMs;
          return loaded;
        })
        .catch((error) => {
          const failed = now();
          if (entry.hasValue && failed < entry.staleUntil) {
            entry.expiresAt = failed + policy.retryTtlMs;
            return entry.value as V;
          }
          entries.delete(key);
          throw error;
        })
        .finally(() => {
          entry.inFlight = undefined;
        });

      entry.inFlight = task;
      entries.set(key, entry);
      return task;
    },
    clear() {
      entries.clear();
    },
    size() {
      return entries.size;
    }
  };
}
