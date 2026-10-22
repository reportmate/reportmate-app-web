# Dashboard widgets: shared spec (web, Swift, C#)

This spec is shared by all three apps. Each app builds the same cards with the
same numbers and the same click targets. Web routes are the contract: Swift and
C# open the equivalent native view with the same filter, and their deep-link
parsers (`DeepLink.swift`, `DeepLink.cs`) accept the same query parameters.

## Layout

| Width (web px / native content pt) | Layout                                                                                                                      |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| < 1024 (`lg`)                      | one column; insight cards in a 1–2 column grid at the bottom                                                                |
| 1024–1679                          | today's 30/70 two columns; insight cards in a 2-column grid below                                                           |
| 1680–2199 (`desktop`)              | three columns 1fr / 1fr / 2fr: [Fleet Status, counters, New Clients] [insight cards] [Recent Events, Platform, OS versions] |
| ≥ 2200 (`wide`, 27" class)         | four columns 1fr / 1fr / 1fr / 2fr: [col 1] [insights A] [insights B] [events col]                                          |

Native breakpoints: desktop ≈ 1500 pt and wide ≈ 2000 pt of content width.
Insight columns have the same width as column 1. Cards size to their content and
never stretch to equal heights.

There are 12 insight cards, kept in this order in one list:
1 System Health, 2 Security Posture, 3 Management, 4 Hardware (existing),
5 Install Health, 6 Check-in Gaps, 7 OS Currency, 8 Software Risk,
9 Certificates, 10 Identity, 11 App Usage, 12 Network & Peripherals.

- wide: cards are dealt alternately into insights A and B (1,3,5,… in A; 2,4,6,… in B), so both columns grow evenly.
- desktop: the insight column holds cards 1–4, and cards 5–12 go in a 4-across grid under the three columns.
- below desktop: all 12 cards sit in the 2-column grid under the main layout.

The four existing cards stay as they are. Rod will pick which cards stay after he's seen them.

## Loading

Every card reads from an endpoint its report page already uses. Report fetches are
shared, so a single `/security` fetch feeds both Security Posture and Certificates.
Fetch two at a time with one retry on 5xx or transport errors, and refresh every
five minutes. Each card has its own loading, error and empty states, and the
platform toggle filters every card.

## Deep links: rule for every card, existing and new

Every number, bar, legend row, chip and list item navigates to the report that owns
it, with that filter active. Clicking "Unmanaged" in Management opens
`/management?provider=Unmanaged`, already filtered. The card header goes to the
unfiltered report. Where a report page doesn't read the parameter yet, **add
parameter support to that report**: read it on load, apply it as the matching
widget or Selections filter, and keep it in the URL as the filter changes. Use
these names on every platform:

| Report                         | Parameters (comma-separated multi-values)                                                                                                                                                 |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| /devices                       | `status`, `search`, `platform`                                                                                                                                                            |
| /system                        | `osVersion`, `uptime` (bucket key `lt1d,1-3d,3-7d,1-2w,2-4w,30d+`), `pending` (`up-to-date,1-5,6-10,10+`), `deferred=1`, `edition`, `os` (`unsupported`, `windows10`), `patch` (`behind`) |
| /security                      | `encryption=off`, `firewall=off`, `antivirus=off`, `sip=off`, `secureBoot=off`, `threats=1`, `certs=expired\|expiring`, `cve=critical\|exploited`                                         |
| /security (certificate search) | `certSearch=<text>`, `certStatus=expiring\|expired`                                                                                                                                       |
| /management                    | `provider`, `enrolled=0\|1`, `enrollmentType`                                                                                                                                             |
| /hardware                      | `arch` (`Apple Silicon,Intel,ARM64,x64`), `storage=low`, `memory=le8`, `type=laptop\|desktop`, `processor` (existing)                                                                     |
| /installs                      | `filter=errors\|warnings` (existing), `item=<name>`, `stale=1`, `view=messages` (existing)                                                                                                |
| /events/failures               | `hours`, `reason`, `outcome` (existing)                                                                                                                                                   |
| /identity                      | `admins=extra`, `join=entra\|domain\|hybrid\|workgroup`, `usage=shared\|assigned`                                                                                                         |
| /applications                  | existing `type=usage&apps=<name>&period=30`; `/applications/usage/<app>?days=30` for one app                                                                                              |
| /network                       | `connection=wired\|wifi`, `signal=weak`                                                                                                                                                   |
| /peripherals                   | `kind=printers\|displays`, `room=<room>`                                                                                                                                                  |

## New cards

**5 Install Health** (`/installs`, Munki + Cimian). Data: `/api/v1/dashboard`
`installStats` (devices with errors and warnings) and `/api/v1/installs/filters`
(`staleAgents`, `staleAgentThresholdDays`). Top failing items come from
`/api/v1/installs` rows where `currentStatus` is an error, grouped by `itemName`.
That payload is large (130k rows) and sometimes answers 502, so load it last,
treat it as optional, and if it fails, show the counts without the top-5 list.
Shows devices with errors and devices with warnings (chips →
`/installs?filter=errors` and `?filter=warnings`), the top 5 failing items as bars
(→ `/installs?item=<name>&filter=errors`), and agents silent more than 7 days
(→ `/installs?stale=1`).

**6 Check-in Gaps** (`/events/failures`, `/devices`). Data:
`/api/v1/events/failures?hours=24` (`summary[]`: reason, count, devices; `counts`:
rejected, retried, accepted) and device `lastSeen` from the dashboard payload.
Shows rejected / retried / accepted in 24h, reasons as bars
(→ `/events/failures?hours=24&reason=<r>`), and devices silent 1–7 days
(→ `/devices?status=stale`) and over 7 days (→ `/devices?status=missing`), using
the existing status thresholds.

**7 OS Currency** (`/system`). Data: the device list (OS name and version) or
`/system` rows. For each major macOS version, the "latest patch" is the highest version reported by at least 5 devices (so one beta Mac does not make the whole fleet "behind"); a device below it is "behind". macOS more than two majors behind the newest major reported by at least 5 devices is "unsupported" (if no version reaches 5 devices, the highest seen counts), and Windows 10 is counted on its
own. Shows: % on latest patch (donut), behind (→ `/system?patch=behind`),
unsupported macOS (→ `/system?os=unsupported`), Windows 10 (→ `/system?os=windows10`),
and the top 3 lagging versions (→ `/system?osVersion=<v>`).

**8 Software Risk** (`/security`, `/installs`). The API has CVE counts per device,
not per app, so this card shows devices with critical CVEs
(→ `/security?cve=critical`), devices with actively exploited CVEs
(→ `/security?cve=exploited`), and the 5 managed items with the most devices
behind (`installedVersion` ≠ `latestVersion` in install rows, optional like card
5; → `/installs?item=<name>`). Header goes to `/security`.

**9 Certificates** (`/security`). Data: `/api/v1/security/certificates?status=expiring`
(rows with `commonName`, `daysUntilExpiry`, `serialNumber`) and the per-device
`expiredCertCount` / `expiringSoonCertCount` from `/security`. Shows: expiring
within 30 days, as a count of certificates and of devices; expired user
certificates by device (→ `/security?certs=expired`); and the top 5 common names
expiring soonest (→ `/security?certSearch=<cn>&certStatus=expiring`).

**10 Identity** (`/identity`). Data: `/api/v1/identity` rows. "Extra local admins"
means `summary.adminUsers > 1`. Join type comes from `directoryServices`:
Entra (`azureAd`), domain (`activeDirectory`), hybrid (both), otherwise workgroup.
Use the same rule the identity report's directory donut uses. Shows a join-type
donut (→ `/identity?join=…`), devices with extra admins
(→ `/identity?admins=extra`), and shared vs assigned (row `usage`;
→ `/identity?usage=shared|assigned`).

**11 App Usage** (`/applications`). Data: `/api/v1/applications/usage?days=30`
(`applications[]` with `totalHours`, `deviceCount`, `installedDeviceCount`).
Shows the 5 most-used apps by `totalHours` and the 5 least-used of the apps
installed on 10 or more devices (lowest `activeDeviceCount / installedDeviceCount`).
Each app → `/applications/usage/<app>?days=30`.

**12 Network & Peripherals** (`/network`, `/peripherals`). Data: `/api/v1/network`
(`raw.activeConnection.connectionType`, `raw.networkQuality.rating`, Wi-Fi signal
from `raw.wifiNetworks` / interfaces) and `/api/v1/peripherals` (`printers[]`,
displays). Shows wired vs Wi-Fi (→ `/network?connection=…`), weak signal
(→ `/network?signal=weak`, using the threshold the network report already uses),
and printers and displays counted fleet-wide, with the top 3 rooms
(→ `/peripherals?kind=printers&room=<room>`).

## Not committed

No real device names or serials in fixtures, docs or screenshots in commits. Use
`SAMPLE1`-style values.

## Revision 2: targeted cards and one cached endpoint (supersedes the above where they differ)

Rod: cards named after a module (Identity, Management, Hardware…) don't belong on the
dashboard. Every card answers one targeted question, like Install Health or OS
Currency do. Cards are renamed and refocused on the problem, not the module:

| # | Old | New title | What it shows (all items deep-link as before) |
|---|---|---|---|
| 1 | System Health | Reboot & Update Debt | up 30+ days, up 2–4 weeks, pending updates, deferred updates |
| 2 | Security Posture | Protection Gaps | devices WITHOUT encryption / firewall / AV / SIP / Secure Boot (counts of gaps, worst first), with threats, critical CVEs |
| 3 | Management | Unmanaged Devices | not enrolled in MDM (count + %), by platform, last seen; enrolled % as context only |
| 4 | Hardware | Hardware at Risk | under 10% storage free, 8 GB RAM or less, Intel Macs (next-macOS risk) |
| 5 | Install Health | Install Health | unchanged |
| 6 | Check-in Gaps | Check-in Gaps | unchanged |
| 7 | OS Currency | OS Currency | unchanged |
| 8 | Software Risk | Software Risk | unchanged |
| 9 | Certificates | Expiring Certificates | expiring in 30 days, expired user certs, soonest 5 |
| 10 | Identity | Local Admin Exposure | devices with extra local admins (top counts), devices not Entra/domain joined (workgroup) |
| 11 | App Usage | Unused Software | least-used apps installed on 10+ devices (shelfware); most-used 5 as a secondary list |
| 12 | Network & Peripherals | Connectivity Problems | weak Wi-Fi signal, poor network-quality rating, devices on VPN; no peripheral counts |

### Data: one cached endpoint

The bulk reports are too heavy to fetch from every client. On 2026-10-22, test
clients doing that pinned the API container at its 4 GiB memory limit and it
restarted repeatedly. All three apps read one endpoint instead:

`GET /api/v1/dashboard/insights?platform=all|macOS|Windows` returns one JSON
document with a section per card. Each section holds only the numbers and short
top-N lists the card shows (no device rows), plus the link params for each item.
The server computes it with SQL aggregation (no loading every row into Python),
caches it per platform for 5 minutes in process, and returns `generatedAt`.
Clients poll it every 5 minutes and render skeletons until the first answer. A
section that failed server-side comes back as `{"error": "..."}` and the card
shows its error state; the rest render.

## Web notes (2026-10-22)

- The web app reads the endpoint through `app/api/v1/dashboard/insights/route.ts` and renders
  each item's `link` as-is (`src/lib/dashboard/insights.ts`, `linkHref`). Commas in params
  stay literal.
- The API currently links Connectivity Problems' poor quality and VPN items to `/network`
  unfiltered. Web fills them in as `/network?quality=poor` and `/network?vpn=1`, which the
  network report now reads. `quality=poor` uses the same rule as the API: `rating` is Low, or,
  when there's no overall rating, `dlRating` or `ulRating` is Low. Once the API sends those
  params, the web fallback goes unused.
- `/devices?platform=` is the global platform toggle (`mac` or `win`). The devices page also
  takes `usage`, `catalog`, `area`, `location` and `fleet`. Platform Distribution's count and
  drill-down bars link there; architecture opens `/hardware?arch=<family>`.
- Report-side rules shared with the API's SQL live in `src/lib/dashboard/reportRules.ts`.

- `/management` also reads `lastSeen=24h|1-7d|7d+`: under 24 hours, 24 hours to 7 days, or
  over 7 days (or never seen) since `lastSeen`. These are the Unmanaged Devices buckets.
- `platform=macOS|Windows` works on any page, `/management` included. The global toggle takes it
  as an alias for `mac|win` and rewrites the URL to the short form.
- `/identity?admins=` takes `extra` (more than one admin), or an exact admin-user count: `2`,
  `3`, or `4+` for four or more.
- Revision 3 behaviour on web:
  - `src/lib/data-cache.ts` keeps the last answer for each request for the life of the tab, so
    the dashboard and the reports render it instantly on return and refresh in the background.
  - `trackedFetch` drives the thin bar under the toolbar. A first load shows "Loading n of N";
    a refresh of data already on screen shows a faint sweep.
  - Skeleton blocks get a shimmer sweep on top of `animate-pulse`.
  - A refresh that fails with data on screen keeps the data and shows `RefreshErrorBanner`
    ("Couldn't refresh · Retry · Last updated …").
  - The web device page already uses the same toolbar as every other page, so it needed no change.
- Skeleton limit (10 seconds):
  - A card skeleton turns into "Still loading… · Retry" after 10 seconds.
  - Every page's first load does the same in the bar under the toolbar.
  - An error that comes back, including a 404 from an endpoint that isn't deployed, shows at
    once with Retry. The Next proxies pass the API's status and reason through.
- Per-card loading is ready behind `NEXT_PUBLIC_INSIGHTS_PER_CARD=true`:
  - It calls `GET /api/v1/dashboard/insights/{card}` for every card in parallel, through
    `app/api/v1/dashboard/insights/[card]/route.ts`, and paints each card as it lands.
  - It accepts the section bare or wrapped as `{card}`, `{data}` or `{cards: {key}}`.
  - The card keys in `INSIGHT_CARD_KEYS` are placeholders until the API's final keys land.
