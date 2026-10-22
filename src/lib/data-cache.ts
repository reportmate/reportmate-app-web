/**
 * A module-level cache of the last answer for each report request, and a
 * count of requests in flight for the top-of-page progress bar.
 *
 * Client navigation unmounts a page but not this module, so a page that seeds
 * its state from `peekCached(key)` shows its last data instantly on return and
 * refreshes in the background: stale-while-revalidate without a library. The
 * cache lives for the browser tab only and holds one entry per key.
 */

"use client";

import { useSyncExternalStore } from "react";

interface Entry {
  data: unknown;
  at: number;
}

const store = new Map<string, Entry>();

/** The last answer stored under `key`, or undefined before the first one. */
export function peekCached<T>(key: string): T | undefined {
  return store.get(key)?.data as T | undefined;
}

/**
 * The most recently stored entry whose key starts with `prefix` and passes
 * `accept`, for showing the nearest cached answer while an exact one loads.
 */
export function findNearestCached<T>(
  prefix: string,
  accept: (key: string) => boolean = () => true,
): { key: string; data: T } | undefined {
  let best: { key: string; entry: Entry } | undefined;
  for (const [key, entry] of store) {
    if (!key.startsWith(prefix) || !accept(key)) continue;
    if (!best || entry.at > best.entry.at) best = { key, entry };
  }
  return best ? { key: best.key, data: best.entry.data as T } : undefined;
}

/** When `key` was last stored (epoch ms), or 0. */
export function cachedAt(key: string): number {
  return store.get(key)?.at ?? 0;
}

/** Remembers `data` as the latest answer for `key` and returns it. */
export function rememberCached<T>(key: string, data: T): T {
  store.set(key, { data, at: Date.now() });
  return data;
}

/** Drops every entry (tests, sign-out). */
export function clearCache(): void {
  store.clear();
}

// MARK: - Load progress

interface Progress {
  /** Requests started since the bar last went idle. */
  total: number;
  /** Of those, how many have finished. */
  done: number;
  /** True when every request in this batch is a background refresh. */
  background: boolean;
}

let progress: Progress = { total: 0, done: 0, background: true };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function begin(background: boolean) {
  progress =
    progress.done === progress.total
      ? { total: 1, done: 0, background }
      : {
          total: progress.total + 1,
          done: progress.done,
          background: progress.background && background,
        };
  emit();
}

function end() {
  progress = { ...progress, done: Math.min(progress.total, progress.done + 1) };
  emit();
}

/**
 * `fetch`, counted in the progress bar. Pass `background: true` when the page
 * already shows cached data, so the bar reads as an update, not a first load.
 */
export async function trackedFetch(
  input: string,
  init?: RequestInit,
  options: { background?: boolean } = {},
): Promise<Response> {
  begin(!!options.background);
  try {
    return await fetch(input, init);
  } finally {
    end();
  }
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const snapshot = () => progress;
const serverSnapshot = (): Progress => ({
  total: 0,
  done: 0,
  background: true,
});

/** Requests in flight, as `{total, done, background}`. Idle when done === total. */
export function useLoadProgress(): Progress {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
