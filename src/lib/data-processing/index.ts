/**
 * Modular Data Processing - Export Index
 * Centralizes all modular data processing components
 */

// Core modular mapper and utilities
export { mapDeviceData, validateDeviceStructure, type ProcessedDeviceInfo } from './device-mapper-modular'
export { calculateDeviceStatus, normalizeLastSeen, type DeviceStatus } from './device-status'

// All modular data processors - cleaned architecture
export * from './modules'
