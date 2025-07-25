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

export function formatExactTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString()
}
