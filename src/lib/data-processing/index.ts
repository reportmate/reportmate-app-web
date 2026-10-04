/**
 * Modular Data Processing - Export Index
 * Centralizes all modular data processing components
 */

// Core modular mapper and utilities
export { mapDeviceData, validateDeviceStructure, type ProcessedDeviceInfo } from './device-mapper-modular'
export { calculateDeviceStatus, normalizeLastSeen, isStored, reportDeviceStatus, type DeviceStatus, type InventoryState, type ReportDeviceStatus } from './device-status'

// All modular data processors - cleaned architecture
export * from './modules'
