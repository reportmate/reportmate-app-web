export function formatRelativeTime(timestamp: string): string {
  if (!timestamp || timestamp === 'null' || timestamp === 'undefined' || timestamp.trim() === '') {
    return 'never'
  }

  const now = new Date()
  const eventTime = new Date(timestamp)
  
  // Check if the date is valid
  if (isNaN(eventTime.getTime())) {
    console.warn('Invalid timestamp provided to formatRelativeTime:', timestamp)
    return 'unknown'
  }

  const diffInMs = now.getTime() - eventTime.getTime()
  
  // Handle future dates or invalid calculations
  if (diffInMs < 0) {
    console.warn('Future timestamp provided to formatRelativeTime:', timestamp)
    return 'just now'
  }
  
  const diffInSeconds = Math.floor(diffInMs / 1000)
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  const diffInHours = Math.floor(diffInMinutes / 60)
  const diffInDays = Math.floor(diffInHours / 24)

  // Extra safety check for NaN values
  if (isNaN(diffInSeconds) || isNaN(diffInMinutes) || isNaN(diffInHours) || isNaN(diffInDays)) {
    console.warn('NaN detected in time calculation for timestamp:', timestamp)
    return 'unknown'
  }

  if (diffInSeconds < 10) {
    return 'just now'
  } else if (diffInSeconds < 60) {
    return `${diffInSeconds} seconds ago`
  } else if (diffInMinutes < 60) {
    return diffInMinutes === 1 ? '1 minute ago' : `${diffInMinutes} minutes ago`
  } else if (diffInHours < 24) {
    return diffInHours === 1 ? '1 hour ago' : `${diffInHours} hours ago`
  } else {
    return diffInDays === 1 ? '1 day ago' : `${diffInDays} days ago`
  }
}

export function formatExactTime(timestamp: string | number): string {
  try {
    if (!timestamp || timestamp === '' || timestamp === 'null' || timestamp === 'undefined') {
      return 'Unknown'
    }
    
    let date: Date
    
    // Handle Unix timestamp (number or string of digits, possibly with decimals)
    if (typeof timestamp === 'number' || /^[\d.]+$/.test(String(timestamp))) {
      const tsStr = String(timestamp)
      // Parse as float to handle decimals like "1765940509.72615"
      const ts = parseFloat(tsStr)
      if (isNaN(ts)) {
        return 'Unknown'
      }
      // If timestamp is in seconds (Unix - typically 10 digits before decimal), convert to ms
      // Unix timestamps are typically 10 digits, ms timestamps are 13 digits
      if (ts < 10000000000) {
        date = new Date(ts * 1000)
      } else {
        date = new Date(ts)
      }
    } else {
      // Try parsing as ISO date string
      date = new Date(timestamp)
    }
    
    if (isNaN(date.getTime()) || date.getFullYear() < 2000) {
      return 'Unknown'
    }
    
    // Format as YYYY.MM.DD HH:MM:ss
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    
    return `${year}.${month}.${day} ${hours}:${minutes}:${seconds}`
  } catch (_error) {
    console.error('[TIME UTIL] Failed to format timestamp:', _error)
    return 'Unknown'
  }
}

// Format boot time in simple format (e.g., "Jan 14, 2026 11:32 PM")
export function formatBootTime(timestamp: string | number): string {
  try {
    if (!timestamp || timestamp === '' || timestamp === 'null' || timestamp === 'undefined') {
      return 'Unknown'
    }
    
    let date: Date
    
    // Handle Unix timestamp (number or string of digits, possibly with decimals)
    if (typeof timestamp === 'number' || /^[\d.]+$/.test(String(timestamp))) {
      const ts = parseFloat(String(timestamp))
      if (isNaN(ts)) {
        return 'Unknown'
      }
      // If timestamp is in seconds (Unix), convert to ms
      if (ts < 10000000000) {
        date = new Date(ts * 1000)
      } else {
        date = new Date(ts)
      }
    } else {
      // Try parsing as ISO date string
      date = new Date(timestamp)
    }
    
    if (isNaN(date.getTime()) || date.getFullYear() < 2000) {
      return 'Unknown'
    }
    
    // Format as "Jan 14, 2026 11:32 PM"
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  } catch (_error) {
    console.error('[TIME UTIL] Failed to format boot time:', _error)
    return 'Unknown'
  }
}

// Parse install time for sorting (returns Unix timestamp in ms)
export function parseInstallTime(timestamp: string | number | undefined): number {
  if (!timestamp || timestamp === '' || timestamp === 'null' || timestamp === 'undefined') {
    return 0
  }
  
  try {
    // Handle Unix timestamp (number or string of digits, possibly with decimals)
    if (typeof timestamp === 'number' || /^[\d.]+$/.test(String(timestamp))) {
      const ts = parseFloat(String(timestamp))
      if (isNaN(ts)) return 0
      // If timestamp is in seconds (Unix), convert to ms
      if (ts < 10000000000) {
        return ts * 1000
      }
      return ts
    }
    
    // Try parsing as ISO date string
    const date = new Date(timestamp)
    if (!isNaN(date.getTime())) {
      return date.getTime()
    }
  } catch {
    // Fall through
  }
  
  return 0
}

/**
 * Fix Cimian timestamps that are incorrectly formatted.
 * Cimian has a bug where it writes local time with "Z" suffix (claiming UTC)
 * when it's actually Pacific time. This function detects and corrects those timestamps.
 * 
 * Note: This is a temporary workaround until the Cimian client is fixed.
 */
export function normalizeCimianTimestamp(timestamp: string | undefined): string {
  if (!timestamp || timestamp === '' || timestamp === 'null' || timestamp === 'undefined') {
    return ''
  }
  
  try {
    // For timestamps that already have proper timezone offset, just normalize
    if (timestamp.includes('-08:00') || timestamp.includes('-07:00') || timestamp.includes('+')) {
      const date = new Date(timestamp)
      if (!isNaN(date.getTime())) {
        return date.toISOString()
      }
    }
    
    // For timestamps ending with "Z" that Cimian incorrectly generated
    if (timestamp.endsWith('Z')) {
      const parsedDate = new Date(timestamp)
      const now = new Date()
      
      if (!isNaN(parsedDate.getTime())) {
        const hoursDiff = (now.getTime() - parsedDate.getTime()) / (1000 * 60 * 60)
        
        // If 6-10 hours "old", it's the timezone bug - treat as local time
        if (hoursDiff >= 6 && hoursDiff <= 10) {
          const localTimeStr = timestamp.slice(0, -1) // Remove "Z"
          const localDate = new Date(localTimeStr)
          if (!isNaN(localDate.getTime())) {
            return localDate.toISOString()
          }
        }
      }
    }
    
    return timestamp
  } catch {
    return timestamp
  }
}
