import {
  kindForTab, listParam, optionsForPlatform, profilesApiQuery, profilesCsv, profilesUrlQuery, readProfilesView, sortProfileRows,
  type ProfileRow,
} from "./profiles"

const row = (overrides: Partial<ProfileRow>): ProfileRow => ({
  serialNumber: "TESTSERIAL01", deviceName: "Device A", platform: "macOS", assetTag: null, usage: null, catalog: null,
  area: null, fleet: null, location: null, room: null, archived: false, inventoryState: null, lastSeen: null,
  collectedAt: null, freshness: "unknown", inventoryCount: 0, state: "unknown", identifier: "com.example.wifi",
  name: "Wifi", scope: null, ...overrides,
})

it("maps tabs to kinds and keeps the API query free of view-only controls", () => {
  expect(kindForTab("preferences")).toBe("preference")
  expect(kindForTab("profiles")).toBe("profile")
  const params = new URLSearchParams({ tab: "profiles", identifiers: '["a"]', preferenceKey: "Key", sort: "state", states: "missing" })
  expect(profilesApiQuery(params, "profile", "macOS")).toBe("kind=profile&identifiers=%5B%22a%22%5D&states=missing&platform=macOS")
  expect(profilesApiQuery(params, "preference", "all")).toContain("preferenceKey=Key")
  expect(profilesUrlQuery("platform=mac&tab=logs", "preference", { identifiers: '["d"]', states: "" })).toBe("platform=mac&tab=preferences&identifiers=%5B%22d%22%5D")
})

it("reads exact selections only from a JSON array, capped at the API limit", () => {
  expect(listParam(new URLSearchParams({ identifiers: '["a, b", "c"]' }), "identifiers")).toEqual(["a, b", "c"])
  expect(listParam(new URLSearchParams({ identifiers: "a,b" }), "identifiers")).toEqual([])
  expect(listParam(new URLSearchParams({ identifiers: "[bad" }), "identifiers")).toEqual([])
  const many = JSON.stringify(Array.from({ length: 60 }, (_, i) => `p${i}`))
  expect(listParam(new URLSearchParams({ identifiers: many }), "identifiers")).toHaveLength(50)
})

it("offers selections observed on the chosen platform", () => {
  const options = [{ identifier: "m", name: "M", devices: 1, platforms: ["macOS"] }, { identifier: "w", name: "W", devices: 1, platforms: ["Windows"] }]
  expect(optionsForPlatform(options, "Windows").map(o => o.identifier)).toEqual(["w"])
  expect(optionsForPlatform(options, "all")).toHaveLength(2)
})

it("sorts with unknown values last in either direction", () => {
  const rows = [row({ serialNumber: "S1", version: null }), row({ serialNumber: "S2", version: "10" }), row({ serialNumber: "S3", version: "2" })]
  expect(sortProfileRows(rows, { sort: "version", direction: "asc" }).map(r => r.serialNumber)).toEqual(["S3", "S2", "S1"])
  expect(sortProfileRows(rows, { sort: "version", direction: "desc" }).map(r => r.serialNumber)).toEqual(["S2", "S3", "S1"])
  expect(readProfilesView(new URLSearchParams("sort=bogus&direction=up"))).toEqual({ sort: "deviceName", direction: "asc" })
})

it("exports exactly the given rows with formula-safe cells", () => {
  const csv = profilesCsv([row({ deviceName: "=cmd", state: "missing", freshness: "fresh" })], "profile", "2026-01-01T00:00:00Z", "https://example.com/management?tab=profiles")
  const lines = csv.split("\r\n")
  expect(lines).toHaveLength(2)
  expect(lines[1]).toContain(`"'=cmd"`)
  expect(lines[1]).toContain(`"Not installed"`)
})
