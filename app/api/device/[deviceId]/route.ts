import { NextResponse } from 'next/server'

// Comprehensive mock device database with 6 devices (3 Macs, 3 Windows)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const deviceDatabase: Record<string, any> = {
  // Mac Device 1 - Marketing Designer
  'JY93C5YGGM': {
    id: 'JY93C5YGGM',
    name: 'Celeste Martin',
    model: 'MacBook Air (15-inch, M2, 2023)',
    os: 'macOS 15.2.0',
    lastSeen: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
    status: 'online',
    uptime: '25 days, 14 hours',
    location: 'Marketing',
    serialNumber: 'JY93C5YGGM',
    assetTag: 'MAC-001',
    ipAddress: '108.172.84.175',
    macAddress: '00:9B:8F:7F:4B:D4',
    totalEvents: 1247,
    lastEventTime: new Date(Date.now() - 1800000).toISOString(),
    
    // System Information
    processor: 'Apple M2 8-Core',
    processorSpeed: '3.49 GHz',
    cores: 8,
    memory: '16 GB',
    availableRAM: '8.2 GB',
    memorySlots: 'Unified Memory',
    storage: '512 GB SSD',
    availableStorage: '164 GB',
    storageType: 'SSD',
    graphics: 'Apple M2 10-Core GPU',
    vram: 'Shared',
    resolution: '2880 x 1864',
    architecture: 'arm64',
    diskUtilization: 68,
    memoryUtilization: 45,
    cpuUtilization: 23,
    temperature: 42,
    batteryLevel: 87,
    bootTime: new Date(Date.now() - 2160000000).toISOString(), // 25 days ago
    
    // Network Information
    networkInterfaces: [
      {
        name: 'Wi-Fi',
        type: 'Wi-Fi',
        status: 'Connected',
        ipAddress: '108.172.84.175',
        macAddress: '00:9B:8F:7F:4B:D4',
        gateway: '108.172.84.1',
        dns: ['8.8.8.8', '8.8.4.4'],
        speed: '1 Gbps'
      },
      {
        name: 'Bluetooth PAN',
        type: 'Bluetooth',
        status: 'Inactive',
        ipAddress: null,
        macAddress: '00:9B:8F:7F:4B:D5',
        gateway: null,
        dns: [],
        speed: null
      }
    ],
    
    // Security Information
    securityFeatures: {
      filevault: { enabled: true, status: 'Encrypted' },
      firewall: { enabled: true, status: 'Active' },
      gatekeeper: { enabled: true, status: 'Active' },
      sip: { enabled: true, status: 'Enabled' },
      xprotect: { enabled: true, status: 'Up to date' },
      automaticUpdates: { enabled: true, status: 'Enabled' },
      edr: { installed: true, name: 'CrowdStrike Falcon', status: 'Active', version: '7.15.0' }
    },
    
    // MDM Information
    mdm: {
      enrolled: true,
      enrolled_via_dep: true,
      server_url: 'https://mdm.ecuad.ca',
      user_approved: true,
      organization: 'Emily Carr University',
      department: 'Marketing',
      profiles: [
        {
          id: 'wifi-profile-001',
          name: 'Corporate Wi-Fi Profile',
          description: 'Configures Wi-Fi access for corporate network',
          type: 'Wi-Fi',
          status: 'Installed',
          lastModified: new Date(Date.now() - 2592000000).toISOString() // 30 days ago
        },
        {
          id: 'security-profile-001',
          name: 'Security Baseline',
          description: 'Enforces corporate security policies',
          type: 'Security',
          status: 'Installed',
          lastModified: new Date(Date.now() - 1296000000).toISOString() // 15 days ago
        },
        {
          id: 'email-profile-001',
          name: 'Email Configuration',
          description: 'Configures corporate email settings',
          type: 'Email',
          status: 'Installed',
          lastModified: new Date(Date.now() - 2592000000).toISOString() // 30 days ago
        }
      ],
      restrictions: {
        app_installation: 'allowed',
        camera_disabled: false,
        screen_recording_disabled: false,
        system_preferences_disabled: false,
        touch_id_disabled: false,
        siri_disabled: false
      },
      apps: [
        {
          id: 'managed-app-001',
          name: 'Corporate Portal',
          bundleId: 'com.ecuad.portal',
          status: 'installed',
          source: 'mdm',
          lastUpdate: new Date(Date.now() - 604800000).toISOString() // 7 days ago
        },
        {
          id: 'managed-app-002',
          name: 'Adobe Creative Cloud',
          bundleId: 'com.adobe.CreativeCloud',
          status: 'installed',
          source: 'mdm',
          lastUpdate: new Date(Date.now() - 1209600000).toISOString() // 14 days ago
        }
      ]
    },
    
    // Managed Installs (Munki)
    managedInstalls: {
      type: 'Munki',
      lastRun: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      nextRun: new Date(Date.now() + 14400000).toISOString(), // 4 hours from now
      status: 'Success',
      config: {
        type: 'munki',
        version: '6.2.1',
        // UI expects these specific property names
        softwareRepoURL: 'https://munki.ecuad.ca/deployment',
        manifest: 'Staff/IT/RodChristiansen',
        runType: 'auto',
        lastRun: new Date(Date.now() - 7200000).toISOString(),
        duration: '2m 45s',
        // Based on your provided Munki config - original property names for reference
        SoftwareRepoURL: 'https://munki.ecuad.ca/deployment',
        ClientIdentifier: 'Staff/IT/RodChristiansen',
        ManagedInstallDir: '/Library/Managed Installs',
        LogFile: '/Library/Managed Installs/Logs/ManagedSoftwareUpdate.log',
        LoggingLevel: 1,
        InstallAppleSoftwareUpdates: false,
        AppleSoftwareUpdatesOnly: false,
        LastCheckDate: new Date(Date.now() - 7200000).toISOString(),
        LastCheckResult: 1,
        PendingUpdateCount: 0,
        AggressiveUpdateNotificationDays: 14,
        DaysBetweenNotifications: 1,
        UseNotificationCenterDays: 3,
        SuppressUserNotification: true,
        PackageVerificationMode: 'hash',
        FollowHTTPRedirects: 'none'
      },
      messages: {
        errors: [
          {
            id: 'err-001',
            package: 'Adobe Creative Suite',
            message: 'Installation failed: Insufficient disk space',
            details: 'The installer requires 15 GB of free space, but only 8.2 GB is available.',
            timestamp: new Date(Date.now() - 86400000).toISOString() // 1 day ago
          }
        ],
        warnings: [
          {
            id: 'warn-001',
            package: 'Chrome',
            message: 'Package verification warning',
            details: 'Package signature could not be verified against known certificates.',
            timestamp: new Date(Date.now() - 43200000).toISOString() // 12 hours ago
          }
        ]
      },
      packages: [
        {
          name: 'Google Chrome',
          version: '120.0.6099.109',
          status: 'Installed',
          installDate: new Date(Date.now() - 604800000).toISOString(), // 1 week ago
          size: '245 MB'
        },
        {
          name: 'Adobe Photoshop 2024',
          version: '25.2.0',
          status: 'Installed',
          installDate: new Date(Date.now() - 1209600000).toISOString(), // 2 weeks ago
          size: '3.2 GB'
        },
        {
          name: 'Microsoft Office 365',
          version: '16.80.0',
          status: 'Pending Update',
          installDate: new Date(Date.now() - 2592000000).toISOString(), // 1 month ago
          size: '2.8 GB'
        },
        {
          name: 'Figma Desktop',
          version: '116.15.4',
          status: 'Installed',
          installDate: new Date(Date.now() - 518400000).toISOString(), // 6 days ago
          size: '185 MB'
        }
      ]
    },
    
    // Applications
    applications: [
      {
        name: 'Google Chrome',
        version: '120.0.6099.109',
        bundleId: 'com.google.Chrome',
        path: '/Applications/Google Chrome.app',
        lastOpened: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        size: '245 MB'
      },
      {
        name: 'Adobe Photoshop 2024',
        version: '25.2.0',
        bundleId: 'com.adobe.Photoshop',
        path: '/Applications/Adobe Photoshop 2024/Adobe Photoshop 2024.app',
        lastOpened: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        size: '3.2 GB'
      },
      {
        name: 'Figma',
        version: '116.15.4',
        bundleId: 'com.figma.Desktop',
        path: '/Applications/Figma.app',
        lastOpened: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
        size: '185 MB'
      },
      {
        name: 'Slack',
        version: '4.36.134',
        bundleId: 'com.tinyspeck.slackmacgap',
        path: '/Applications/Slack.app',
        lastOpened: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
        size: '165 MB'
      },
      {
        name: 'Microsoft Word',
        version: '16.80.0',
        bundleId: 'com.microsoft.Word',
        path: '/Applications/Microsoft Word.app',
        lastOpened: new Date(Date.now() - 14400000).toISOString(), // 4 hours ago
        size: '1.2 GB'
      }
    ]
  },

  // Mac Device 2 - Software Developer
  'FVFXQ2P3JM': {
    id: 'FVFXQ2P3JM',
    name: 'Alex Chen',
    model: 'MacBook Pro (16-inch, M3 Pro, 2023)',
    os: 'macOS 15.2.0',
    lastSeen: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
    status: 'online',
    uptime: '12 days, 8 hours',
    location: 'Engineering',
    serialNumber: 'FVFXQ2P3JM',
    assetTag: 'MAC-002',
    ipAddress: '192.168.1.142',
    macAddress: '14:7D:DA:8C:9A:2B',
    totalEvents: 2134,
    lastEventTime: new Date(Date.now() - 900000).toISOString(),
    
    processor: 'Apple M3 Pro 12-Core',
    processorSpeed: '4.05 GHz',
    cores: 12,
    memory: '32 GB',
    availableRAM: '10.2 GB',
    memorySlots: 'Unified Memory',
    storage: '1 TB SSD',
    availableStorage: '480 GB',
    storageType: 'SSD',
    graphics: 'Apple M3 Pro 18-Core GPU',
    vram: 'Shared',
    resolution: '3456 x 2234',
    architecture: 'arm64',
    diskUtilization: 52,
    memoryUtilization: 68,
    cpuUtilization: 41,
    temperature: 48,
    batteryLevel: 76,
    bootTime: new Date(Date.now() - 1036800000).toISOString(), // 12 days ago
    
    networkInterfaces: [
      {
        name: 'Wi-Fi',
        type: 'Wi-Fi',
        status: 'Connected',
        ipAddress: '192.168.1.142',
        macAddress: '14:7D:DA:8C:9A:2B',
        gateway: '192.168.1.1',
        dns: ['1.1.1.1', '1.0.0.1'],
        speed: '1 Gbps'
      },
      {
        name: 'Thunderbolt Ethernet',
        type: 'Ethernet',
        status: 'Inactive',
        ipAddress: null,
        macAddress: '14:7D:DA:8C:9A:2C',
        gateway: null,
        dns: [],
        speed: null
      }
    ],
    
    securityFeatures: {
      filevault: { enabled: true, status: 'Encrypted' },
      firewall: { enabled: true, status: 'Active' },
      gatekeeper: { enabled: true, status: 'Active' },
      sip: { enabled: false, status: 'Disabled' },
      xprotect: { enabled: true, status: 'Up to date' },
      automaticUpdates: { enabled: false, status: 'Disabled' },
      edr: { installed: true, name: 'SentinelOne', status: 'Active', version: '23.1.2.8' }
    },
    
    // MDM Information
    mdm: {
      enrolled: true,
      enrolled_via_dep: false,
      server_url: 'https://mdm.ecuad.ca',
      user_approved: true,
      organization: 'Emily Carr University',
      department: 'IT',
      profiles: [
        {
          id: 'wifi-profile-001',
          name: 'Corporate Wi-Fi Profile',
          description: 'Configures Wi-Fi access for corporate network',
          type: 'Wi-Fi',
          status: 'Installed',
          lastModified: new Date(Date.now() - 2592000000).toISOString() // 30 days ago
        },
        {
          id: 'developer-profile-001',
          name: 'Developer Tools',
          description: 'Configuration for development environment',
          type: 'Configuration',
          status: 'Installed',
          lastModified: new Date(Date.now() - 604800000).toISOString() // 7 days ago
        },
        {
          id: 'vpn-profile-001',
          name: 'VPN Configuration',
          description: 'Corporate VPN access',
          type: 'VPN',
          status: 'Installed',
          lastModified: new Date(Date.now() - 1296000000).toISOString() // 15 days ago
        }
      ],
      restrictions: {
        app_installation: 'allowed',
        camera_disabled: false,
        screen_recording_disabled: false,
        system_preferences_disabled: true,
        touch_id_disabled: false,
        siri_disabled: false
      },
      apps: [
        {
          id: 'managed-app-003',
          name: 'Xcode',
          bundleId: 'com.apple.dt.Xcode',
          status: 'installed',
          source: 'mdm',
          lastUpdate: new Date(Date.now() - 1209600000).toISOString() // 14 days ago
        },
        {
          id: 'managed-app-004',
          name: 'Microsoft Office',
          bundleId: 'com.microsoft.office',
          status: 'installed',
          source: 'mdm',
          lastUpdate: new Date(Date.now() - 2592000000).toISOString() // 30 days ago
        }
      ]
    },
    
    managedInstalls: {
      type: 'Munki',
      lastRun: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
      nextRun: new Date(Date.now() + 10800000).toISOString(), // 3 hours from now
      status: 'Warning',
      config: {
        type: 'munki',
        version: '6.2.0',
        // UI expects these specific property names
        softwareRepoURL: 'https://munki.ecuad.ca/deployment',
        manifest: 'Staff/IT/AlexChen',
        runType: 'auto',
        lastRun: new Date(Date.now() - 10800000).toISOString(),
        duration: '3m 12s',
        // Based on your provided Munki config - original property names for reference
        SoftwareRepoURL: 'https://munki.ecuad.ca/deployment',
        ClientIdentifier: 'Staff/IT/AlexChen',
        ManagedInstallDir: '/Library/Managed Installs',
        LogFile: '/Library/Managed Installs/Logs/ManagedSoftwareUpdate.log',
        LoggingLevel: 1,
        InstallAppleSoftwareUpdates: false,
        AppleSoftwareUpdatesOnly: false,
        LastCheckDate: new Date(Date.now() - 10800000).toISOString(),
        LastCheckResult: 1,
        PendingUpdateCount: 0,
        AggressiveUpdateNotificationDays: 14,
        DaysBetweenNotifications: 1,
        UseNotificationCenterDays: 3,
        SuppressUserNotification: true,
        PackageVerificationMode: 'hash',
        FollowHTTPRedirects: 'none',
        EmulateProfileSupport: false,
        IgnoreMiddleware: false,
        IgnoreSystemProxies: false,
        InstallRequiresLogout: false,
        LogToSyslog: false,
        OldestUpdateDays: 0,
        PerformAuthRestarts: false,
        ShowOptionalInstallsForHigherOSVersions: false,
        SoftwareUpdateServerURL: '',
        SuppressAutoInstall: false,
        SuppressLoginwindowInstall: false,
        SuppressStopButtonOnInstall: false,
        UnattendedAppleUpdates: false,
        UseClientCertificate: false,
        UseClientCertificateCNAsClientIdentifier: false
      },
      messages: {
        errors: [],
        warnings: [
          {
            id: 'warn-002',
            package: 'Xcode Command Line Tools',
            message: 'Version mismatch detected',
            details: 'Expected version 15.1.0, but found 15.0.0. This may cause compatibility issues.',
            timestamp: new Date(Date.now() - 21600000).toISOString() // 6 hours ago
          },
          {
            id: 'warn-003',
            package: 'Docker Desktop',
            message: 'Resource usage warning',
            details: 'Docker is consuming more than 8GB of memory. Consider adjusting container limits.',
            timestamp: new Date(Date.now() - 7200000).toISOString() // 2 hours ago
          }
        ]
      },
      packages: [
        {
          name: 'Visual Studio Code',
          version: '1.85.2',
          status: 'Installed',
          installDate: new Date(Date.now() - 2628000000).toISOString(), // 1 month ago
          size: '312 MB'
        },
        {
          name: 'Docker Desktop',
          version: '4.26.1',
          status: 'Installed',
          installDate: new Date(Date.now() - 1209600000).toISOString(), // 2 weeks ago
          size: '1.8 GB'
        },
        {
          name: 'Node.js LTS',
          version: '20.10.0',
          status: 'Installed',
          installDate: new Date(Date.now() - 604800000).toISOString(), // 1 week ago
          size: '67 MB'
        },
        {
          name: 'Xcode',
          version: '15.1.0',
          status: 'Pending Update',
          installDate: new Date(Date.now() - 5184000000).toISOString(), // 2 months ago
          size: '12.8 GB'
        }
      ]
    },
    
    applications: [
      {
        name: 'Visual Studio Code',
        version: '1.85.2',
        bundleId: 'com.microsoft.VSCode',
        path: '/Applications/Visual Studio Code.app',
        lastOpened: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
        size: '312 MB'
      },
      {
        name: 'Docker Desktop',
        version: '4.26.1',
        bundleId: 'com.docker.docker',
        path: '/Applications/Docker.app',
        lastOpened: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        size: '1.8 GB'
      },
      {
        name: 'Terminal',
        version: '2.14',
        bundleId: 'com.apple.Terminal',
        path: '/System/Applications/Utilities/Terminal.app',
        lastOpened: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
        size: '18 MB'
      },
      {
        name: 'GitHub Desktop',
        version: '3.3.8',
        bundleId: 'com.github.GitHubClient',
        path: '/Applications/GitHub Desktop.app',
        lastOpened: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        size: '145 MB'
      }
    ]
  },

  // Mac Device 3 - Executive Assistant
  'C02ZK8WVLVDQ': {
    id: 'C02ZK8WVLVDQ',
    name: 'Sarah Johnson',
    model: 'iMac (24-inch, M1, 2021)',
    os: 'macOS 15.1.0',
    lastSeen: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
    status: 'offline',
    uptime: '0 days',
    location: 'Executive Office',
    serialNumber: 'C02ZK8WVLVDQ',
    ipAddress: '192.168.1.89',
    macAddress: 'A4:83:E7:2C:45:8A',
    totalEvents: 567,
    lastEventTime: new Date(Date.now() - 43200000).toISOString(),
    
    processor: 'Apple M1 8-Core',
    memory: '16 GB',
    storage: '512 GB SSD',
    graphics: 'Apple M1 8-Core GPU',
    diskUtilization: 34,
    memoryUtilization: 0,
    cpuUtilization: 0,
    temperature: 28,
    batteryLevel: null, // Desktop
    bootTime: new Date(Date.now() - 43200000).toISOString(),
    
    networkInterfaces: [
      {
        name: 'Ethernet',
        type: 'Ethernet',
        status: 'Inactive',
        ipAddress: null,
        macAddress: 'A4:83:E7:2C:45:8A',
        gateway: null,
        dns: [],
        speed: null
      },
      {
        name: 'Wi-Fi',
        type: 'Wi-Fi',
        status: 'Inactive',
        ipAddress: null,
        macAddress: 'A4:83:E7:2C:45:8B',
        gateway: null,
        dns: [],
        speed: null
      }
    ],
    
    securityFeatures: {
      filevault: { enabled: true, status: 'Encrypted' },
      firewall: { enabled: true, status: 'Inactive' },
      gatekeeper: { enabled: true, status: 'Active' },
      sip: { enabled: true, status: 'Enabled' },
      xprotect: { enabled: true, status: 'Outdated' },
      automaticUpdates: { enabled: true, status: 'Enabled' },
      edr: { installed: false, name: null, status: 'Not Installed', version: null }
    },
    
    // MDM Information
    mdm: {
      enrolled: false,
      enrolled_via_dep: false,
      server_url: null,
      user_approved: null,
      organization: null,
      department: null,
      profiles: [],
      restrictions: null,
      apps: []
    },
    
    managedInstalls: {
      type: 'Munki',
      lastRun: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      nextRun: new Date(Date.now() + 43200000).toISOString(), // 12 hours from now
      status: 'Error',
      config: {
        type: 'munki',
        version: '6.1.8',
        // UI expects these specific property names
        softwareRepoURL: 'https://munki.ecuad.ca/deployment',
        manifest: 'Staff/Executive/SarahKim',
        runType: 'auto',
        lastRun: new Date(Date.now() - 86400000).toISOString(),
        duration: '1m 28s',
        // Based on your provided Munki config - original property names for reference
        SoftwareRepoURL: 'https://munki.ecuad.ca/deployment',
        ClientIdentifier: 'Staff/Executive/SarahKim',
        ManagedInstallDir: '/Library/Managed Installs',
        LogFile: '/Library/Managed Installs/Logs/ManagedSoftwareUpdate.log',
        LoggingLevel: 1,
        InstallAppleSoftwareUpdates: true,
        AppleSoftwareUpdatesOnly: false,
        LastCheckDate: new Date(Date.now() - 86400000).toISOString(),
        LastCheckResult: 0,
        PendingUpdateCount: 1,
        AggressiveUpdateNotificationDays: 14,
        DaysBetweenNotifications: 1,
        UseNotificationCenterDays: 3,
        SuppressUserNotification: false,
        PackageVerificationMode: 'hash',
        FollowHTTPRedirects: 'none'
      },
      messages: {
        errors: [
          {
            id: 'err-002',
            package: 'System Update',
            message: 'Network timeout during download',
            details: 'Failed to download macOS 15.2.0 update. Connection timed out after 30 seconds.',
            timestamp: new Date(Date.now() - 86400000).toISOString() // 1 day ago
          }
        ],
        warnings: []
      },
      packages: [
        {
          name: 'Microsoft Office 365',
          version: '16.79.0',
          status: 'Installed',
          installDate: new Date(Date.now() - 5184000000).toISOString(), // 2 months ago
          size: '2.8 GB'
        },
        {
          name: 'Zoom',
          version: '5.16.10',
          status: 'Installed',
          installDate: new Date(Date.now() - 1209600000).toISOString(), // 2 weeks ago
          size: '198 MB'
        },
        {
          name: 'Calendar Sync Tool',
          version: '2.4.1',
          status: 'Failed',
          installDate: null,
          size: '45 MB'
        }
      ]
    },
    
    applications: [
      {
        name: 'Microsoft Outlook',
        version: '16.79.0',
        bundleId: 'com.microsoft.Outlook',
        path: '/Applications/Microsoft Outlook.app',
        lastOpened: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
        size: '1.1 GB'
      },
      {
        name: 'Calendar',
        version: '14.0',
        bundleId: 'com.apple.iCal',
        path: '/System/Applications/Calendar.app',
        lastOpened: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
        size: '25 MB'
      },
      {
        name: 'Zoom',
        version: '5.16.10',
        bundleId: 'us.zoom.xos',
        path: '/Applications/zoom.us.app',
        lastOpened: new Date(Date.now() - 46800000).toISOString(), // 13 hours ago
        size: '198 MB'
      }
    ]
  },

  // Windows Device 1 - Accounting Manager
  'WS-ACC-001': {
    id: 'WS-ACC-001',
    name: 'Jennifer Davis',
    model: 'Dell OptiPlex 7090',
    os: 'Windows 11 Pro 23H2 (Build 22631.2861)',
    lastSeen: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    status: 'warning',
    uptime: '5 days, 16 hours',
    location: 'Accounting',
    serialNumber: 'WS-ACC-001',
    assetTag: 'WIN-001',
    ipAddress: '192.168.1.156',
    macAddress: '00:0C:29:8F:A2:B4',
    totalEvents: 1089,
    lastEventTime: new Date(Date.now() - 3600000).toISOString(),
    
    processor: 'Intel Core i7-11700 @ 2.50GHz',
    processorSpeed: '2.50 GHz',
    cores: 8,
    memory: '32 GB DDR4',
    availableRAM: '15.4 GB',
    memorySlots: '4 slots (2 occupied)',
    storage: '1 TB NVMe SSD',
    availableStorage: '220 GB',
    storageType: 'NVMe SSD',
    graphics: 'Intel UHD Graphics 750',
    vram: '128 MB',
    resolution: '2560 x 1440',
    architecture: 'x64',
    diskUtilization: 78,
    memoryUtilization: 52,
    cpuUtilization: 15,
    temperature: 58,
    batteryLevel: null, // Desktop
    bootTime: new Date(Date.now() - 486400000).toISOString(), // 5 days ago
    
    networkInterfaces: [
      {
        name: 'Ethernet',
        type: 'Ethernet',
        status: 'Connected',
        ipAddress: '192.168.1.156',
        macAddress: '00:0C:29:8F:A2:B4',
        gateway: '192.168.1.1',
        dns: ['192.168.1.10', '8.8.8.8'],
        speed: '1 Gbps'
      },
      {
        name: 'Wi-Fi',
        type: 'Wi-Fi',
        status: 'Inactive',
        ipAddress: null,
        macAddress: '00:0C:29:8F:A2:B5',
        gateway: null,
        dns: [],
        speed: null
      }
    ],
    
    securityFeatures: {
      bitlocker: { enabled: true, status: 'Encrypted' },
      windowsDefender: { enabled: true, status: 'Active' },
      firewall: { enabled: true, status: 'Active' },
      uac: { enabled: true, status: 'Enabled' },
      windowsUpdates: { enabled: true, status: 'Up to date' },
      smartScreen: { enabled: true, status: 'Active' },
      tpm: { enabled: true, status: 'Ready', version: '2.0' },
      edr: { installed: true, name: 'Microsoft Defender for Endpoint', status: 'Active', version: '4.18.2401.5' }
    },
    
    // MDM Information (Windows - Intune)
    mdm: {
      enrolled: true,
      enrolled_via_dep: false, // Windows uses Autopilot instead of DEP
      server_url: 'https://manage.microsoft.com',
      user_approved: true,
      organization: 'Emily Carr University',
      department: 'Accounting',
      profiles: [
        {
          id: 'intune-wifi-001',
          name: 'Corporate Wi-Fi',
          description: 'Wi-Fi configuration for domain network',
          type: 'Wi-Fi',
          status: 'Installed',
          lastModified: new Date(Date.now() - 2592000000).toISOString() // 30 days ago
        },
        {
          id: 'intune-compliance-001',
          name: 'Compliance Policy',
          description: 'Device compliance requirements',
          type: 'Compliance',
          status: 'Installed',
          lastModified: new Date(Date.now() - 1296000000).toISOString() // 15 days ago
        },
        {
          id: 'intune-bitlocker-001',
          name: 'BitLocker Encryption',
          description: 'Disk encryption configuration',
          type: 'Security',
          status: 'Installed',
          lastModified: new Date(Date.now() - 5184000000).toISOString() // 60 days ago
        }
      ],
      restrictions: {
        app_installation: 'restricted',
        camera_disabled: false,
        screen_recording_disabled: false,
        system_preferences_disabled: true,
        touch_id_disabled: false,
        siri_disabled: true
      },
      apps: [
        {
          id: 'intune-app-001',
          name: 'Microsoft Office 365',
          bundleId: 'com.microsoft.office365',
          status: 'installed',
          source: 'mdm',
          lastUpdate: new Date(Date.now() - 2592000000).toISOString() // 30 days ago
        },
        {
          id: 'intune-app-002',
          name: 'Microsoft Teams',
          bundleId: 'com.microsoft.teams',
          status: 'installed',
          source: 'mdm',
          lastUpdate: new Date(Date.now() - 604800000).toISOString() // 7 days ago
        }
      ]
    },
    
    managedInstalls: {
      type: 'Cimian',
      lastRun: new Date(Date.now() - 14400000).toISOString(), // 4 hours ago
      nextRun: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
      status: 'Warning',
      config: {
        type: 'cimian',
        version: '2.8.1',
        // UI expects these specific property names
        softwareRepoURL: 'https://cimian.ecuad.ca/deployment',
        manifest: 'Assigned/Staff/Accounting/B1105/JenniferAdams',
        runType: 'manual',
        lastRun: new Date(Date.now() - 14400000).toISOString(),
        duration: '4m 15s',
        // Based on your provided Cimian config - original property names for reference
        SoftwareRepoURL: 'https://cimian.ecuad.ca/deployment',
        ClientIdentifier: 'Assigned/Staff/Accounting/B1105/JenniferAdams',
        CachePath: 'C:\\ProgramData\\ManagedInstalls\\cache',
        CatalogsPath: 'C:\\ProgramData\\ManagedInstalls\\catalogs',
        RepoPath: 'C:\\Users\\jadams\\DevOps\\Cimian\\deployment',
        DefaultCatalog: 'Production',
        DefaultArch: 'x64',
        Catalogs: [],
        LocalManifests: [],
        CheckOnly: false,
        Debug: false,
        Verbose: false,
        CloudProvider: 'none',
        CloudBucket: '',
        ForceBasicAuth: false,
        OpenImportedYaml: true,
        InstallPath: '',
        LogLevel: ''
      },
      messages: {
        errors: [],
        warnings: [
          {
            id: 'warn-004',
            package: 'QuickBooks Enterprise',
            message: 'License expiration warning',
            details: 'QuickBooks Enterprise license will expire in 15 days. Please contact IT to renew.',
            timestamp: new Date(Date.now() - 86400000).toISOString() // 1 day ago
          }
        ]
      },
      packages: [
        {
          name: 'Microsoft Office 365',
          version: '16.0.17029.20108',
          status: 'Installed',
          installDate: new Date(Date.now() - 2628000000).toISOString(), // 1 month ago
          size: '3.2 GB'
        },
        {
          name: 'QuickBooks Enterprise',
          version: '23.0.8',
          status: 'Installed',
          installDate: new Date(Date.now() - 5184000000).toISOString(), // 2 months ago
          size: '1.8 GB'
        },
        {
          name: 'Adobe Acrobat Pro DC',
          version: '2023.008.20458',
          status: 'Pending Update',
          installDate: new Date(Date.now() - 2628000000).toISOString(), // 1 month ago
          size: '2.1 GB'
        },
        {
          name: 'Chrome Enterprise',
          version: '120.0.6099.129',
          status: 'Installed',
          installDate: new Date(Date.now() - 604800000).toISOString(), // 1 week ago
          size: '285 MB'
        }
      ]
    },
    
    applications: [
      {
        name: 'Microsoft Excel',
        version: '16.0.17029.20108',
        bundleId: 'Microsoft.Office.Excel',
        path: 'C:\\Program Files\\Microsoft Office\\root\\Office16\\EXCEL.EXE',
        lastOpened: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        size: '45 MB'
      },
      {
        name: 'QuickBooks Enterprise',
        version: '23.0.8',
        bundleId: 'Intuit.QuickBooks.Enterprise',
        path: 'C:\\Program Files\\Intuit\\QuickBooks Enterprise Solutions 23.0\\QBW.exe',
        lastOpened: new Date(Date.now() - 14400000).toISOString(), // 4 hours ago
        size: '1.8 GB'
      },
      {
        name: 'Adobe Acrobat Pro DC',
        version: '2023.008.20458',
        bundleId: 'Adobe.Acrobat.Pro.DC',
        path: 'C:\\Program Files\\Adobe\\Acrobat DC\\Acrobat\\Acrobat.exe',
        lastOpened: new Date(Date.now() - 21600000).toISOString(), // 6 hours ago
        size: '2.1 GB'
      },
      {
        name: 'Google Chrome',
        version: '120.0.6099.129',
        bundleId: 'Google.Chrome',
        path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        lastOpened: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        size: '285 MB'
      }
    ]
  },

  // Windows Device 2 - Sales Representative
  'LT-SAL-007': {
    id: 'LT-SAL-007',
    name: 'Marcus Thompson',
    model: 'Lenovo ThinkPad X1 Carbon Gen 11',
    os: 'Windows 11 Pro 23H2 (Build 22631.2861)',
    lastSeen: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
    status: 'online',
    uptime: '18 days, 4 hours',
    location: 'Sales',
    serialNumber: 'LT-SAL-007',
    assetTag: 'WIN-002',
    ipAddress: '10.0.2.47',
    macAddress: '48:2A:E3:4F:7D:C1',
    totalEvents: 1756,
    lastEventTime: new Date(Date.now() - 600000).toISOString(),
    
    processor: 'Intel Core i7-1365U @ 1.30GHz',
    processorSpeed: '1.30 GHz',
    cores: 10,
    memory: '16 GB LPDDR5',
    availableRAM: '9.8 GB',
    memorySlots: 'Soldered (non-upgradeable)',
    storage: '512 GB NVMe SSD',
    availableStorage: '280 GB',
    storageType: 'NVMe SSD',
    graphics: 'Intel Iris Xe Graphics',
    vram: 'Shared',
    resolution: '2880 x 1800',
    architecture: 'x64',
    diskUtilization: 45,
    memoryUtilization: 38,
    cpuUtilization: 22,
    temperature: 51,
    batteryLevel: 68,
    bootTime: new Date(Date.now() - 1555200000).toISOString(), // 18 days ago
    
    networkInterfaces: [
      {
        name: 'Wi-Fi',
        type: 'Wi-Fi',
        status: 'Connected',
        ipAddress: '10.0.2.47',
        macAddress: '48:2A:E3:4F:7D:C1',
        gateway: '10.0.2.1',
        dns: ['10.0.1.10', '1.1.1.1'],
        speed: '802.11ax (600 Mbps)'
      },
      {
        name: 'Ethernet',
        type: 'Ethernet',
        status: 'Inactive',
        ipAddress: null,
        macAddress: '48:2A:E3:4F:7D:C2',
        gateway: null,
        dns: [],
        speed: null
      }
    ],
    
    securityFeatures: {
      bitlocker: { enabled: true, status: 'Encrypted' },
      windowsDefender: { enabled: true, status: 'Active' },
      firewall: { enabled: true, status: 'Active' },
      uac: { enabled: true, status: 'Enabled' },
      windowsUpdates: { enabled: true, status: 'Up to date' },
      smartScreen: { enabled: true, status: 'Active' },
      tpm: { enabled: true, status: 'Ready', version: '2.0' },
      edr: { installed: true, name: 'CrowdStrike Falcon', status: 'Active', version: '7.18.15105' }
    },
    
    managedInstalls: {
      type: 'Cimian',
      lastRun: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
      nextRun: new Date(Date.now() + 12600000).toISOString(), // 3.5 hours from now
      status: 'Success',
      config: {
        type: 'cimian',
        version: '2.8.2',
        // UI expects these specific property names
        softwareRepoURL: 'https://cimian.ecuad.ca/deployment',
        manifest: 'Assigned/Staff/Sales/B1207/MarcusThompson',
        runType: 'auto',
        lastRun: new Date(Date.now() - 1800000).toISOString(),
        duration: '2m 38s',
        // Based on your provided Cimian config - original property names for reference
        SoftwareRepoURL: 'https://cimian.ecuad.ca/deployment',
        ClientIdentifier: 'Assigned/Staff/Sales/B1207/MarcusThompson',
        CachePath: 'C:\\ProgramData\\ManagedInstalls\\cache',
        CatalogsPath: 'C:\\ProgramData\\ManagedInstalls\\catalogs',
        RepoPath: 'C:\\Users\\mthompson\\DevOps\\Cimian\\deployment',
        DefaultCatalog: 'Production',
        DefaultArch: 'x64',
        CheckOnly: false,
        Debug: false,
        Verbose: false,
        CloudProvider: 'none',
        ForceBasicAuth: false,
        OpenImportedYaml: true,
        InstallPath: '',
        CloudBucket: '',
        LogLevel: ''
      },
      messages: {
        errors: [],
        warnings: []
      },
      packages: [
        {
          name: 'Microsoft Office 365',
          version: '16.0.17029.20108',
          status: 'Installed',
          installDate: new Date(Date.now() - 1555200000).toISOString(), // 18 days ago
          size: '3.2 GB'
        },
        {
          name: 'Salesforce Desktop',
          version: '58.4.0',
          status: 'Installed',
          installDate: new Date(Date.now() - 1209600000).toISOString(), // 2 weeks ago
          size: '145 MB'
        },
        {
          name: 'Microsoft Teams',
          version: '1.6.00.32562',
          status: 'Installed',
          installDate: new Date(Date.now() - 2628000000).toISOString(), // 1 month ago
          size: '312 MB'
        },
        {
          name: 'Zoom Client',
          version: '5.16.10.24060',
          status: 'Installed',
          installDate: new Date(Date.now() - 604800000).toISOString(), // 1 week ago
          size: '165 MB'
        }
      ]
    },
    
    applications: [
      {
        name: 'Microsoft Outlook',
        version: '16.0.17029.20108',
        bundleId: 'Microsoft.Office.Outlook',
        path: 'C:\\Program Files\\Microsoft Office\\root\\Office16\\OUTLOOK.EXE',
        lastOpened: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
        size: '52 MB'
      },
      {
        name: 'Salesforce Desktop',
        version: '58.4.0',
        bundleId: 'Salesforce.Desktop',
        path: 'C:\\Users\\marcus.thompson\\AppData\\Local\\Programs\\SalesforceDesktop\\Salesforce.exe',
        lastOpened: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
        size: '145 MB'
      },
      {
        name: 'Microsoft Teams',
        version: '1.6.00.32562',
        bundleId: 'Microsoft.Teams',
        path: 'C:\\Users\\marcus.thompson\\AppData\\Local\\Microsoft\\Teams\\current\\Teams.exe',
        lastOpened: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        size: '312 MB'
      },
      {
        name: 'Google Chrome',
        version: '120.0.6099.129',
        bundleId: 'Google.Chrome',
        path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        lastOpened: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
        size: '285 MB'
      }
    ]
  },

  // Windows Device 3 - IT Technician
  'WS-IT-003': {
    id: 'WS-IT-003',
    name: 'Ryan Martinez',
    model: 'HP Z4 G5 Workstation',
    os: 'Windows 11 Pro 23H2 (Build 22631.2861)',
    lastSeen: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    status: 'warning',
    uptime: '3 days, 22 hours',
    location: 'IT Department',
    serialNumber: 'WS-IT-003',
    assetTag: 'WIN-003',
    ipAddress: '192.168.1.203',
    macAddress: '94:C6:91:1A:2F:8E',
    totalEvents: 2945,
    lastEventTime: new Date(Date.now() - 7200000).toISOString(),
    
    processor: 'Intel Xeon W-2245 @ 3.90GHz',
    memory: '64 GB DDR4 ECC',
    storage: '2 TB NVMe SSD',
    graphics: 'NVIDIA Quadro RTX 4000',
    diskUtilization: 63,
    memoryUtilization: 71,
    cpuUtilization: 35,
    temperature: 62,
    batteryLevel: null, // Desktop workstation
    bootTime: new Date(Date.now() - 340800000).toISOString(), // 3 days ago
    
    networkInterfaces: [
      {
        name: 'Ethernet',
        type: 'Ethernet',
        status: 'Connected',
        ipAddress: '192.168.1.203',
        macAddress: '94:C6:91:1A:2F:8E',
        gateway: '192.168.1.1',
        dns: ['192.168.1.10', '192.168.1.11'],
        speed: '1 Gbps'
      },
      {
        name: 'Management Interface',
        type: 'Ethernet',
        status: 'Connected',
        ipAddress: '192.168.100.203',
        macAddress: '94:C6:91:1A:2F:8F',
        gateway: '192.168.100.1',
        dns: ['192.168.100.10'],
        speed: '100 Mbps'
      }
    ],
    
    securityFeatures: {
      bitlocker: { enabled: true, status: 'Encrypted' },
      windowsDefender: { enabled: false, status: 'Disabled' },
      firewall: { enabled: true, status: 'Active' },
      uac: { enabled: false, status: 'Disabled' },
      windowsUpdates: { enabled: false, status: 'Manual' },
      smartScreen: { enabled: false, status: 'Disabled' },
      tpm: { enabled: true, status: 'Ready', version: '2.0' },
      edr: { installed: false, name: null, status: 'Not Installed', version: null }
    },
    
    managedInstalls: {
      type: 'Cimian',
      lastRun: new Date(Date.now() - 21600000).toISOString(), // 6 hours ago
      nextRun: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      status: 'Error',
      config: {
        type: 'cimian',
        version: '2.7.9',
        // UI expects these specific property names
        softwareRepoURL: 'https://cimian.ecuad.ca/deployment',
        manifest: 'Assigned/Staff/IT/B1115/RyanMartinez',
        runType: 'manual',
        lastRun: new Date(Date.now() - 21600000).toISOString(),
        duration: '8m 42s',
        // Based on your provided Cimian config - original property names for reference
        SoftwareRepoURL: 'https://cimian.ecuad.ca/deployment',
        ClientIdentifier: 'Assigned/Staff/IT/B1115/RyanMartinez',
        CachePath: 'C:\\ProgramData\\ManagedInstalls\\cache',
        CatalogsPath: 'C:\\ProgramData\\ManagedInstalls\\catalogs',
        RepoPath: 'C:\\Users\\rmartinez\\DevOps\\Cimian\\deployment',
        DefaultCatalog: 'Development',
        DefaultArch: 'x64',
        CheckOnly: false,
        Debug: true,
        Verbose: true,
        CloudProvider: 'none',
        ForceBasicAuth: false,
        OpenImportedYaml: true,
        InstallPath: '',
        CloudBucket: '',
        LogLevel: 'debug'
      },
      messages: {
        errors: [
          {
            id: 'err-003',
            package: 'VMware vSphere Client',
            message: 'Installation failed: Service dependency error',
            details: 'Failed to start VMware Authorization Service. Error code: 0x80070005 - Access is denied.',
            timestamp: new Date(Date.now() - 21600000).toISOString() // 6 hours ago
          },
          {
            id: 'err-004',
            package: 'SCCM Client',
            message: 'Configuration sync failed',
            details: 'Unable to contact SCCM management point. Certificate validation failed.',
            timestamp: new Date(Date.now() - 10800000).toISOString() // 3 hours ago
          }
        ],
        warnings: [
          {
            id: 'warn-005',
            package: 'Windows Server RSAT',
            message: 'Feature compatibility warning',
            details: 'Some RSAT features may not work correctly with the current Windows build.',
            timestamp: new Date(Date.now() - 43200000).toISOString() // 12 hours ago
          }
        ]
      },
      packages: [
        {
          name: 'Microsoft System Center Configuration Manager',
          version: '5.2107.1059.1000',
          status: 'Failed',
          installDate: null,
          size: '195 MB'
        },
        {
          name: 'VMware vSphere Client',
          version: '8.0.0.21345',
          status: 'Failed',
          installDate: null,
          size: '485 MB'
        },
        {
          name: 'Windows Server RSAT',
          version: '1809.0.17763.1',
          status: 'Installed',
          installDate: new Date(Date.now() - 1209600000).toISOString(), // 2 weeks ago
          size: '125 MB'
        },
        {
          name: 'PowerShell 7',
          version: '7.4.0',
          status: 'Installed',
          installDate: new Date(Date.now() - 2628000000).toISOString(), // 1 month ago
          size: '85 MB'
        }
      ]
    },
    
    applications: [
      {
        name: 'Windows PowerShell ISE',
        version: '10.0.22621.1',
        bundleId: 'Microsoft.PowerShell.ISE',
        path: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\PowerShell_ISE.exe',
        lastOpened: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
        size: '15 MB'
      },
      {
        name: 'Remote Desktop Connection Manager',
        version: '2.90.0',
        bundleId: 'Microsoft.RDCMan',
        path: 'C:\\Program Files\\Microsoft\\Remote Desktop Connection Manager\\RDCMan.exe',
        lastOpened: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        size: '8 MB'
      },
      {
        name: 'Wireshark',
        version: '4.2.0',
        bundleId: 'Wireshark.Wireshark',
        path: 'C:\\Program Files\\Wireshark\\Wireshark.exe',
        lastOpened: new Date(Date.now() - 14400000).toISOString(), // 4 hours ago
        size: '145 MB'
      },
      {
        name: 'Microsoft Visual Studio Code',
        version: '1.85.2',
        bundleId: 'Microsoft.VisualStudioCode',
        path: 'C:\\Users\\ryan.martinez\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe',
        lastOpened: new Date(Date.now() - 21600000).toISOString(), // 6 hours ago
        size: '285 MB'
      }
    ]
  }
}

