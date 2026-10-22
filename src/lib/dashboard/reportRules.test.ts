import {
  installAgent,
  installAgentFromParam,
  internalStorage,
  isLowStorageBucket,
  levelSummaryCounts,
  macDirectory,
  rootHasLevelInWindow,
  sqlTrue,
  storageCapacityBucket,
  storageFreeBucket,
  toolLevelFromParam,
  toolProductLabel,
  toolRootFromParam,
  toolWindowStartHour,
} from "./reportRules";

const GB = 1e9;
const drive = (capacity: number, freeSpace: number, extra: Record<string, any> = {}) => ({
  capacity,
  freeSpace,
  ...extra,
});
const withFree = (ratio: number, total = 1000 * GB) => ({
  storage: [drive(total, total * ratio)],
});
const withTotal = (total: number) => ({ storage: [drive(total, total / 2)] });

describe("internalStorage", () => {
  it("sums internal drives, capacity before size and freeSpace before free_space", () => {
    expect(
      internalStorage({
        storage: [
          { capacity: 500, size: 999, freeSpace: 100, free_space: 999 },
          { capacity: 0, size: 300, freeSpace: 0, free_space: 50 },
          { size: 200, free_space: 20 },
        ],
      }),
    ).toEqual({ total: 1000, free: 170 });
  });

  it("skips drives whose isInternal is a false word, in any case or type", () => {
    const external = (v: any) => drive(1000, 1000, { isInternal: v });
    const r = {
      storage: [
        drive(100, 10),
        external(false),
        external("FALSE"),
        external("no"),
        external("0"),
        external(0),
        external("f"),
        external("off"),
        drive(100, 10, { isInternal: true }),
        drive(100, 10, { isInternal: "maybe" }),
      ],
    };
    expect(internalStorage(r)).toEqual({ total: 300, free: 30 });
  });

  it("reads drives when storage is empty or missing", () => {
    expect(internalStorage({ storage: [], drives: [drive(10, 1)] })).toEqual({ total: 10, free: 1 });
    expect(internalStorage({ drives: [drive(10, 1)] })).toEqual({ total: 10, free: 1 });
    expect(internalStorage({ storage: [drive(10, 1)], drives: [drive(99, 9)] })).toEqual({ total: 10, free: 1 });
  });

  it("counts only JSON numbers, as jsonb_typeof = 'number' does", () => {
    expect(internalStorage({ storage: [{ capacity: "500", freeSpace: "50" }] })).toEqual({ total: 0, free: 0 });
    expect(internalStorage({ storage: [null, "x", [1], { capacity: 10, freeSpace: 2 }] })).toEqual({ total: 10, free: 2 });
  });
});

describe("storageFreeBucket", () => {
  it.each([
    [0.0001, "lt5"],
    [0.0499, "lt5"],
    [0.05, "5-10"],
    [0.0999, "5-10"],
    [0.1, "10-20"],
    [0.1999, "10-20"],
    [0.2, "20+"],
    [0.9, "20+"],
  ])("free ratio %p is %p", (ratio, key) => {
    expect(storageFreeBucket(withFree(ratio))).toBe(key);
  });

  it("leaves out devices with no capacity or no free space", () => {
    expect(storageFreeBucket({ storage: [drive(1000, 0)] })).toBeNull();
    expect(storageFreeBucket({ storage: [drive(0, 10)] })).toBeNull();
    expect(storageFreeBucket({})).toBeNull();
  });

  it("calls lt5 and 5-10 low, the card's lowStorage", () => {
    expect(isLowStorageBucket(withFree(0.01))).toBe(true);
    expect(isLowStorageBucket(withFree(0.09))).toBe(true);
    expect(isLowStorageBucket(withFree(0.1))).toBe(false);
    expect(isLowStorageBucket({})).toBe(false);
  });
});

