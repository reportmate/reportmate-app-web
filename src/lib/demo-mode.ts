/**
 * Demo mode switch, read on the server at request time.
 *
 * Demo mode bypasses sign-in and makes the dashboard read-only. It is turned
 * on with `DEMO_MODE=true` in the container's environment, so the published
 * image honours it without a rebuild.
 *
 * `NEXT_PUBLIC_DEMO_MODE=true` is still accepted in two ways:
 *
 * - as a build argument, for images built with it. Next.js inlines a literal
 *   `process.env.NEXT_PUBLIC_*` reference at build time, so BUILT_IN_DEMO_MODE
 *   carries whatever the image was built with.
 * - at runtime. Reading it through the `env` parameter rather than a literal
 *   `process.env.NEXT_PUBLIC_DEMO_MODE` keeps that lookup out of the build-time
 *   inlining, which is why setting it on a running container used to do nothing.
 *
 * Server-only: client components get the value from DemoModeProvider, which
 * the root layout seeds from this function.
 */
const BUILT_IN_DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

export function isDemoMode(env: Record<string, string | undefined> = process.env): boolean {
  return BUILT_IN_DEMO_MODE || env.DEMO_MODE === 'true' || env.NEXT_PUBLIC_DEMO_MODE === 'true'
}
