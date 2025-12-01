/**
 * Debug Logger - Production-safe logging utility
 * Only logs in development mode to prevent memory leaks from console statements
 */

const isDevelopment = process.env.NODE_ENV === 'development'
const isVerboseDebug = process.env.NEXT_PUBLIC_VERBOSE_DEBUG === 'true'

interface DebugLogger {
  log: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  debug: (...args: unknown[]) => void
  group: (label: string) => void
  groupEnd: () => void
}

// Throttle map to prevent log spam
const throttleMap = new Map<string, number>()
const THROTTLE_INTERVAL = 5000 // 5 seconds between identical logs

function shouldLog(key: string): boolean {
  const now = Date.now()
  const lastLog = throttleMap.get(key)
  
  if (lastLog && now - lastLog < THROTTLE_INTERVAL) {
    return false
  }
  
  throttleMap.set(key, now)
  
  // Clean up old entries periodically
  if (throttleMap.size > 100) {
    const cutoff = now - THROTTLE_INTERVAL * 2
    for (const [k, v] of throttleMap.entries()) {
      if (v < cutoff) throttleMap.delete(k)
    }
  }
  
  return true
}

function createThrottledLog(level: 'log' | 'warn' | 'error' | 'info' | 'debug') {
  return (...args: unknown[]) => {
    if (!isDevelopment) return
    
    // Create a key from the first argument for throttling
    const key = `${level}:${String(args[0]).slice(0, 100)}`
    
    if (shouldLog(key)) {
      console[level](...args)
    }
  }
}

export const debugLogger: DebugLogger = {
  log: createThrottledLog('log'),
  warn: createThrottledLog('warn'),
  error: (...args: unknown[]) => {
    // Always log errors, but throttle them
    if (shouldLog(`error:${String(args[0]).slice(0, 100)}`)) {
      console.error(...args)
    }
  },
  info: createThrottledLog('info'),
  debug: (...args: unknown[]) => {
    // Only in verbose debug mode
    if (isVerboseDebug && isDevelopment) {
      console.debug(...args)
    }
  },
  group: (label: string) => {
    if (isDevelopment && isVerboseDebug) {
      console.group(label)
    }
  },
  groupEnd: () => {
    if (isDevelopment && isVerboseDebug) {
      console.groupEnd()
    }
  }
}

// No-op logger for production
export const noopLogger: DebugLogger = {
  log: () => {},
  warn: () => {},
  error: () => {},
  info: () => {},
  debug: () => {},
  group: () => {},
  groupEnd: () => {}
}

// Export the appropriate logger based on environment
export const logger = isDevelopment ? debugLogger : noopLogger
