import { act, renderHook } from "@testing-library/react";
import {
  cachedAt,
  clearCache,
  findNearestCached,
  peekCached,
  rememberCached,
  trackedFetch,
  useLoadProgress,
} from "./data-cache";

describe("data-cache", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    clearCache();
    global.fetch = originalFetch;
  });

  describe("peekCached / rememberCached", () => {
    it("returns undefined before anything is stored", () => {
      expect(peekCached("/api/v1/security")).toBeUndefined();
      expect(cachedAt("/api/v1/security")).toBe(0);
    });

    it("returns the last value stored under a key", () => {
      const rows = [{ serialNumber: "ABC" }];
      expect(rememberCached("/api/v1/security", rows)).toBe(rows);
      expect(peekCached("/api/v1/security")).toBe(rows);
      expect(cachedAt("/api/v1/security")).toBeGreaterThan(0);

      const newer = [{ serialNumber: "DEF" }];
      rememberCached("/api/v1/security", newer);
      expect(peekCached("/api/v1/security")).toBe(newer);
    });

    it("keeps keys apart and remembers an empty list as data", () => {
      rememberCached("/api/v1/network", []);
      expect(peekCached("/api/v1/network")).toEqual([]);
      expect(peekCached("/api/v1/hardware")).toBeUndefined();
    });

    it("clearCache drops every entry", () => {
      rememberCached("/api/v1/network", [1]);
      clearCache();
      expect(peekCached("/api/v1/network")).toBeUndefined();
    });
  });

  describe("trackedFetch progress", () => {
    function deferredFetch() {
      const resolvers: Array<(r: Response) => void> = [];
      global.fetch = jest.fn(
        () => new Promise<Response>((resolve) => resolvers.push(resolve)),
      ) as unknown as typeof fetch;
      return resolvers;
    }

    it("counts requests in flight and returns the fetch response", async () => {
      const resolvers = deferredFetch();
      const { result } = renderHook(() => useLoadProgress());
      const idleTotal = result.current.total;
      expect(result.current.done).toBe(idleTotal);

      let first!: Promise<Response>;
      let second!: Promise<Response>;
      act(() => {
        first = trackedFetch("/api/v1/security", { credentials: "include" });
        second = trackedFetch("/api/v1/network", undefined, {
          background: true,
        });
      });
      expect(result.current).toMatchObject({ total: 2, done: 0, background: false });
      expect(global.fetch).toHaveBeenCalledWith("/api/v1/security", {
        credentials: "include",
      });

      const response = { ok: true } as Response;
      await act(async () => {
        resolvers[0](response);
        await first;
      });
      expect(result.current.done).toBe(1);
      await expect(first).resolves.toBe(response);

      await act(async () => {
        resolvers[1]({ ok: true } as Response);
        await second;
      });
      expect(result.current).toMatchObject({ total: 2, done: 2 });
    });

    it("marks a batch of background refreshes as background", async () => {
      const resolvers = deferredFetch();
      const { result } = renderHook(() => useLoadProgress());

      let pending!: Promise<Response>;
      act(() => {
        pending = trackedFetch("/api/v1/hardware", undefined, {
          background: true,
        });
      });
      expect(result.current).toMatchObject({ total: 1, done: 0, background: true });

      await act(async () => {
        resolvers[0]({ ok: true } as Response);
        await pending;
      });
      expect(result.current.done).toBe(result.current.total);
    });

    it("counts a failed request as finished and rethrows", async () => {
      global.fetch = jest.fn(() =>
        Promise.reject(new Error("offline")),
      ) as unknown as typeof fetch;
      const { result } = renderHook(() => useLoadProgress());

      await act(async () => {
        await expect(trackedFetch("/api/v1/identity")).rejects.toThrow(
          "offline",
        );
      });
      expect(result.current.done).toBe(result.current.total);
    });
  });
});

describe('findNearestCached', () => {
  beforeEach(() => clearCache())

  it('returns the most recently stored entry under a prefix that passes the filter', () => {
    const now = jest.spyOn(Date, 'now')
    now.mockReturnValue(1000)
    rememberCached('/api/events/failures?hours=24&outcome=rejected', { n: 1 })
    now.mockReturnValue(2000)
    rememberCached('/api/events/failures?hours=168&outcome=retried', { n: 2 })
    now.mockReturnValue(3000)
    rememberCached('/api/v1/security', { n: 3 })
    now.mockRestore()

    expect(findNearestCached('/api/events/failures?')).toEqual({
      key: '/api/events/failures?hours=168&outcome=retried', data: { n: 2 },
    })
    expect(findNearestCached('/api/events/failures?', k => k.includes('rejected'))?.data).toEqual({ n: 1 })
    expect(findNearestCached('/api/v1/identity')).toBeUndefined()
  })
})
