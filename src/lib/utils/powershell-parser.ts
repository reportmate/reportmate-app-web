/**
 * PowerShell object parser utilities
 * Handles parsing and conversion of PowerShell objects and data
 */

/**
 * Convert PowerShell objects from various formats to JavaScript objects
 */
export function convertPowerShellObjects(input: unknown): any {
  if (!input) return null
  
  // If it's already a proper object, return as-is
  if (typeof input === 'object' && !Array.isArray(input)) {
    return input
  }
  
  // If it's a string, try to parse as JSON
  if (typeof input === 'string') {
    try {
      return JSON.parse(input)
    } catch {
      // If JSON parsing fails, try to parse PowerShell-style output
      return parsePowerShellString(input)
    }
  }
  
  // If it's an array, process each item
  if (Array.isArray(input)) {
    return input.map(item => convertPowerShellObjects(item))
  }
  
  return input
}

/**
 * Parse PowerShell string output into structured data
 */
function parsePowerShellString(input: string): any {
  if (!input || typeof input !== 'string') return input
  
  const trimmed = input.trim()
  
  // Handle PowerShell hashtable-like strings
  if (trimmed.startsWith('@{') && trimmed.endsWith('}')) {
    return parsePowerShellHashtable(trimmed)
  }
  
  // Handle PowerShell array-like strings
  if (trimmed.startsWith('@(') && trimmed.endsWith(')')) {
    return parsePowerShellArray(trimmed)
  }
  
  // Handle simple key-value pairs
  if (trimmed.includes(':') && trimmed.includes('\n')) {
    return parseKeyValuePairs(trimmed)
  }
  
  // Handle boolean strings
  if (trimmed.toLowerCase() === 'true') return true
  if (trimmed.toLowerCase() === 'false') return false
  
  // Handle null/empty
  if (trimmed.toLowerCase() === '$null' || trimmed === '') return null
  
  // Handle numbers
  const numberValue = parseFloat(trimmed)
  if (!isNaN(numberValue) && isFinite(numberValue)) {
    return numberValue
  }
  
  return input
}

/**
 * Parse PowerShell hashtable string like "@{key=value; key2=value2}"
 */
function parsePowerShellHashtable(input: string): Record<string, any> {
  const result: Record<string, any> = {}
  
  // Remove outer @{ }
  const content = input.slice(2, -1).trim()
  
  // Split by semicolon, but be careful of nested structures
  const pairs = splitPowerShellPairs(content, ';')
  
  for (const pair of pairs) {
    const equalIndex = pair.indexOf('=')
    if (equalIndex === -1) continue
    
    const key = pair.substring(0, equalIndex).trim()
    const value = pair.substring(equalIndex + 1).trim()
    
    result[key] = convertPowerShellObjects(value)
  }
  
  return result
}

/**
 * Parse PowerShell array string like "@(item1, item2, item3)"
 */
function parsePowerShellArray(input: string): any[] {
  // Remove outer @( )
  const content = input.slice(2, -1).trim()
  
  if (!content) return []
  
  // Split by comma, but be careful of nested structures
  const items = splitPowerShellPairs(content, ',')
  
  return items.map(item => convertPowerShellObjects(item.trim()))
}

/**
 * Parse simple key-value pairs separated by newlines
 */
function parseKeyValuePairs(input: string): Record<string, any> {
  const result: Record<string, any> = {}
  const lines = input.split('\n')
  
  for (const line of lines) {
    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) continue
    
    const key = line.substring(0, colonIndex).trim()
    const value = line.substring(colonIndex + 1).trim()
    
    if (key) {
      result[key] = convertPowerShellObjects(value)
    }
  }
  
  return result
}

/**
 * Split PowerShell pairs while respecting nested structures
 */
function splitPowerShellPairs(content: string, separator: string): string[] {
  const results: string[] = []
  let current = ''
  let depth = 0
  let inQuotes = false
  let quoteChar = ''
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    const prevChar = i > 0 ? content[i - 1] : ''
    
    // Handle quotes
    if ((char === '"' || char === "'") && prevChar !== '\\') {
      if (!inQuotes) {
        inQuotes = true
        quoteChar = char
      } else if (char === quoteChar) {
        inQuotes = false
        quoteChar = ''
      }
    }
    
    // Handle nested structures when not in quotes
    if (!inQuotes) {
      if (char === '{' || char === '(') {
        depth++
      } else if (char === '}' || char === ')') {
        depth--
      }
    }
    
    // Split on separator only when at depth 0 and not in quotes
    if (char === separator && depth === 0 && !inQuotes) {
      results.push(current.trim())
      current = ''
      continue
    }
    
    current += char
  }
  
  // Add the last part
  if (current.trim()) {
    results.push(current.trim())
  }
  
  return results
}

/**
 * Format PowerShell objects for display
 */
export function formatPowerShellValue(value: any): string {
  if (value === null || value === undefined) return 'N/A'
  
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }
  
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return value.length > 0 ? `${value.length} items` : 'None'
    }
    return JSON.stringify(value, null, 2)
  }
  
  return String(value)
}

/**
 * Get nested property from PowerShell object
 */
export function getPowerShellProperty(obj: any, path: string, defaultValue: any = null): any {
  if (!obj) return defaultValue
  
  const keys = path.split('.')
  let current = obj
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key]
    } else {
      return defaultValue
    }
  }
  
  return current
}

/**
 * Check if a PowerShell value represents "true"
 */
export function isPowerShellTrue(value: any): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim()
    return lower === 'true' || lower === 'yes' || lower === '1'
  }
  if (typeof value === 'number') return value !== 0
  return false
}

/**
 * Check if a PowerShell value represents "false" or empty
 */
export function isPowerShellFalse(value: any): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'boolean') return !value
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim()
    return lower === 'false' || lower === 'no' || lower === '0' || lower === '$null' || lower === ''
  }
  if (typeof value === 'number') return value === 0
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

/**
 * Convert snake_case string to camelCase
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * Recursively convert all snake_case keys in an object to camelCase
 * Supports both snake_case (API) and camelCase (legacy) formats
 */
export function normalizeKeys(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj
  
  if (Array.isArray(obj)) {
    return obj.map(item => normalizeKeys(item))
  }
  
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const camelKey = snakeToCamel(key)
      result[camelKey] = normalizeKeys(value)
    }
    return result
  }
  
  return obj
}
