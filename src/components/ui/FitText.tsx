"use client"

import { useRef, useEffect, useState } from 'react'

interface FitTextProps {
  children: string
  className?: string
  minFontSize?: number
  maxFontSize?: number
  as?: 'span' | 'div'
}

/**
 * FitText component - automatically adjusts font size to prevent text wrapping
 * Uses JavaScript to measure and scale text to fit container width
 */
export function FitText({ 
  children, 
  className = '', 
  minFontSize = 11, 
  maxFontSize = 16,
  as: Component = 'span'
}: FitTextProps) {
  const containerRef = useRef<HTMLSpanElement | HTMLDivElement>(null)
  const [fontSize, setFontSize] = useState(maxFontSize)
  
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    
    // Reset to max size first
    container.style.fontSize = `${maxFontSize}px`
    
    // Check if it fits, reduce if not
    let currentSize = maxFontSize
    while (container.scrollWidth > container.clientWidth && currentSize > minFontSize) {
      currentSize -= 0.5
      container.style.fontSize = `${currentSize}px`
    }
    
    setFontSize(currentSize)
  }, [children, minFontSize, maxFontSize])
  
  return (
    <Component
      ref={containerRef as any}
      className={`whitespace-nowrap overflow-hidden block ${className}`}
      style={{ fontSize: `${fontSize}px` }}
    >
      {children}
    </Component>
  )
}
