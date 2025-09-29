/**
 * Inventory Info Module
 * Handles all inventory/asset data extraction in isolation
 */

export interface InventoryInfo {
  deviceName?: string
  location?: string
  assetTag?: string
  department?: string
  owner?: string
  purchaseDate?: string
  warrantyExpiration?: string
  vendor?: string
  model?: string
  serialNumber?: string
  description?: string
}

/**
 * Extract inventory information from device modules
 * MODULAR: Self-contained inventory data processing
 */
export function extractInventory(inventoryData: any): InventoryInfo {
  if (!inventoryData) {
    console.log('[INVENTORY MODULE] No inventory data found')
    return {}
  }

  // Handle both direct inventory data and nested modules structure
  const inventory = inventoryData.inventory || inventoryData
  
  console.log('[INVENTORY MODULE] Processing inventory data:', {
    hasDeviceName: !!inventory.deviceName,
    hasLocation: !!inventory.location,
    hasAssetTag: !!inventory.assetTag,
    hasOwner: !!inventory.owner,
    deviceName: inventory.deviceName,
    rawData: inventory
  })

  const inventoryInfo: InventoryInfo = {}

  // Basic inventory fields
  if (inventory.deviceName) inventoryInfo.deviceName = inventory.deviceName
  if (inventory.location) inventoryInfo.location = inventory.location
  if (inventory.assetTag) inventoryInfo.assetTag = inventory.assetTag
  if (inventory.department) inventoryInfo.department = inventory.department
  if (inventory.owner) inventoryInfo.owner = inventory.owner
  if (inventory.purchaseDate) inventoryInfo.purchaseDate = inventory.purchaseDate
  if (inventory.warrantyExpiration) inventoryInfo.warrantyExpiration = inventory.warrantyExpiration
  if (inventory.vendor) inventoryInfo.vendor = inventory.vendor
  if (inventory.model) inventoryInfo.model = inventory.model
  if (inventory.serialNumber) inventoryInfo.serialNumber = inventory.serialNumber
  if (inventory.description) inventoryInfo.description = inventory.description

  console.log('[INVENTORY MODULE] Inventory info extracted:', {
    keys: Object.keys(inventoryInfo),
    deviceName: inventoryInfo.deviceName,
    fullObject: inventoryInfo
  })
  return inventoryInfo
}
