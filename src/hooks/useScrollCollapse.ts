"use client"

import { useRef, useEffect, useCallback, useState } from "react"

interface AccordionStates {
  filters?: boolean
  widgets?: boolean
}

interface UseScrollCollapseOptions {
  /** Scroll threshold in px before collapsing (default: 30) */
  threshold?: number
  /** Whether the hook is active (disable during loading etc.) */
  enabled?: boolean
}

interface UseScrollCollapseReturn {
  /** Ref to attach to the table scroll container */
  tableContainerRef: React.RefObject<HTMLDivElement>
  /** Callback ref for pages with multiple mutually exclusive scroll containers */
  setTableContainerRef: (node: HTMLDivElement | null) => void
  /** Whether scroll-collapse is currently active */
  scrollCollapsed: boolean
  /** Effective expanded state for filters (respects manual + auto collapse) */
  effectiveFiltersExpanded: boolean
  /** Effective expanded state for widgets (respects manual + auto collapse) */
  effectiveWidgetsExpanded: boolean
}

/**
 * Hook that auto-collapses accordion sections when the user scrolls down in a table,
 * and re-expands them when scrolled back to the top.
 * 
 * Manual toggles are always respected:
 * - If user manually closes an accordion, it stays closed when scrolling back to top
 * - If user manually opens an accordion while collapsed, it stays open when scrolling back to top
 * 
 * Supports two ref patterns:
 * - `tableContainerRef`: standard ref for pages with a single scroll container
 * - `setTableContainerRef`: callback ref for pages with multiple mutually exclusive scroll containers
 */
export function useScrollCollapse(
  manualStates: AccordionStates,
  options: UseScrollCollapseOptions = {}
): UseScrollCollapseReturn {
  const { threshold = 30, enabled = true } = options
  const tableContainerRef = useRef<HTMLDivElement>(null!)

  // Track the current element for callback ref pattern
  const currentElementRef = useRef<HTMLDivElement | null>(null)

  // Track whether auto-collapse is active
  const [scrollCollapsed, setScrollCollapsed] = useState(false)

  // Store the manual states at the moment of collapse so we can restore them
  const statesAtCollapseRef = useRef<AccordionStates>({})

  // Track if anything was actually open when we collapsed
  const hadOpenAccordionsRef = useRef(false)

  // Debounce timer to prevent rapid-fire scroll events during re-renders
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Track previous manual states to detect user toggles while collapsed
  const prevManualStatesRef = useRef<AccordionStates>({ ...manualStates })

  // Cooldown: once collapsed, block un-collapse for a short grace period.
  // This prevents the rapid toggle loop when collapsing frees space, resets
  // scrollTop to 0, which would immediately un-collapse.
  const lastCollapseTimeRef = useRef<number>(0)
  const COLLAPSE_COOLDOWN_MS = 400

  // Detect manual toggles while scroll-collapsed.
  // If the user explicitly opens an accordion, respect it and exit collapse mode.
  useEffect(() => {
    const prev = prevManualStatesRef.current
    if (scrollCollapsed) {
      const filtersOpened = !(prev.filters ?? false) && (manualStates.filters ?? false)
      const widgetsOpened = !(prev.widgets ?? false) && (manualStates.widgets ?? false)
      if (filtersOpened || widgetsOpened) {
        setScrollCollapsed(false)
        hadOpenAccordionsRef.current = false
      }
    }
    prevManualStatesRef.current = { ...manualStates }
  }, [manualStates.filters, manualStates.widgets, scrollCollapsed])

  // Reset scroll-collapsed when content no longer overflows (e.g. after filtering)
  useEffect(() => {
    if (!scrollCollapsed || !enabled) return
    const checkOverflow = () => {
      const el = currentElementRef.current || tableContainerRef.current
      if (!el) return
      if (el.scrollHeight <= el.clientHeight + threshold && el.scrollTop <= 5) {
        setScrollCollapsed(false)
        hadOpenAccordionsRef.current = false
      }
    }
    const timer = setTimeout(checkOverflow, 150)
    return () => clearTimeout(timer)
  }, [scrollCollapsed, enabled, threshold])

  const handleScroll = useCallback(() => {
    if (!enabled) return

    // Debounce: wait 50ms after last scroll event before processing.
    // Prevents feedback loops when filter changes cause re-renders that
    // briefly trigger scroll events (e.g. small result sets).
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
    scrollTimerRef.current = setTimeout(() => {
      // Support both ref patterns
      const el = currentElementRef.current || tableContainerRef.current
      if (!el) return

      const scrollTop = el.scrollTop
      // Only collapse when content genuinely overflows the container.
      // This prevents a feedback loop with small result sets where collapsing
      // frees space, removing overflow, resetting scrollTop, re-expanding, etc.
      const hasSignificantOverflow = el.scrollHeight > el.clientHeight + threshold

      if (scrollTop > threshold && !scrollCollapsed && hasSignificantOverflow) {
        // User scrolled down - check if any accordion is open
        const anyOpen = (manualStates.filters ?? false) || (manualStates.widgets ?? false)
        if (anyOpen) {
          // Remember what was open so we can restore it
          statesAtCollapseRef.current = { ...manualStates }
          hadOpenAccordionsRef.current = true
          lastCollapseTimeRef.current = Date.now()
          setScrollCollapsed(true)
        }
      } else if (scrollTop <= 5 && scrollCollapsed) {
        // User scrolled back to top - restore, but only after cooldown
        const elapsed = Date.now() - lastCollapseTimeRef.current
        if (elapsed >= COLLAPSE_COOLDOWN_MS) {
          setScrollCollapsed(false)
          hadOpenAccordionsRef.current = false
        }
      }
    }, 50)
  }, [enabled, threshold, scrollCollapsed, manualStates])

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
    }
  }, [])

  // Standard ref pattern - attach scroll listener
  useEffect(() => {
    const el = tableContainerRef.current
    if (!el || !enabled) return

    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [handleScroll, enabled])

  // Callback ref for multiple mutually exclusive scroll containers
  const setTableContainerRef = useCallback((node: HTMLDivElement | null) => {
    // Clean up old listener
    if (currentElementRef.current) {
      currentElementRef.current.removeEventListener('scroll', handleScroll)
    }
    currentElementRef.current = node
    // Attach new listener
    if (node && enabled) {
      node.addEventListener('scroll', handleScroll, { passive: true })
    }
  }, [handleScroll, enabled])

  // Compute effective states
  const effectiveFiltersExpanded = scrollCollapsed ? false : (manualStates.filters ?? false)
  const effectiveWidgetsExpanded = scrollCollapsed ? false : (manualStates.widgets ?? false)

  return {
    tableContainerRef,
    setTableContainerRef,
    scrollCollapsed,
    effectiveFiltersExpanded,
    effectiveWidgetsExpanded,
  }
}
