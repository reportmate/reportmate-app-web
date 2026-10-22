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
| /device/<serial>               | `tab=management&tool=<log root key>&level=error` (log viewer) |
| /devices                       | `status`, `search`, `platform`, `tool=<log root key>&level=error\|warning` (Management Tools Logs)                                                                                                                                                            |
| /system                        | `osVersion`, `uptime` (bucket key `lt1d,1-3d,3-7d,1-2w,2-4w,30d+`), `pending` (`up-to-date,1-5,6-10,10+`), `deferred=1`, `edition`, `os` (`unsupported`, `windows10`), `patch` (`behind`) |
| /security                      | `encryption=off`, `firewall=off`, `antivirus=off`, `sip=off`, `secureBoot=off`, `threats=1`, `certs=expired\|expiring`, `cve=critical\|exploited`                                         |
| /security (certificate search) | `certSearch=<text>`, `certStatus=expiring\|expired`                                                                                                                                       |
| /management                    | `provider`, `enrolled=0\|1`, `enrollmentType`, `platform=macOS\|Windows`, `lastSeen=24h\|1-7d\|7d+`                                                                                                                                             |
| /hardware                      | `arch` (`Apple Silicon,Intel,ARM64,x64`), `storage=low\|lt5\|5-10\|10-20\|20+`, `capacity=le256\|512\|1t\|2t+`, `platform=macOS\|Windows`, `memory=le8`, `type=laptop\|desktop`, `processor` (existing)                                                                     |
| /installs                      | `filter=errors\|warnings\|pending`, `agent=munki\|cimian`, `item=<name>`, `stale=1`, `view=messages` (existing)                                                                                                |
| /events/failures               | `hours`, `reason`, `outcome` (existing)                                                                                                                                                   |
| /identity                      | `admins=extra\|2\|3\|4+`, `join=entra\|domain\|hybrid\|workgroup`, `directory=cloud\|domain\|trusted\|unconfirmed\|broken\|standard\|unjoined` (Identity report Directory Services: Cloud Joined, Domain Joined with Trusted / Unconfirmed / Broken, Standard, Unjoined), `usage=shared\|assigned`, `platform=macOS\|Windows`                                                                                                         |
| /applications                  | existing `type=usage&apps=<name>&period=30`; `/applications/usage/<app>?days=30&usages=&catalogs=&platform=` for one app; `/applications?type=usage&period=&usages=&catalogs=&platform=` for the card header                                                                                              |
| /network                       | `connection=wired\|wifi`, `signal=weak`, `quality=poor`, `vpn=1`                                                                                                                                                   |
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

## Revision 3: Rod's review, 2026-10-22 (supersedes revisions 1 and 2 where they differ)

