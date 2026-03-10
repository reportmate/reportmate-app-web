"use client"

interface CollapsibleSectionProps {
  expanded: boolean
  children: React.ReactNode
  duration?: number
  /** When set, caps expanded content height and enables vertical scrolling */
  maxHeight?: string
}

/**
 * Smooth height-animated collapsible container.
 * Uses CSS grid-template-rows transition for a clean expand/collapse effect.
 * Content is kept mounted (not unmounted) so scroll position and state are preserved.
 */
export function CollapsibleSection({ expanded, children, duration = 300, maxHeight }: CollapsibleSectionProps) {
  return (
    <div
      className="grid transition-[grid-template-rows] overflow-hidden"
      style={{ 
        gridTemplateRows: expanded ? '1fr' : '0fr',
        transitionDuration: `${duration}ms`,
        transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div
        className="min-h-0"
        style={{
          overflow: expanded && maxHeight ? 'auto' : 'hidden',
          maxHeight: expanded && maxHeight ? maxHeight : undefined,
        }}
      >
        {children}
      </div>
    </div>
  )
}
