/**
 * Platform-aware security utilities
 * Provides dynamic security feature detection and display based on device platform
 */

// Platform detection utilities
export const detectPlatform = (device: any): 'windows' | 'macos' | 'linux' | 'unknown' => {
  const platform = device?.platform?.toLowerCase() || '';
  const os = device?.os?.toLowerCase() || device?.osName?.toLowerCase() || '';
  
  if (platform.includes('windows') || os.includes('windows')) {
    return 'windows';
  }
  if (platform.includes('mac') || os.includes('mac') || platform.includes('darwin') || os.includes('darwin')) {
    return 'macos';
  }
  if (platform.includes('linux') || os.includes('linux') || platform.includes('ubuntu') || os.includes('ubuntu')) {
    return 'linux';
  }
  
  return 'unknown';
};

// Windows-specific security interfaces
export interface WindowsSecurityData {
  tpm?: {
    version?: string;
    isEnabled?: boolean;
    isPresent?: boolean;
    isActivated?: boolean;
    manufacturer?: string;
  };
  firewall?: {
    rules?: any[];
    profile?: string;
    isEnabled?: boolean;
  };
  antivirus?: {
    name?: string;
    version?: string;
    lastScan?: string;
    scanType?: string;
    isEnabled?: boolean;
    isUpToDate?: boolean;
    lastUpdate?: string;
  };
  encryption?: {
    bitLocker?: {
      status?: string;
      isEnabled?: boolean;
      recoveryKeyId?: string;
      encryptedDrives?: string[];
    };
    deviceEncryption?: boolean;
    encryptedVolumes?: Array<{
      status?: string;
      driveLetter?: string;
      encryptionMethod?: string;
      encryptionPercentage?: number;
    }>;
  };
  securityUpdates?: Array<{
    id?: string;
    title?: string;
    status?: string;
    severity?: string;
    installDate?: string;
  }>;
  windowsDefender?: {
    isEnabled?: boolean;
    realTimeProtection?: boolean;
    definitionsVersion?: string;
    lastDefinitionUpdate?: string;
  };
  uac?: {
    isEnabled?: boolean;
    level?: string;
  };
  smartScreen?: {
    isEnabled?: boolean;
    level?: string;
  };
}

// macOS-specific security interfaces
export interface MacOSSecurityData {
  gatekeeper?: {
    status?: string;
    isEnabled?: boolean;
  };
  sip?: {
    status?: string;
    isEnabled?: boolean;
  };
  filevault?: {
    status?: boolean;
    isEnabled?: boolean;
    users?: string;
  };
  firewall?: {
    state?: string;
    isEnabled?: boolean;
    stealthMode?: boolean;
  };
  xprotect?: {
    version?: string;
    lastUpdate?: string;
    isEnabled?: boolean;
  };
  secureboot?: {
    t2_secureboot?: string;
    t2_externalboot?: string;
    appleSecurityMode?: string;
  };
  firmwarePassword?: {
    isSet?: boolean;
    status?: string;
  };
  activationLock?: {
    status?: string;
    isEnabled?: boolean;
  };
  userAccess?: {
    rootUser?: string;
    sshGroups?: string;
    sshUsers?: string;
    ardGroups?: string;
    ardUsers?: string;
  };
}

// Linux-specific security interfaces (for future expansion)
export interface LinuxSecurityData {
  selinux?: {
    status?: string;
    mode?: string;
    isEnabled?: boolean;
  };
  apparmor?: {
    status?: string;
    isEnabled?: boolean;
  };
  firewall?: {
    ufw?: {
      status?: string;
      isEnabled?: boolean;
    };
    iptables?: {
      rules?: any[];
      isConfigured?: boolean;
    };
  };
  encryption?: {
    luks?: {
      isEnabled?: boolean;
      encryptedPartitions?: string[];
    };
  };
  updates?: {
    availableUpdates?: number;
    securityUpdates?: number;
    lastUpdate?: string;
  };
}