// Mock events data for each device
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const eventsDatabase: Record<string, any[]> = {
  'JY93C5YGGM': [
    {
      id: 'evt-001',
      ts: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
      kind: 'Software Update',
      device: 'JY93C5YGGM',
      payload: {
        package: 'Adobe Photoshop 2024',
        version: '25.2.0',
        status: 'completed'
      }
    },
    {
      id: 'evt-002',
      ts: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      kind: 'Login',
      device: 'JY93C5YGGM',
      payload: {
        user: 'celeste.martin',
        method: 'password',
        ip_address: '108.172.84.175'
      }
    },
    {
      id: 'evt-003',
      ts: new Date(Date.now() - 14400000).toISOString(), // 4 hours ago
      kind: 'Network Change',
      device: 'JY93C5YGGM',
      payload: {
        interface: 'Wi-Fi',
        old_ip: '108.172.84.174',
        new_ip: '108.172.84.175',
        ssid: 'Company-WiFi'
      }
    }
  ],
  'FVFXQ2P3JM': [
    {
      id: 'evt-004',
      ts: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
      kind: 'Application Launch',
      device: 'FVFXQ2P3JM',
      payload: {
        application: 'Docker Desktop',
        version: '4.26.1',
        user: 'alex.chen'
      }
    },
    {
      id: 'evt-005',
      ts: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      kind: 'Error',
      device: 'FVFXQ2P3JM',
      payload: {
        source: 'Docker Desktop',
        message: 'Container failed to start',
        details: 'Port 3000 already in use'
      }
    },
    {
      id: 'evt-006',
      ts: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
      kind: 'Software Install',
      device: 'FVFXQ2P3JM',
      payload: {
        package: 'Node.js LTS',
        version: '20.10.0',
        status: 'completed'
      }
    }
  ],
  'C02ZK8WVLVDQ': [
    {
      id: 'evt-007',
      ts: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
      kind: 'Logout',
      device: 'C02ZK8WVLVDQ',
      payload: {
        user: 'sarah.johnson',
        session_duration: '8h 32m'
      }
    },
    {
      id: 'evt-008',
      ts: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      kind: 'Error',
      device: 'C02ZK8WVLVDQ',
      payload: {
        source: 'System Update',
        message: 'Network timeout during download',
        details: 'Failed to download macOS 15.2.0 update'
      }
    }
  ],
  'WS-ACC-001': [
    {
      id: 'evt-009',
      ts: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      kind: 'Application Launch',
      device: 'WS-ACC-001',
      payload: {
        application: 'QuickBooks Enterprise',
        version: '23.0.8',
        user: 'jennifer.davis'
      }
    },
    {
      id: 'evt-010',
      ts: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      kind: 'Warning',
      device: 'WS-ACC-001',
      payload: {
        source: 'QuickBooks Enterprise',
        message: 'License expiration warning',
        details: 'License expires in 15 days'
      }
    },
    {
      id: 'evt-011',
      ts: new Date(Date.now() - 14400000).toISOString(), // 4 hours ago
      kind: 'Login',
      device: 'WS-ACC-001',
      payload: {
        user: 'jennifer.davis',
        method: 'domain',
        ip_address: '192.168.1.156'
      }
    }
  ],
  'LT-SAL-007': [
    {
      id: 'evt-012',
      ts: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
      kind: 'Network Change',
      device: 'LT-SAL-007',
      payload: {
        interface: 'Wi-Fi',
        old_ip: '10.0.2.46',
        new_ip: '10.0.2.47',
        ssid: 'Company-Guest'
      }
    },
    {
      id: 'evt-013',
      ts: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
      kind: 'Software Update',
      device: 'LT-SAL-007',
      payload: {
        package: 'Zoom Client',
        version: '5.16.10.24060',
        status: 'completed'
      }
    },
    {
      id: 'evt-014',
      ts: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      kind: 'Application Launch',
      device: 'LT-SAL-007',
      payload: {
        application: 'Microsoft Teams',
        version: '1.6.00.32562',
        user: 'marcus.thompson'
      }
    }
  ],
  'WS-IT-003': [
    {
      id: 'evt-015',
      ts: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      kind: 'Application Launch',
      device: 'WS-IT-003',
      payload: {
        application: 'Remote Desktop Connection Manager',
        version: '2.90.0',
        user: 'ryan.martinez'
      }
    },
    {
      id: 'evt-016',
      ts: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
      kind: 'Error',
      device: 'WS-IT-003',
      payload: {
        source: 'SCCM Client',
        message: 'Configuration sync failed',
        details: 'Unable to contact SCCM management point'
      }
    },
    {
      id: 'evt-017',
      ts: new Date(Date.now() - 21600000).toISOString(), // 6 hours ago
      kind: 'Error',
      device: 'WS-IT-003',
      payload: {
        source: 'VMware vSphere Client',
        message: 'Installation failed',
        details: 'Service dependency error - Access denied'
      }
    }
  ]
}