### Card changes
- **App Usage** (Rod's favourite, keep the name "App Usage"):
  - Show the **top 10 most-used** apps. Drop the least-used / "Unused Software" list entirely.
  - Add **Usage and Catalog filter chips** that work like Platform Distribution's. They filter the card in place, and each app link carries them.
  - Move it to the **wide events column, directly under Recent Events**.
  - Server: `/api/v1/dashboard/insights/app-usage?platform=&usages=&catalogs=&days=30`, small, cached per combination, top 10 plus the available usage and catalog values.
- **Directory Join** (was Identity / Local Admin Exposure): join-type donut, extra local admins, shared and assigned.
  - Three views in a segmented control, **All / Windows / Mac**, matching how `/management` presents platforms. Windows: Entra, Domain, Hybrid, Workgroup. Mac: its own directory states (Platform SSO / Entra, AD-bound, not bound), using the identity report's rules.
  - The server returns all three views in one card.
- **Storage** (replaces Hardware / Hardware at Risk; architecture is useless):
  - Free-space buckets: under 5%, 5–10%, 10–20%, 20%+.
  - Devices under 10% free, by platform.
  - Capacity mix (≤256 GB, 512 GB, 1 TB, 2 TB+).
  - Top 5 fullest devices.
  - Links go to `/hardware?storage=low|<bucket>` (add `storage=` bucket keys).
- **Management Tools Errors** (replaces Management / Unmanaged Devices): fleet-wide errors and warnings from the management tools' logs collected by the runners. The tools are Intune, BootstrapMate, Munki, Cimian, swiftDialog, csharpDialog, Presence, ReportMate, Outset and StartSet, i.e. the Managed suite buckets.
  - Per tool: devices with errors, devices with warnings, and error-line counts, all over the last 24 hours.
  - Top 5 error messages, normalised (numbers, paths and GUIDs stripped), with device counts.
  - Each tool links to `/devices?tool=<tool>&level=error`, or the closest existing filter. Each device opens the device page's Management tab, log viewer, filtered to that tool and to errors (`/device/<serial>?tab=management&tool=<tool>&level=error`).
  - Server: aggregate from the stored log tails (`log_tails.py`) with SQL. If the tails don't hold parsed levels, parse them server-side with the same line parsers the Mac app uses (convention, CMTrace, Intune daemon, Munki, syslog, ISO).
- **Install Health replaces the Errors and Warnings tiles** and sits **under Fleet Status in column 1**. The headline numbers (devices with errors, devices with warnings) are displayed MUCH BIGGER: hero-size figures, at least as large as Fleet Status's centre count, the most prominent numbers on the dashboard. Below them:
  - Devices with errors and with warnings, split Munki vs Cimian.
  - Error and warning item counts.
  - Top 5 failing items with device counts.
  - Agents silent over 7 days.
  - Pending installs.
  - Remove the two separate Error and Warning tiles from every app.

### App behaviour (all three apps)
- **No dashboard reset on return.** Going back to the Dashboard (or any page) must show the last data instantly and refresh in the background. Keep the page model and its data alive across navigation, show a subtle "updating" state rather than skeletons, and live-update when new data lands. Skeletons appear only on the very first load.
- **Skeletons need movement and progress.**
  - Add a clearly visible shimmer sweep, not just a faint pulse.
  - Add a progress indication: a thin determinate bar across the top of the page or card group showing sources loaded out of total ("Loading 2 of 3"), or an indeterminate sweep when the count is unknown.
- **Device page keeps the full nav.** On `/device/<serial>`, don't collapse the report tabs into a Reports dropdown. The full header stays, and the device's own tabs are on the page. Fix the header overlap glitch seen in the Mac app, where the search field, Dashboard and Devices overlap during the transition.

## Revision 4: Rod's review, 2026-10-22 afternoon (supersedes earlier revisions where they differ)

### Layout
- **Column 1:** Fleet Status, **Installs** (Install Health renamed), **Management Tools Logs**, then **Check-in Gaps** at the bottom.
- **Column 2:** **New Clients** at the top, the other insight cards, then **Reboot & Update Debt** at the bottom.
- The other insight columns and the events column stay as they are. App Usage stays under Recent Events.

### Rule: no per-card platform toggles
No widget has its own platform toggle. Every card follows the global `?platform=` toolbar toggle. Remove the All / Windows / Mac segmented control from Directory Join.

### Management Tools Logs (was Management Tools Errors)
- Rename it to **Management Tools Logs**.
- **Exclude the MDM agent's logs** (Intune here), but stay MDM-agnostic: drop any log root the runner tags as the MDM or enrollment agent, or the tool matching the device's MDM provider from the management module (Intune, Jamf, Kandji, Mosyle, Workspace ONE, MicroMDM, NanoMDM and others). Never hardcode "Intune".
- **Fix message normalisation.** Strip the leading timestamp, offset and level prefix before grouping, so `<ts> -<n>:<n> [ERR] Device registration failed for <guid>` becomes `Device registration failed for <guid>`.
- **Fix duplicates.** The top list showed the same message 5 times. Group by tool and normalised message, then sum devices and lines.

### Directory Join → use the Identity report's classification, exactly
The card must use the **same dataset, rules and nomenclature as the Identity report's Directory Services widget**:
- **Cloud Joined**
- **Domain Joined**, broken down into **Trusted**, **Unconfirmed** and **Broken**
- **Standard**
- **Unjoined**

Rename the card **Directory Services**. Port the rules from the web identity page's classification (`app/identity/page.tsx` and its widget) verbatim, server-side. Every segment links to `/identity?directory=<same key the identity report uses>`. Keep the extra-local-admins, shared and assigned chips. Follow the global platform toggle; no views.

### App Usage grid
Each row is a fixed-column grid: name (flexible, truncated) | bar (fixed width) | hours (right-aligned, fixed width, thousands separators, e.g. `328,025 h`) | devices (right-aligned, fixed width, e.g. `170 devices`). All columns line up across rows.

### Expiring Certificates: OS certificates are out of scope
OS-level certificates nobody controls are being counted. That's a separate body of work; leave the card as it is in this sprint.

## Revision 5: Rod's order, 2026-10-22 (supersedes earlier layout)

Wide layout (four columns):
- **Column 1:** Fleet Status, Installs, Management Tools Logs, Check-in Gaps (unchanged).
- **Column 2:** New Clients (stays on top), Directory Services, Connectivity Problems, Protection Gaps, Expiring Certificates.
- **Column 3:** Update Debt, Storage, App Usage, Software Risk, Reboot Debt (last).
- **Column 4 (events):** Recent Events, Platform Distribution, OS versions. App Usage leaves this column.

The desktop (three-column) and narrower tiers keep the same card order, flowed into fewer columns.

Card changes:
- **OS Currency → Update Debt.** It takes over the "with pending updates" and "with deferred updates" counts and links (`/system?pending=…`, `/system?deferred=1`). Server key `updateDebt`; keep `osCurrency` as an alias for one release.
- **Reboot & Update Debt → Reboot Debt.** Uptime only: the 30+ days and 2–4 weeks hero figures plus the uptime buckets. The pending and deferred chips move to Update Debt. Server key `rebootDebt` stays.

## Revision 6: Rod, 2026-10-22 afternoon

### Rename
- **Reboot Debt → "Uptime Overview"**, same content (uptime only). Server key `rebootDebt` stays.

### New card: User Accounts (column 2, directly under Directory Services)
Account-focused, built from the Identity report's own data and rules (its Authentication donut and Administrator Accounts widget):
- **Authentication** donut, Modern vs Standard, using the identity report's rule. Each segment links to `/identity?auth=modern|standard`, the identity report's own param.
- **Administrator accounts**: the top 5 admin account names by device count (`admin`, `macadmins`, `winadmins`, `Intune`, …). Each links to `/identity?admin=<name>`.
- **Devices with extra local admins** (more than the expected managed admin accounts, using the identity report's rule), linking to `/identity?admins=extra`.
- The **extra local admins** chip moves here from Directory Services. Directory Services keeps shared and assigned.
- Server key: `userAccounts`. It follows the global platform toggle.

### Fleet Management Tools report (new, all apps)
Today `/management` is the MDM enrollment report only. Nothing shows the management tools' logs across the fleet. Build it:
- Route `/management/logs`, linked from the `/management` page header as a second view: "Enrollment | Tools Logs".
- Per tool: devices with errors and with warnings, lines, last seen, and trend over the window (24h / 7d selector). Excludes the MDM agent (same rule as the card).
- Common messages: normalised, with tool, devices, lines and last seen. Clicking one lists the devices that logged it.
- Devices table: device, tool, errors, warnings, last at. Each row opens `/device/<serial>?tab=management&tool=<tool>&level=error`.
- Filters (URL params): `tool`, `level=error|warning`, `hours=24|168`, `message=<normalised id>`, `platform`. Rows are sortable, with CSV export like the other reports.
- The Management Tools Logs card's links (tool rows, messages, header) point here, not to `/devices?tool=`.
- Server: extend the existing level-summary SQL. Use a fleet endpoint such as `/api/v1/management/logs/fleet?hours=&tool=&level=&message=&platform=`, plus the devices-by-tool and devices-by-message lists. Cache it like the cards.

### Deep links: full audit
Every clickable or countable thing on the dashboard in all three apps must deep-link to its filtered destination:
- every insight card item and header
- Fleet Status legend rows and the centre count
- the Installs per-agent rows
- New Clients rows, to the device
- Recent Events rows (to the device or event) and their filter
- Platform Distribution rows and chips
- OS version bars

Fix every dead or unfiltered link, and every target page that ignores its params. Each app reports its audit table: item → link → verified.
- **Management Tools Logs icon:** replace the red warning triangle with the Management report's own icon, the shield, in the Management yellow. Use exactly the glyph and colour the nav and the /management report use in each app. The /management/logs report uses it too.

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
- Every page's skeleton is wrapped in `SkeletonTimeout` (`src/components/ui/SkeletonTimeout.tsx`).
  After 10 seconds it becomes "Still loading… · Retry", and an error that came back shows at once.
  This covers the dashboard, devices, device detail, events, failures, installs, system,
  hardware, security, management, identity, network and peripherals.
- Revision 3 on web (API #158 merged):
  - Per-card loading is the default: the 11 card keys from the API, each from
    `/api/v1/dashboard/insights/{card}`, unwrapped from the `{card, platform, includeArchived,
    generatedAt, data}` envelope. App Usage reads `/api/v1/dashboard/insights/appUsage`, cached per
    usage and catalog combination.
  - Cards:
    - Install Health (column 1) shows the Munki/Cimian split, item counts, pending and silent agents.
    - Storage replaces Hardware.
    - Management Tools Errors replaces Unmanaged Devices.
    - Directory Join has an All / Windows / Mac control. The toolbar's platform toggle picks
      the view when it is set.
    - App Usage (events column) shows the top 10 with Usage and Catalog chips.
  - Fixtures in `src/lib/dashboard/__fixtures__/` are generated from the API's own shape
    functions with SAMPLE data.
- Revision 4 on web:
  - Column 1 holds Fleet Status, Installs, Management Tools Logs and Check-in Gaps. Column 2
    holds New Clients, the insight cards, then Reboot & Update Debt.
  - Directory Services has no view control; it follows the global toggle.
  - App Usage rows are a fixed grid: name | 10rem bar | hours (`1,200 h`) | devices.
  - Card keys `managementToolLogs` and `directoryServices` are requested first. When the new
    name is a 404, the client asks for `managementToolErrors` / `directoryJoin` instead. It also
    reads the old names from a combined document, taking an old `directoryJoin {views}` view for
    the global platform.
  - Directory Services segments are read with an optional `children` (or `breakdown` / `trust`)
    list under Domain Joined.
  - `/identity?directory=` takes `cloud`, `domain`, `trusted`, `unconfirmed`, `broken`,
    `standard` and `unjoined` (the Identity report's Directory Services classes; the labels
    are accepted too), plus the earlier `psso`, `bound` and `unbound`.
  - As a client-side safeguard, Management Tools Logs drops the `mdm` log root, strips
    timestamp, offset and level prefixes from messages, and merges duplicates by tool and
    message. The server-side fixes are still needed.
- Revision 5 on web:
  - Column 2 holds New Clients, Directory Services, Connectivity Problems, Protection Gaps
    and Expiring Certificates.
  - Column 3 holds Update Debt, Storage, App Usage, Software Risk and Reboot Debt.
  - The events column holds Recent Events, Platform Distribution and OS versions.
  - Desktop keeps column 2 beside the events column and puts column 3's cards four across
    below, with App Usage two cells wide. Laptop flows the same order into two columns.
  - Update Debt is requested as `updateDebt` and falls back to `osCurrency`. If its section
    has no `pendingUpdates` or `deferredUpdates` yet, it takes them from Reboot Debt.
  - Reboot Debt shows uptime only.

- App Usage in column 3 (supersedes the revision 4 row format):
  - Columns: name | 60px bar | compact hours (`328k h`, `1.2k h`) | device count, under one
    header row (App · Hours · Devices).
  - A truncated name shows in full as a tooltip, and the exact hours show on hover.
- New Clients sizes to its rows, up to 600px. No card in columns 1–3 has a fixed height; only
  Recent Events keeps one, for its scrolling feed.
- Card numbers go through `src/lib/dashboard/format.ts`. NaN, Infinity, negative values and
  non-numbers render as "—"; bars draw at 0.
- Revision 6 on web:
  - Uptime Overview (key `rebootDebt`).
  - User Accounts (key `userAccounts`) sits under Directory Services. The API card hasn't
    shipped, so the client reads an assumed shape: `{total|devices, authentication[] (or
    auth / auth.segments) {key, label, count, link?}, admins[] (or adminAccounts / topAdmins)
    {name, devices, link?}, extraAdmins}`. Missing links are built as `/identity?auth=<key>`
    and `/identity?admin=<name>`.
  - Any card answering 404 says "Not available on this server yet."
  - `/identity` reads `auth=modern|legacy|standard` and `admin=<account>`.
  - Management Tools Logs uses the Management shield in yellow. Its header, tool rows and
    messages link to `/management/logs?tool=&level=[&platform=][&message=<normalised text>]`.

- Layout as column stacks: at every width the dashboard is independent stacks, never a grid
  row under the columns.
  - Wide: column 1 | column 2 | column 3 | events.
  - Desktop: column 1 + Uptime Overview | column 2 + App Usage | events + Update Debt,
    Storage, Software Risk.
  - Laptop (2fr / 3fr):
    - Left stack: column 1, then Update Debt, Storage, Software Risk, Uptime Overview.
    - Right stack: events, App Usage, then column 2.
  - Below the lg breakpoint the two laptop stacks follow one another.
  - Balanced by card heights measured against production on 2026-10-22: at 1280 the stacks
    are 4,132 / 4,164 px, and at 1728 they are 2,804 / 2,922 / 2,913 px.
- Zero-count segments and rows are hidden in card breakdowns. This covers Directory Services
  segments and trust rows, User Accounts authentication and admin accounts, rejection
  reasons, top failing items, lagging versions, items behind, and low storage by platform.
  Fixed buckets where a zero is information stay: uptime, storage free space and capacity,
  and protection gaps.
