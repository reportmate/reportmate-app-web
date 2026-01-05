/**
 * Inventory Info Module
 * Handles all inventory/asset data extraction in isolation
 * 
 * SNAKE_CASE: All properties match API response format directly
 */

export interface InventoryInfo {
  device_name?: string
  location?: string
  asset_tag?: string
  department?: string
  owner?: string
  purchase_date?: string
  warranty_expiration?: string
  vendor?: string
  model?: string
  serial_number?: string
  description?: string
  uuid?: string
  usage?: string
  catalog?: string
  collected_at?: string
  device_id?: string
  module_id?: string
}

/**
 * Extract inventory information from device modules
 * MODULAR: Self-contained inventory data processing
 * Returns data in snake_case format matching API
 */
export function extractInventory(inventoryData: any): InventoryInfo {
  if (!inventoryData) {
    console.log('[INVENTORY MODULE] No inventory data found')
    return {}
  }

  // Handle both direct inventory data and nested modules structure
  const inventory = inventoryData.inventory || inventoryData
  
  console.log('[INVENTORY MODULE] Processing inventory data:', {
    has_device_name: !!inventory.device_name,
    has_location: !!inventory.location,
    has_asset_tag: !!inventory.asset_tag,
    has_owner: !!inventory.owner,
    device_name: inventory.device_name,
    rawData: inventory
  })

  // Return inventory data directly - already in snake_case from API
  const inventoryInfo: InventoryInfo = {}

  if (inventory.device_name) inventoryInfo.device_name = inventory.device_name
  if (inventory.location) inventoryInfo.location = inventory.location
  if (inventory.asset_tag) inventoryInfo.asset_tag = inventory.asset_tag
  if (inventory.department) inventoryInfo.department = inventory.department
  if (inventory.owner) inventoryInfo.owner = inventory.owner
  if (inventory.purchase_date) inventoryInfo.purchase_date = inventory.purchase_date
  if (inventory.warranty_expiration) inventoryInfo.warranty_expiration = inventory.warranty_expiration
  if (inventory.vendor) inventoryInfo.vendor = inventory.vendor
  if (inventory.model) inventoryInfo.model = inventory.model
  if (inventory.serial_number) inventoryInfo.serial_number = inventory.serial_number
  if (inventory.description) inventoryInfo.description = inventory.description
  if (inventory.uuid) inventoryInfo.uuid = inventory.uuid
  if (inventory.usage) inventoryInfo.usage = inventory.usage
  if (inventory.catalog) inventoryInfo.catalog = inventory.catalog
  if (inventory.collected_at) inventoryInfo.collected_at = inventory.collected_at
  if (inventory.device_id) inventoryInfo.device_id = inventory.device_id
  if (inventory.module_id) inventoryInfo.module_id = inventory.module_id

  console.log('[INVENTORY MODULE] Inventory info extracted:', {
    keys: Object.keys(inventoryInfo),
    device_name: inventoryInfo.device_name,
    fullObject: inventoryInfo
  })
  return inventoryInfo
}