export async function GET(
  request: Request,
  { params }: { params: { deviceId: string } }
) {
  const { deviceId } = await params
  
  if (!deviceDatabase[deviceId]) {
    return NextResponse.json({ error: 'Device not found' }, { status: 404 })
  }

  const deviceInfo = deviceDatabase[deviceId]
  const events = eventsDatabase[deviceId] || []

  // Transform applications data to match interface
  if (deviceInfo.applications && Array.isArray(deviceInfo.applications)) {
    const applications = {
      totalApps: deviceInfo.applications.length,
      installedApps: deviceInfo.applications.map((app: any, index: number) => ({
        id: app.bundleId || `app-${index}`,
        name: app.name,
        displayName: app.name,
        path: app.path,
        version: app.version,
        bundle_version: app.version,
        last_modified: app.lastOpened ? Math.floor(new Date(app.lastOpened).getTime() / 1000) : Math.floor(Date.now() / 1000),
        obtained_from: 'Unknown',
        runtime_environment: '',
        info: '',
        has64bit: true,
        signed_by: '',
        publisher: '',
        category: ''
      }))
    }
    deviceInfo.applications = applications
  }

  // Transform security features to match interface
  if (deviceInfo.securityFeatures) {
    const security = {
      gatekeeper: deviceInfo.securityFeatures.gatekeeper?.status,
      sip: deviceInfo.securityFeatures.sip?.status,
      filevault_status: deviceInfo.securityFeatures.filevault?.enabled,
      firewall_state: deviceInfo.securityFeatures.firewall?.enabled ? '1' : '0',
      ssh_groups: '',
      ssh_users: '',
      ard_groups: '',
      root_user: 'Disabled',
      ard_users: '',
      firmwarepw: '',
      skel_state: '',
      t2_secureboot: '',
      t2_externalboot: '',
      activation_lock: 'Disabled',
      filevault_users: '',
      as_security_mode: ''
    }
    deviceInfo.security = security
  }

  // Transform network interfaces to match interface
  if (deviceInfo.networkInterfaces && Array.isArray(deviceInfo.networkInterfaces)) {
    const primaryInterface = deviceInfo.networkInterfaces.find((iface: any) => iface.status === 'Connected') || deviceInfo.networkInterfaces[0]
    if (primaryInterface) {
      const network = {
        hostname: deviceInfo.name.toLowerCase().replace(/\s+/g, '-'),
        connectionType: primaryInterface.type,
        ssid: primaryInterface.type === 'Wi-Fi' ? 'Company-WiFi' : null,
        signalStrength: primaryInterface.type === 'Wi-Fi' ? '-45 dBm' : null,
        service: primaryInterface.name,
        status: primaryInterface.status === 'Connected' ? 1 : 0,
        ethernet: primaryInterface.type === 'Ethernet' ? primaryInterface.name : '',
        clientid: deviceInfo.id,
        ipv4conf: 'DHCP',
        ipv4ip: primaryInterface.ipAddress,
        ipv4mask: '255.255.255.0',
        ipv4router: primaryInterface.gateway,
        ipv6conf: '',
        ipv6ip: '',
        ipv6prefixlen: 0,
        ipv6router: '',
        ipv4dns: Array.isArray(primaryInterface.dns) ? primaryInterface.dns.join(', ') : '',
        vlans: '',
        activemtu: 1500,
        validmturange: '1280-1500',
        currentmedia: '',
        activemedia: '',
        searchdomain: 'company.local',
        externalip: '',
        location: '',
        airdrop_channel: '',
        airdrop_supported: false,
        wow_supported: false,
        supported_channels: '',
        supported_phymodes: '',
        wireless_card_type: '',
        country_code: 'US',
        firmware_version: '',
        wireless_locale: ''
      }
      deviceInfo.network = network
    }
  }

  // Transform managed installs data to match interface
  if (deviceInfo.managedInstalls && deviceInfo.managedInstalls.packages) {
    deviceInfo.managedInstalls.packages = deviceInfo.managedInstalls.packages.map((pkg: any, index: number) => ({
      id: `pkg-${index}`,
      name: pkg.name,
      displayName: pkg.name,
      version: pkg.version,
      status: pkg.status.toLowerCase().replace(' ', '_'),
      lastUpdate: pkg.installDate,
      size: pkg.size && typeof pkg.size === 'string' ? parseInt(pkg.size.replace(/[^\d]/g, '')) : (typeof pkg.size === 'number' ? pkg.size : undefined),
      type: deviceInfo.managedInstalls.type.toLowerCase(),
      description: '',
      publisher: '',
      category: ''
    }))
    
    // Add summary fields
    deviceInfo.managedInstalls.totalPackages = deviceInfo.managedInstalls.packages.length
    deviceInfo.managedInstalls.installed = deviceInfo.managedInstalls.packages.filter((p: any) => p.status === 'installed').length
    deviceInfo.managedInstalls.pending = deviceInfo.managedInstalls.packages.filter((p: any) => p.status.includes('pending')).length
    deviceInfo.managedInstalls.failed = deviceInfo.managedInstalls.packages.filter((p: any) => p.status.includes('failed')).length
  }

  return NextResponse.json({
    deviceInfo,
    events
  })
}