describe("storageCapacityBucket", () => {
  it.each([
    [128 * GB, "le256"],
    [383.9 * GB, "le256"],
    [384 * GB, "512"],
    [494 * GB, "512"],
    [767.9 * GB, "512"],
    [768 * GB, "1t"],
    [1535.9 * GB, "1t"],
    [1536 * GB, "2t+"],
    [4000 * GB, "2t+"],
  ])("%p bytes is %p", (total, key) => {
    expect(storageCapacityBucket(withTotal(total))).toBe(key);
  });

  it("measures the same devices the free-space buckets do", () => {
    expect(storageCapacityBucket({ storage: [drive(500 * GB, 0)] })).toBeNull();
  });
});

describe("installAgent", () => {
  it("is Munki on macOS and Cimian on Windows", () => {
    expect(installAgent({ platform: "macOS" })).toBe("munki");
    expect(installAgent({ platform: "Windows" })).toBe("cimian");
    expect(installAgent({ platform: "Windows", modules: { installs: { munki: {} } } })).toBe("cimian");
  });

  it("falls back to the installs module when the platform is unknown", () => {
    expect(installAgent({ modules: { installs: { cimian: {}, munki: {} } } })).toBe("cimian");
    expect(installAgent({ modules: { installs: { munki: {} } } })).toBe("munki");
    expect(installAgent({})).toBeNull();
  });

  it("parses the param", () => {
    expect(installAgentFromParam("Munki")).toBe("munki");
    expect(installAgentFromParam("cimian")).toBe("cimian");
    expect(installAgentFromParam("chocolatey")).toBeNull();
    expect(installAgentFromParam(null)).toBeNull();
  });
});

describe("macDirectory", () => {
  const mac = (fields: Record<string, any>) => ({ platform: "macOS", ...fields });

  it("puts Platform SSO or Entra first", () => {
    expect(macDirectory(mac({ platformSSORegistered: true, adBound: true }))).toBe("psso");
    expect(macDirectory(mac({ entraJoined: true, ldapBound: true }))).toBe("psso");
    expect(macDirectory(mac({ platformSSOUsers: { deviceRegistered: "yes" } }))).toBe("psso");
    expect(macDirectory(mac({ directoryServices: { azureAd: { isEntraJoined: "1" } } }))).toBe("psso");
  });

  it("then AD or LDAP binding", () => {
    expect(macDirectory(mac({ domainJoined: true }))).toBe("bound");
    expect(macDirectory(mac({ adBound: true }))).toBe("bound");
    expect(macDirectory(mac({ ldapBound: true }))).toBe("bound");
    expect(macDirectory(mac({ directoryServices: { ldap: { bound: "true" } } }))).toBe("bound");
    expect(macDirectory(mac({ directoryServices: { activeDirectory: { isDomainJoined: true } } }))).toBe("bound");
  });

  it("else not bound, and null off the Mac", () => {
    expect(macDirectory(mac({ platformSSORegistered: false, adBound: "false" }))).toBe("unbound");
    expect(macDirectory(mac({}))).toBe("unbound");
    expect(macDirectory({ platform: "Windows", entraJoined: true })).toBeNull();
  });

  it("reads the SQL true vocabulary", () => {
    for (const v of [true, "true", "T", "yes", "y", "on", "1", 1]) expect(sqlTrue(v)).toBe(true);
    for (const v of [false, "false", "enabled", "", null, undefined, 0, 2]) expect(sqlTrue(v)).toBe(false);
  });
});