// Unified security data interface
export interface PlatformSecurityData {
  platform: 'windows' | 'macos' | 'linux' | 'unknown';
  windows?: WindowsSecurityData;
  macos?: MacOSSecurityData;
  linux?: LinuxSecurityData;
  unknown?: any; // For unknown platforms
  lastSecurityScan?: string;
  collectedAt?: string;
}

// Security feature definitions per platform
export const SECURITY_FEATURES = {
  windows: [
    { key: 'antivirus', label: 'Antivirus Protection', priority: 1 },
    { key: 'firewall', label: 'Windows Firewall', priority: 2 },
    { key: 'bitlocker', label: 'BitLocker Encryption', priority: 3 },
    { key: 'tpm', label: 'TPM Security', priority: 4 },
    { key: 'windowsDefender', label: 'Windows Defender', priority: 5 },
    { key: 'uac', label: 'User Account Control', priority: 6 },
    { key: 'smartScreen', label: 'SmartScreen Filter', priority: 7 },
    { key: 'securityUpdates', label: 'Security Updates', priority: 8 },
  ],
  macos: [
    { key: 'filevault', label: 'FileVault Encryption', priority: 1 },
    { key: 'firewall', label: 'macOS Firewall', priority: 2 },
    { key: 'gatekeeper', label: 'Gatekeeper', priority: 3 },
    { key: 'sip', label: 'System Integrity Protection', priority: 4 },
    { key: 'xprotect', label: 'XProtect Antivirus', priority: 5 },
    { key: 'secureboot', label: 'Secure Boot', priority: 6 },
    { key: 'firmwarePassword', label: 'Firmware Password', priority: 7 },
    { key: 'activationLock', label: 'Activation Lock', priority: 8 },
  ],
  linux: [
    { key: 'selinux', label: 'SELinux', priority: 1 },
    { key: 'apparmor', label: 'AppArmor', priority: 2 },
    { key: 'firewall', label: 'Firewall', priority: 3 },
    { key: 'encryption', label: 'Disk Encryption', priority: 4 },
    { key: 'updates', label: 'Security Updates', priority: 5 },
  ],
  unknown: [] as const,
} as const;

// Extract and normalize security data based on platform
export const extractPlatformSecurityData = (device: any): PlatformSecurityData => {
  const platform = detectPlatform(device);
  const security = device?.modules?.security || device?.security || {};
  
  const result: PlatformSecurityData = {
    platform,
    lastSecurityScan: security.lastSecurityScan || security.collectedAt,
    collectedAt: security.collectedAt,
  };

  switch (platform) {
    case 'windows':
      result.windows = {
        tpm: security.tpm,
        firewall: security.firewall,
        antivirus: security.antivirus,
        encryption: security.encryption,
        securityUpdates: security.securityUpdates,
        windowsDefender: security.windowsDefender,
        uac: security.uac,
        smartScreen: security.smartScreen,
      };
      break;
      
    case 'macos':
      result.macos = {
        gatekeeper: {
          status: security.gatekeeper,
          isEnabled: security.gatekeeper === 'Enabled',
        },
        sip: {
          status: security.sip,
          isEnabled: security.sip === 'Enabled',
        },
        filevault: {
          status: security.filevault_status,
          isEnabled: security.filevault_status === true,
          users: security.filevault_users,
        },
        firewall: {
          state: security.firewall_state,
          isEnabled: security.firewall_state === 'On',
        },
        secureboot: {
          t2_secureboot: security.t2_secureboot,
          t2_externalboot: security.t2_externalboot,
          appleSecurityMode: security.as_security_mode,
        },
        firmwarePassword: {
          status: security.firmwarepw,
          isSet: security.firmwarepw === 'Set',
        },
        activationLock: {
          status: security.activation_lock,
          isEnabled: security.activation_lock !== 'Disabled',
        },
        userAccess: {
          rootUser: security.root_user,
          sshGroups: security.ssh_groups,
          sshUsers: security.ssh_users,
          ardGroups: security.ard_groups,
          ardUsers: security.ard_users,
        },
      };
      break;
      
    case 'linux':
      result.linux = {
        // Linux security data would be extracted here when available
        selinux: security.selinux,
        apparmor: security.apparmor,
        firewall: security.firewall,
        encryption: security.encryption,
        updates: security.updates,
      };
      break;
  }

  return result;
};

