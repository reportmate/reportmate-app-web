# ReportMate web wiki

The web dashboard is ReportMate's browser reader. It shows the fleet, each device and each reporting module, using data that the Mac and Windows clients send to the ReportMate API. It never writes device data itself: the API and its PostgreSQL database are the system of record.

## Read first

- [Project setup and environment](../README.md)
- [Example environment settings](../.env.example)
- [URL-as-state conventions](../URL_STATE_CONVENTIONS.md)
- [Modular data processing](../MODULAR_MIGRATION.md)
- [Continuous integration](../.github/workflows/ci.yml)

## Architecture

The dashboard is a Next.js 15 App Router application written in TypeScript and styled with Tailwind CSS. Pages live under [app](../app): the fleet dashboard, the device list, the device detail page at `/device/[deviceId]`, events, settings and one fleet report per module, such as hardware, installs, security, network and identity.

The browser does not call the API directly. Route handlers under [app/api/v1](../app/api/v1) proxy each request to the FastAPI service named by `API_BASE_URL`, adding the internal headers built in [lib/api-auth.ts](../lib/api-auth.ts). The resulting chain is browser, Next.js route handler, FastAPI, PostgreSQL.

Shared client code lives under [src](../src). Data hooks in [src/hooks](../src/hooks) load device and module data progressively, and [src/lib/data-processing](../src/lib/data-processing) turns API responses into the shapes the pages render. The module registry, slots and per-module widgets and charts live in [src/lib/modules](../src/lib/modules).

Sign-in uses NextAuth, configured in [lib/auth.ts](../lib/auth.ts) with Entra ID, Google and credentials providers. [middleware.ts](../middleware.ts) enforces authentication, keeps health, version and static paths public, and exchanges kiosk tokens for read-only kiosk sessions. Setting `DEMO_MODE=true` bypasses sign-in and makes the dashboard read-only, as described in [src/lib/demo-mode.ts](../src/lib/demo-mode.ts).

The [Dockerfile](../Dockerfile) builds a Next.js standalone image. [The publish workflow](../.github/workflows/ghcr-publish.yml) pushes it to the GitHub Container Registry on version tags, for use by the self-hosted Docker Compose stack.

## Development and verification

Use the current [README](../README.md) for installation and environment setup. Install dependencies with pnpm and start the development server.

```bash
pnpm install
pnpm dev
```

The dashboard needs a reachable ReportMate API in `API_BASE_URL`. To explore the interface without sign-in, run with `DEMO_MODE=true`.

[Continuous integration](../.github/workflows/ci.yml) runs on every pull request to `main` and blocks on four checks. Run the same checks locally before opening a pull request.

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm test
pnpm build
```

`next build` ignores type and lint errors by design, so the typecheck and lint steps are the only gates for them. Unit tests use Jest and sit beside the code they cover, for example [src/lib/eventLinks.test.ts](../src/lib/eventLinks.test.ts).

Playwright tests in [e2e](../e2e) check API health, API endpoints, frontend routes and the dashboard against a running instance. [playwright.config.ts](../playwright.config.ts) starts a local development server unless `TEST_ENV` selects production or staging. Run them with `pnpm test:e2e`, or one project at a time with `pnpm test:api-health`, `pnpm test:api-endpoints` or `pnpm test:routes`.

## Documentation ownership

Keep this wiki as the entry point and update the linked pages where the facts belong. Examples use fictional data. Deployment inventories, credentials, provider mappings and organization-specific operations belong with their deployment owner.