describe("management tool logs", () => {
  const now = Date.UTC(2026, 9, 22, 15, 30);

  it("starts the window 24 hours back, as an hour key", () => {
    expect(toolWindowStartHour(now)).toBe("2026-10-21T15");
    expect(toolWindowStartHour(now, 1)).toBe("2026-10-22T14");
  });

  it("sums hours from the window start on, inclusive", () => {
    const summary = {
      hours: {
        "2026-10-21T14": [5, 5],
        "2026-10-21T15": [1, 0],
        "2026-10-22T09": [2, 3],
        "2026-10-22T15": ["x", 4],
      },
    };
    expect(levelSummaryCounts(summary, "2026-10-21T15")).toEqual({ errors: 3, warnings: 7 });
    expect(levelSummaryCounts(null, "2026-10-21T15")).toEqual({ errors: 0, warnings: 0 });
    expect(levelSummaryCounts({ hours: [] }, "2026-10-21T15")).toEqual({ errors: 0, warnings: 0 });
  });

  it("says whether a root logged that level in the window", () => {
    const root = { levelSummary: { hours: { "2026-10-22T10": [0, 2], "2026-10-20T10": [9, 0] } } };
    expect(rootHasLevelInWindow(root, "warning", "2026-10-21T15")).toBe(true);
    expect(rootHasLevelInWindow(root, "error", "2026-10-21T15")).toBe(false);
    expect(rootHasLevelInWindow(undefined, "error", "2026-10-21T15")).toBe(false);
  });

  it("parses tool and level params", () => {
    expect(toolRootFromParam("Installs")).toBe("installs");
    expect(toolRootFromParam("mdm")).toBe("mdm");
    expect(toolRootFromParam("logs")).toBeNull();
    expect(toolLevelFromParam("error")).toBe("error");
    expect(toolLevelFromParam("WARNING")).toBe("warning");
    expect(toolLevelFromParam("errors")).toBeNull();
  });

  it("names the product per platform", () => {
    expect(toolProductLabel("installs", "macOS")).toBe("Munki");
    expect(toolProductLabel("installs", "win")).toBe("Cimian");
    expect(toolProductLabel("installs")).toBe("Munki / Cimian");
    expect(toolProductLabel("bootstrap")).toBe("BootstrapMate");
    expect(toolProductLabel("mdm", "macOS")).toBe("MDM");
  });
});

describe('Directory Services (/identity?directory=)', () => {
  const {
    directoryServiceFromParam, directoryServiceToParam, matchesDirectoryService,
  } = require('./reportRules') as typeof import('./reportRules')

  it('reads every key the API links with, and the labels', () => {
    expect(directoryServiceFromParam('cloud')).toBe('Cloud Joined')
    expect(directoryServiceFromParam('domain')).toBe('Domain Joined')
    expect(directoryServiceFromParam('trusted')).toBe('Trusted')
    expect(directoryServiceFromParam('unconfirmed')).toBe('Unconfirmed')
    expect(directoryServiceFromParam('broken')).toBe('Broken')
    expect(directoryServiceFromParam('standard')).toBe('Standard')
    expect(directoryServiceFromParam('unjoined')).toBe('Unjoined')
    expect(directoryServiceFromParam('Cloud Joined')).toBe('Cloud Joined')
    expect(directoryServiceFromParam('psso')).toBeNull()
    expect(directoryServiceFromParam(null)).toBeNull()
  })

  it('writes the key back', () => {
    expect(directoryServiceToParam('Domain Joined')).toBe('domain')
    expect(directoryServiceToParam('Unconfirmed')).toBe('unconfirmed')
    expect(directoryServiceToParam(null)).toBeNull()
  })

  it('classifies rows as the Identity report does', () => {
    const domain = (trustStatus: string | null) => ({ enrollmentType: 'Domain Joined', trustStatus })
    expect(matchesDirectoryService({ enrollmentType: 'Cloud Joined' }, 'Cloud Joined')).toBe(true)
    expect(matchesDirectoryService({ enrollmentType: 'Standard' }, 'Cloud Joined')).toBe(false)
    expect(matchesDirectoryService(domain('Healthy'), 'Domain Joined')).toBe(true)
    expect(matchesDirectoryService(domain('Healthy'), 'Trusted')).toBe(true)
    expect(matchesDirectoryService(domain('Broken'), 'Broken')).toBe(true)
    expect(matchesDirectoryService(domain('Broken'), 'Trusted')).toBe(false)
    expect(matchesDirectoryService(domain(null), 'Unconfirmed')).toBe(true)
    expect(matchesDirectoryService(domain('Unknown'), 'Unconfirmed')).toBe(true)
    expect(matchesDirectoryService({ enrollmentType: 'Cloud Joined', trustStatus: null }, 'Unconfirmed')).toBe(false)
    expect(matchesDirectoryService({ enrollmentType: 'Unjoined' }, 'Unjoined')).toBe(true)
  })
})
