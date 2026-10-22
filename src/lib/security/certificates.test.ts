import {
  certClassLabel,
  certClassOf,
  certDisplayName,
  certIssuerName,
  deviceCertLabel,
  deviceExpiredCertCount,
  liveCertStatus,
  parseCertDeepLink,
  summarizeDeviceCertificates,
} from "./certificates";

const NOW = Date.parse("2026-06-01T00:00:00Z");
const DAY = 86_400_000;
const iso = (offsetDays: number) =>
  new Date(NOW + offsetDays * DAY).toISOString();

const SAMPLE_ACTIONABLE = {
  class: "actionable",
  commonName: "SAMPLE-USER-CERT",
  displayName: "Sample User Certificate",
  issuer: "CN=Sample Issuing CA, O=Sample Org",
  issuerName: "Sample Issuing CA",
  notAfter: iso(10),
  // Frozen at collection: says valid, but it is now inside the 30-day window
  status: "Valid",
  daysUntilExpiry: 120,
  isExpired: false,
  isExpiringSoon: false,
};
const SAMPLE_SYSTEM = {
  class: "system-managed",
  commonName: "00000000-0000-0000-0000-000000000000",
  displayName: "Sample Device Identity",
  issuerName: "Sample Device CA",
  notAfter: iso(-5),
};
const SAMPLE_TRUST = {
  class: "trust-store",
  commonName: "Sample Root CA",
  notAfter: iso(-400),
};
const SAMPLE_UNSTAMPED = {
  commonName: "SAMPLE-LEGACY",
  notAfter: iso(400),
};

describe("certClassOf", () => {
  it("reads the stamped class", () => {
    expect(certClassOf(SAMPLE_ACTIONABLE)).toBe("actionable");
    expect(certClassOf(SAMPLE_SYSTEM)).toBe("system-managed");
    expect(certClassOf(SAMPLE_TRUST)).toBe("trust-store");
  });

  it("treats a missing or unknown class as actionable", () => {
    expect(certClassOf(SAMPLE_UNSTAMPED)).toBe("actionable");
    expect(certClassOf({ class: "something-new" })).toBe("actionable");
    expect(certClassOf(null)).toBe("actionable");
  });

  it("leaves the class to the API, never the device's own root flag", () => {
    expect(certClassOf({ isOsTrustedRoot: true })).toBe("actionable");
    expect(certClassOf({ class: "trust-store", isOsTrustedRoot: false })).toBe(
      "trust-store",
    );
  });
});
