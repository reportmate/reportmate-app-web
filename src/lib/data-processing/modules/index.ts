/**
 * Data Processing Modules - Centralized exports
 * Each module handles one specific data domain following ReportMate's modular architecture
 */

// Applications module
export { extractApplications, type ApplicationInfo, type ApplicationItem } from './applications'

// Events module
export { extractEvents, type EventsInfo, type EventItem } from './events'

// Hardware module
export { extractHardware, type HardwareInfo } from './hardware'

// Identity module
export { 
  extractIdentity,
  type IdentityInfo, 
  type UserAccount, 
  type BTMDBHealth,
  type EnrollmentInfo,
  type EnrollmentType
} from './identity'

// Installs module
export { extractInstalls, type InstallsInfo, type InstallPackage, type StandardInstallStatus } from './installs'

// Inventory module
export { extractInventory, type InventoryInfo } from './inventory'

// Management module
export { extractManagement, type ManagementInfo } from './management'

// Logs module
export { extractLogs, logRootLabel, logProductName, type LogsInfo, type LogRoot, type LogFileEntry, type LogSessionSummary, type LogTail } from './logs'

// Network module
export { extractNetwork, type NetworkInfo, type NetworkInterface } from './network'

// Performance module
export { extractPerformance, type PerformanceInfo } from './performance'

// Peripherals module
export { extractPeripherals, type PeripheralInfo } from './peripherals'

// Profiles module

// Security module
export { extractSecurity, type SecurityInfo } from './security'

// System module
export { extractSystem, type SystemInfo } from './system'