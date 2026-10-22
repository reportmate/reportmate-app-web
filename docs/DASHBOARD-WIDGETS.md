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

## Changes found while building the web app (2026-10-22)

These amend the sections above. Swift and C# should follow them.

- **Shared rules.** Web keeps every rule a card counts with and a report filters with in
  `src/lib/dashboard/reportRules.ts`. Port that file rather than re-deriving the rules.
- **`/devices?platform=`** is the global platform toggle (`mac` or `win`), not a devices-page
  filter. The devices page also takes `usage`, `catalog`, `area`, `location` and `fleet`.
- **Platform Distribution.** Clicking a platform still expands it in place. Its count opens
  `/devices?platform=mac|win`. Drill-down bars open `/devices?platform=…&usage=…` (and the same
  for `catalog`, and `area` for department). Architecture opens `/hardware?arch=<family>`.
- **System Health.** The pending chip opens `/system?pending=1-5,6-10,10+`.
- **Management.** The donut's Enrolled row opens `?enrolled=1` and Not Enrolled opens
  `?enrolled=0`. The provider list adds an `Unmanaged` row (→ `?provider=Unmanaged`).
- **5 Install Health.** `/api/v1/installs` is about 94 MB, so the top failing items come from
  `/api/v1/installs/filters` instead (17 MB, the payload the installs report itself reads).
  Each device's `modules.installs.{cimian,munki}.items[]` is classified with the installs
  report's `isErrorItem`. Those devices carry no `platform`: Cimian means Windows, Munki
  means macOS. `staleAgentThresholdDays` is 1 in the payload, so the card applies its own
  7-day threshold (`staleDays > 7`), and so does `/installs?stale=1`.
- **6 Check-in Gaps.** The web routes are `/api/dashboard` and `/api/events/failures`. The
  failure summary has no platform, so the 24-hour numbers stay fleet-wide and are labelled
  "All platforms" when the platform toggle is set. The silent-device counts do follow the toggle.
  Rejected opens `/events/failures?hours=24` (rejected is that page's default). Retried and
  Repaired (`accepted`) add `outcome=`.
- **7 OS Currency.** macOS releases are ordered by release, not by number: 15 is followed by
  26. With 27 the newest, 15 is still supported and 14 isn't. Windows patch level is
  `featureUpdate` (the update revision, e.g. 9711) within one `buildNumber`. The 5-device
  minimum applies to Windows builds the same way. "On latest patch" opens `/system`
  unfiltered, because there's no parameter for it.
- **8 Software Risk.** The live fleet reports `criticalCveCount` and
  `activelyExploitedCveCount` as 0 everywhere. Few install items carry both
  `installedVersion` and `latestVersion`, so the "behind" list is usually empty, and the card
  says so.
- **9 Certificates.** In certificate rows, `serialNumber` is the device's serial and
  `certSerialNumber` is the certificate's. Devices are counted by `serialNumber`.
- **10 Identity.** The identity report's directory donut, which reads the route's
  `enrollmentType`, counts hybrid devices as "Domain Joined". The card and `?join=` use the
  four-way `joinType` (from `entraJoined` and `domainJoined`), so `hybrid` is its own slice.
- **11 App Usage.** The usage report covers the whole fleet, so the card is labelled "All
  platforms" when the platform toggle is set. Least-used ranks by `activeDeviceCount / installedDeviceCount`.
- **12 Network & Peripherals.** Network rows have no `platform`, so it comes from
  `operatingSystem`. Rooms are ranked by printer count. `/network` also accepts
  `signal=excellent|good|fair`.
- **Degrading.** A card that reads two sources shows whichever one loaded and says which
  one didn't. A card shows its error only when every source it reads has failed.