// Get security status with appropriate color coding
export const getSecurityStatus = (feature: any) => {
  if (!feature) {
    return { status: 'Unknown', color: 'text-gray-600 dark:text-gray-400', type: 'warning' as const };
  }

  // Handle different status formats
  let isEnabled = false;
  let statusText = 'Unknown';

  if (typeof feature === 'boolean') {
    isEnabled = feature;
    statusText = isEnabled ? 'Enabled' : 'Disabled';
  } else if (feature.isEnabled !== undefined) {
    isEnabled = feature.isEnabled;
    statusText = isEnabled ? 'Enabled' : 'Disabled';
  } else if (feature.enabled !== undefined) {
    isEnabled = feature.enabled;
    statusText = isEnabled ? 'Enabled' : 'Disabled';
  } else if (feature.status) {
    statusText = feature.status;
    isEnabled = ['enabled', 'active', 'on', 'set', 'running'].includes(feature.status.toLowerCase());
  } else if (typeof feature === 'string') {
    statusText = feature;
    isEnabled = ['enabled', 'active', 'on', 'set', 'running'].includes(feature.toLowerCase());
  }

  return {
    status: statusText,
    color: isEnabled 
      ? 'text-green-600 dark:text-green-400' 
      : 'text-red-600 dark:text-red-400',
    type: isEnabled ? 'success' as const : 'error' as const,
  };
};

// Check if a security feature should be displayed for the platform
export const shouldDisplayFeature = (featureKey: string, platform: string): boolean => {
  const platformFeatures = SECURITY_FEATURES[platform as keyof typeof SECURITY_FEATURES] || [];
  return platformFeatures.some(f => f.key === featureKey);
};

// Get platform-specific security feature label
export const getSecurityFeatureLabel = (featureKey: string, platform: string): string => {
  const platformFeatures = SECURITY_FEATURES[platform as keyof typeof SECURITY_FEATURES] || [];
  const feature = platformFeatures.find(f => f.key === featureKey);
  return feature?.label || featureKey;
};

// Format security data for display
export const formatSecurityValue = (value: any, featureKey: string, platform: string): string => {
  if (!value) return 'N/A';
  
  switch (featureKey) {
    case 'antivirus':
      if (value.name && value.isEnabled) {
        return `${value.name} (Active)`;
      }
      return value.isEnabled ? 'Active' : 'Inactive';
      
    case 'firewall':
      if (platform === 'windows' && value.profile) {
        return value.isEnabled ? `Enabled (${value.profile})` : 'Disabled';
      }
      return value.isEnabled ? 'Enabled' : 'Disabled';
      
    case 'bitlocker':
    case 'filevault':
      if (value.encryptedDrives?.length) {
        return `Enabled (${value.encryptedDrives.length} drives)`;
      }
      return value.isEnabled ? 'Enabled' : 'Disabled';
      
    case 'tpm':
      if (value.version && value.isEnabled) {
        return `Active (v${value.version})`;
      }
      return value.isEnabled && value.isPresent ? 'Active' : 'Inactive';
      
    case 'securityUpdates':
      if (Array.isArray(value)) {
        return `${value.length} installed`;
      }
      return 'Unknown';
      
    default:
      if (typeof value === 'boolean') {
        return value ? 'Enabled' : 'Disabled';
      }
      if (value.isEnabled !== undefined) {
        return value.isEnabled ? 'Enabled' : 'Disabled';
      }
      return String(value);
  }
};
