export function formatRelativeTime(timestamp: string): string {
  const now = new Date()
  const eventTime = new Date(timestamp)
  const diffInMs = now.getTime() - eventTime.getTime()
  const diffInSeconds = Math.floor(diffInMs / 1000)
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  const diffInHours = Math.floor(diffInMinutes / 60)
  const diffInDays = Math.floor(diffInHours / 24)

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
