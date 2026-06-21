# ReportMate URL-as-State Conventions

URLs are the source of truth for any viewable state. Every list, report, and filter
selection hydrates from the URL on mount and writes back on change. Result: every
view is bookmarkable, shareable, and back-button correct.

## Principles

1. **URL is canonical.** If state isn't in the URL, it doesn't persist a refresh.
2. **Defaults are omitted.** A "clean" page has no query string. Only non-default
   values appear in the URL.
3. **Short param names.** `q`, `apps`, `period`, `type`, `mode`, `sort`, `dir`,
   `tab`, `from` — not `searchQuery` or `selectedApplications`.
4. **Lists are comma-separated.** `apps=Houdini,Maya,Deadline+Client`. Individual
   values are URL-encoded.
5. **`router.replace`, not `push`.** Filter toggling should not spam history.
   Pressing Back should leave the report entirely, not undo one filter at a time.
6. **Drill-downs carry `?from=`.** The originating page's full URL (with state) is
   passed via `from=` so the back button returns the user to exactly where they were.

## Param Naming Reference

| Param | Type | Used by | Notes |
|---|---|---|---|
| `platform` | `win` \| `mac` | Global (header) | Already wired |
| `q` | string | All list pages | Search query |
| `type` | `versions` \| `usage` \| `missing` | Reports | Triggers auto-load on hydration |
| `mode` | `has` \| `missing` | Versions report | Default `has` is omitted |
| `period` | int (days) | Usage/events | e.g. `30`, `90`, `365` |
| `apps` | list | Applications, drill-downs | App names, comma-separated |
| `usages` | list | All filter pages | Inventory `usage` field |
| `catalogs` | list | All filter pages | Inventory `catalog` field |
| `locations` | list | All filter pages | Inventory `location` field |
| `rooms` | list | All filter pages | Alias for location in some views |
| `fleets` | list | All filter pages | Fleet grouping |
| `versions` | list | Applications | Version filter |
| `sort` | column name | Sortable tables | e.g. `totalHours` |
| `dir` | `asc` \| `desc` | Sortable tables | Default `desc` is omitted |
| `tab` | string | Device detail | Active tab pane |
| `from` | encoded URL | Drill-down pages | Back-button target |

## Reusable Hook

`apps/www/src/hooks/useUrlState.ts` (to be authored after Phase 1 pilot):

```ts
type UrlStateConfig<T> = {
  // Mapping of state field to URL param name + serde
  fields: { [K in keyof T]: ParamSpec<T[K]> }
  // Called once after URL→state hydration completes
  onHydrated?: (initial: T) => void
}

function useUrlState<T>(config: UrlStateConfig<T>): {
  state: T
  setField: <K extends keyof T>(key: K, value: T[K]) => void
  reset: () => void
  hydrated: boolean
}
```

Behavior:
- Hydrates from `useSearchParams()` once on mount (sets `hydrated=true`).
- Writes back to URL via `router.replace` whenever state changes, defaults
  omitted, debounced 100ms to avoid spam during rapid toggling.
- Preserves params not declared in `fields` (e.g. `platform` set by the layout).

## Drill-down Back-Button Rule

Every internal navigation that takes the user to a deeper view passes the
originating URL via `?from=`:

```tsx
const fromUrl = `${pathname}?${searchParams.toString()}`
<Link href={`/dest?...&from=${encodeURIComponent(fromUrl)}`}>...</Link>
```

The destination page uses a `<BackLink>` component:

```tsx
<BackLink fallback="/applications">← Usage Report</BackLink>
```

`BackLink` reads `?from=` and uses it; falls back to the supplied default.

## Rollout Phases

### Phase 1 — Pilot: Applications

**Status:** Deployed (2026-05-11). Awaiting in-browser verification.

Scope:
- [x] `/applications` — Hydrate + sync URL for `type`, `mode`, `period`,
      `q`, `apps`, `usages`, `catalogs`, `locations`, `rooms`, `fleets`, `versions`
- [x] Auto-trigger report on hydration when `type` is present (via `pendingReport`
      state set during hydration, processed on next tick)
- [x] Drill-down link passes `from=` carrying the parent's full URL state
- [x] `/applications/usage/[appName]` — back link honors `?from=`,
      falls back to `/applications` with `← Applications` label
- [x] Legacy back-compat: `?application=`, `?usage=`, `?catalog=`, `?room=`,
      `?search=` still work (merged into the new param schema during hydration)
- [ ] **In-browser verification:**
      - Paste `…?type=usage&period=30&apps=Deadline+Client` into a fresh tab
        → report auto-loads
      - Generate report → URL updates with all selections → reload preserves
      - Click app row → drill-down → back button returns to populated report

After Phase 1 verification, extract `useUrlState` hook from the patterns used
in `apps/www/app/applications/page.tsx` (hydration effect + pending-
report trigger + state→URL sync effect).

### Phase 2 — Device filter pages

One sweep, same pattern:
- [ ] `/hardware`
- [ ] `/installs`
- [ ] `/inventory`
- [ ] `/management`
- [ ] `/network`
- [ ] `/peripherals`
- [ ] `/profiles`
- [ ] `/security`
- [ ] `/system`
- [ ] `/devices` (top-level list)

Each gets: search (`q`), filter selections (`usages`/`catalogs`/`locations`/etc.),
sort (`sort`+`dir`), and any view mode toggles.

### Phase 3 — Device detail page

- [ ] `/device/[serial]` — `tab=` query param for which module is open
- [ ] Sub-tabs within modules (if any) — nested tab params or path segments

### Phase 4 — Drill-downs everywhere

- [ ] Audit every `Link` to internal pages, add `?from=` where the destination
      is a detail/drill-down view
- [ ] Replace all hardcoded back buttons with `<BackLink>` component

### Phase 5 — Events / reports

- [ ] `/events` — period, event type filter, device filter
- [ ] Any other top-level report views

## Open Questions

None as of 2026-05-11. To be revisited after Phase 1 ships.

## Changelog

- **2026-05-11** — Plan approved by Rod. Pilot started on Applications page.
