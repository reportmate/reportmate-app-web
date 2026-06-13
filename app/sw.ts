/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker"
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist"
import { NetworkOnly, Serwist } from "serwist"

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

// Device data must never be served stale-as-live. API calls go straight to the
// network; if the network is down the request fails and the UI shows its own
// empty/offline state rather than a cached snapshot pretending to be current.
const apiNetworkOnly: RuntimeCaching = {
  matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/api/"),
  handler: new NetworkOnly(),
}

// The app's root layout is force-dynamic, so no page HTML is statically
// prerendered for Serwist to precache. The offline fallback is therefore a
// self-contained static file in public/, precached explicitly here (and its
// logo) so the document fallback works with zero network.
const offlineFallbacks: (PrecacheEntry | string)[] = [
  { url: "/offline.html", revision: null },
  { url: "/reportmate-logo.png", revision: null },
]

const serwist = new Serwist({
  precacheEntries: [...(self.__SW_MANIFEST ?? []), ...offlineFallbacks],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  // API rule first so it wins over defaultCache's catch-all handlers.
  runtimeCaching: [apiNetworkOnly, ...defaultCache],
  fallbacks: {
    entries: [
      {
        url: "/offline.html",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
})

serwist.addEventListeners()
