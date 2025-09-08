"use client"

import { useEffect } from 'react'

/**
 * Edge Theme Fix Component
 * 
 * This component addresses theme-related issues that can occur in Edge browser,
 * particularly around dark mode detection and CSS custom property application.
 * 
 * Common Edge issues this fixes:
 * - Delayed dark mode detection
 * - CSS custom property inheritance problems
 * - Theme flashing on initial load
 */
export function EdgeThemeFix() {
  useEffect(() => {
    // Check if we're in Edge browser
    const isEdge = /Edge|Edg\//.test(navigator.userAgent)
    
    if (isEdge) {
      // Force a re-evaluation of CSS custom properties
      const forceThemeUpdate = () => {
        const root = document.documentElement
        const currentTheme = root.classList.contains('dark') ? 'dark' : 'light'
        
        // Temporarily remove and re-add theme class to force recalculation
        root.classList.remove('dark', 'light')
        // Use requestAnimationFrame to ensure the removal is processed
        requestAnimationFrame(() => {
          root.classList.add(currentTheme)
        })
      }
      
      // Apply fix on initial load
      forceThemeUpdate()
      
      // Also apply when theme changes
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            // Small delay to ensure theme change is complete
            setTimeout(forceThemeUpdate, 50)
          }
        })
      })
      
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      })
      
      return () => observer.disconnect()
    }
  }, [])

  // This component doesn't render anything visible
  return null
}
