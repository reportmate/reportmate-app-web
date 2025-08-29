/**
 * Clipboard utility with graceful fallback handling
 * Handles browser permission issues and security policies
 */

import { useState } from 'react'

export interface ClipboardResult {
  success: boolean
  error?: string
}

export async function copyToClipboard(text: string): Promise<ClipboardResult> {
  // Don't attempt to copy empty text
  if (!text || text.trim() === '') {
    return { success: false, error: 'No text to copy' }
  }

  try {
    // First try the modern Clipboard API if available
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text)
        return { success: true }
      } catch (clipboardError) {
        console.warn('Clipboard API failed, trying fallback:', clipboardError)
        // Fall through to legacy method
      }
    }

    // Fallback to legacy method for older browsers or when clipboard API is blocked
    return await legacyCopyToClipboard(text)
  } catch (error) {
    console.error('All clipboard methods failed:', error)
    return { 
      success: false, 
      error: 'Clipboard access blocked by browser policy. Try using Ctrl+C to copy manually.' 
    }
  }
}

async function legacyCopyToClipboard(text: string): Promise<ClipboardResult> {
  return new Promise((resolve) => {
    try {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      textArea.style.opacity = '0'
      textArea.style.pointerEvents = 'none'
      
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      try {
        const successful = document.execCommand('copy')
        if (successful) {
          resolve({ success: true })
        } else {
          resolve({ success: false, error: 'Copy command failed' })
        }
      } catch (execError) {
        resolve({ success: false, error: 'Copy command not supported' })
      } finally {
        document.body.removeChild(textArea)
      }
    } catch (error) {
      resolve({ success: false, error: 'Legacy copy method failed' })
    }
  })
}

/**
 * Hook for clipboard operations with state management
 */
export function useClipboard() {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const copy = async (text: string) => {
    setError(null)
    const result = await copyToClipboard(text)
    
    if (result.success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } else {
      setError(result.error || 'Copy failed')
      setTimeout(() => setError(null), 5000)
    }
    
    return result.success
  }

  return { copy, copied, error }
}
