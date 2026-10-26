export const KIOSK_ZOOM_EVENT = 'reportmate:kiosk-zoom'
export const DASHBOARD_DESKTOP_WIDTH = 1680
export const DASHBOARD_WIDE_WIDTH = 2200

export function fitDashboardZoom(viewportWidth: number, preferredZoom: number): number {
  return Math.min(preferredZoom, viewportWidth / (DASHBOARD_WIDE_WIDTH + 8))
}

export function dashboardLayoutAtZoom(viewportWidth: number, zoom: number): 'narrow' | 'desktop' | 'wide' {
  const width = viewportWidth / zoom
  return width >= DASHBOARD_WIDE_WIDTH ? 'wide' : width >= DASHBOARD_DESKTOP_WIDTH ? 'desktop' : 'narrow'
}
