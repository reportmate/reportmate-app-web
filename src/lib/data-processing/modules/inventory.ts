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
 * Supports both snake_case (osquery/new) and camelCase (legacy) formats
 */
export function extractInventory(inventoryData: any): InventoryInfo {
  if (!inventoryData) {
        return {}
  }

  // Handle both direct inventory data and nested modules structure
  const inventory = inventoryData.inventory || inventoryData
  
  
  const inventoryInfo: InventoryInfo = {}

  // Basic inventory fields - support both snake_case (new) and camelCase (legacy)
  // Fallback chain: inventory.deviceName → hardware.system.computer_name → hardware.system.hostname → network.hostname
  const deviceName = inventory.device_name || inventory.deviceName
    || inventoryData.hardware?.system?.computer_name
    || inventoryData.hardware?.system?.hostname
    || inventoryData.network?.hostname
  const assetTag = inventory.asset_tag || inventory.assetTag
  const serialNumber = inventory.serial_number || inventory.serialNumber
  const purchaseDate = inventory.purchase_date || inventory.purchaseDate
  const warrantyExpiration = inventory.warranty_expiration || inventory.warrantyExpiration

  if (deviceName) inventoryInfo.deviceName = deviceName
  if (inventory.location) inventoryInfo.location = inventory.location
  if (assetTag) inventoryInfo.assetTag = assetTag
  if (inventory.department) inventoryInfo.department = inventory.department
  if (inventory.owner) inventoryInfo.owner = inventory.owner
  if (purchaseDate) inventoryInfo.purchaseDate = purchaseDate
  if (warrantyExpiration) inventoryInfo.warrantyExpiration = warrantyExpiration
  if (inventory.vendor) inventoryInfo.vendor = inventory.vendor
  if (inventory.model) inventoryInfo.model = inventory.model
  if (serialNumber) inventoryInfo.serialNumber = serialNumber
  if (inventory.description) inventoryInfo.description = inventory.description

    return inventoryInfo
}
