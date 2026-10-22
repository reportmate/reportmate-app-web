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

  it("keeps an unstamped OS root out of the actionable list", () => {
    expect(certClassOf({ isOsTrustedRoot: true })).toBe("trust-store");
    expect(certClassOf({ class: "actionable", isOsTrustedRoot: true })).toBe(
      "actionable",
    );
  });
});

describe("names", () => {
  it("prefers displayName and issuerName", () => {
    expect(certDisplayName(SAMPLE_ACTIONABLE)).toBe("Sample User Certificate");
    expect(certIssuerName(SAMPLE_ACTIONABLE)).toBe("Sample Issuing CA");
  });

  it("falls back to commonName, the subject CN and issuer", () => {
    expect(certDisplayName(SAMPLE_UNSTAMPED)).toBe("SAMPLE-LEGACY");
    expect(
      certDisplayName({ subject: "CN=Sample Subject, O=Sample Org" }),
    ).toBe("Sample Subject");
    expect(certDisplayName({})).toBe("—");
    expect(certIssuerName({ issuer: "CN=Sample Issuer" })).toBe(
      "CN=Sample Issuer",
    );
  });

  it("labels classes", () => {
    expect(certClassLabel("system-managed")).toBe("System-managed");
    expect(certClassLabel("trust-store")).toBe("Trust store");
    expect(certClassLabel(undefined)).toBe("Actionable");
  });
});

describe("liveCertStatus", () => {
  it("computes status from notAfter, not the frozen fields", () => {
    expect(liveCertStatus(SAMPLE_ACTIONABLE, NOW)).toEqual({
      status: "ExpiringSoon",
      daysUntilExpiry: 10,
    });
    expect(liveCertStatus(SAMPLE_SYSTEM, NOW)).toEqual({
      status: "Expired",
      daysUntilExpiry: -5,
    });
    expect(liveCertStatus(SAMPLE_UNSTAMPED, NOW)).toEqual({
      status: "Valid",
      daysUntilExpiry: 400,
    });
  });

  it("prefers notAfterEpoch and accepts epoch strings", () => {
    const epoch = Math.floor((NOW + 45 * DAY) / 1000);
    expect(
      liveCertStatus({ notAfterEpoch: epoch, notAfter: iso(-1) }, NOW).status,
    ).toBe("Valid");
    expect(
      liveCertStatus({ notAfter: String(Math.floor((NOW - DAY) / 1000)) }, NOW)
        .status,
    ).toBe("Expired");
  });

  it("treats the 30th day as expiring soon and the 31st as valid", () => {
    expect(liveCertStatus({ notAfter: iso(30) }, NOW).status).toBe(
      "ExpiringSoon",
    );
    expect(liveCertStatus({ notAfter: iso(31) }, NOW).status).toBe("Valid");
  });

  it("falls back to stored fields without a usable notAfter", () => {
    expect(
      liveCertStatus({ status: "Expired", daysUntilExpiry: -3 }, NOW),
    ).toEqual({ status: "Expired", daysUntilExpiry: -3 });
    expect(
      liveCertStatus({ notAfter: "not a date", isExpiringSoon: true }, NOW)
        .status,
    ).toBe("ExpiringSoon");
    expect(liveCertStatus({}, NOW)).toEqual({
      status: "Valid",
      daysUntilExpiry: undefined,
    });
  });
});

describe("summarizeDeviceCertificates", () => {
  const certs = [
    SAMPLE_ACTIONABLE,
    SAMPLE_SYSTEM,
    SAMPLE_TRUST,
    SAMPLE_UNSTAMPED,
  ];

  it("shows actionable certificates by default and counts them live", () => {
    const s = summarizeDeviceCertificates(certs, false, NOW);
    expect(s.rows.map((r) => r.cert.commonName)).toEqual([
      "SAMPLE-USER-CERT",
      "SAMPLE-LEGACY",
    ]);
    expect(s.actionableCount).toBe(2);
    expect(s.hiddenCount).toBe(2);
    expect([s.validCount, s.expiringCount, s.expiredCount]).toEqual([1, 1, 0]);
  });

  it("shows every class when system-managed is on", () => {
    const s = summarizeDeviceCertificates(certs, true, NOW);
    expect(s.rows).toHaveLength(4);
    expect(s.actionableCount).toBe(2);
    expect([s.validCount, s.expiringCount, s.expiredCount]).toEqual([1, 1, 2]);
  });

  it("copes with missing or malformed lists", () => {
    expect(summarizeDeviceCertificates(undefined, false, NOW).rows).toEqual([]);
    expect(summarizeDeviceCertificates([null, "x"], false, NOW).rows).toEqual(
      [],
    );
  });
});

describe("device counts on the Security report", () => {
  const classAware = {
    expiredCertCount: 1,
    expiringSoonCertCount: 0,
    userExpiredCertCount: 1,
    osRootExpiredCertCount: 3,
    actionableCertCount: 4,
    systemManagedExpiredCertCount: 2,
  };

  it("uses actionable counts by default", () => {
    expect(deviceExpiredCertCount(classAware, false)).toBe(1);
    expect(
      deviceExpiredCertCount({ ...classAware, expiredCertCount: 0 }, false),
    ).toBe(0);
    expect(deviceCertLabel({ ...classAware, expiredCertCount: 0 }, false)).toBe(
      "Valid",
    );
  });

  it("adds system-managed and trust-store expirations when shown", () => {
    expect(deviceExpiredCertCount(classAware, true)).toBe(6);
    expect(deviceCertLabel({ ...classAware, expiredCertCount: 0 }, true)).toBe(
      "Has Expired",
    );
  });

  it("keeps the old meaning for payloads without class counts", () => {
    const legacy = {
      expiredCertCount: 5,
      expiringSoonCertCount: 1,
      userExpiredCertCount: 0,
      osRootExpiredCertCount: 5,
    };
    expect(deviceExpiredCertCount(legacy, false)).toBe(0);
    expect(deviceExpiredCertCount(legacy, true)).toBe(5);
    expect(deviceCertLabel(legacy, false)).toBe("Expiring Soon");
  });
});

describe("parseCertDeepLink", () => {
  const parse = (qs: string) => parseCertDeepLink(new URLSearchParams(qs));

  it("maps the dashboard card links", () => {
    expect(parse("certs=expiring").certFilter).toBe("Expiring Soon");
    expect(parse("certs=expired").certFilter).toBe("Has Expired");
    expect(parse("certSearch=Sample%20Cert&certStatus=expiring")).toEqual({
      certFilter: "",
      certSearch: "Sample Cert",
      certStatus: "expiring",
      showSystemManaged: false,
    });
  });

  it("reads certClass=all and ignores unknown values", () => {
    expect(parse("certClass=all").showSystemManaged).toBe(true);
    expect(parse("certClass=actionable").showSystemManaged).toBe(false);
    expect(parse("certs=bogus&certStatus=bogus")).toEqual({
      certFilter: "",
      certSearch: "",
      certStatus: "all",
      showSystemManaged: false,
    });
  });
});
