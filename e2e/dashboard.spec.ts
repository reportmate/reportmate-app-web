import { test, expect } from '@playwright/test'

test.describe('ReportMate Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the main dashboard
    await page.goto('/')
  })

  test('loads dashboard homepage', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/ReportMate/)
    
    // Check main heading
    await expect(page.locator('h1')).toContainText('ReportMate')
    
    // Verify dashboard elements are present
    await expect(page.locator('[data-testid="dashboard-container"]')).toBeVisible()
  })

  test('displays device overview cards', async ({ page }) => {
    // Wait for devices to load
    await page.waitForSelector('[data-testid="device-card"]', { timeout: 10000 })
    
    // Count device cards
    const deviceCards = page.locator('[data-testid="device-card"]')
    await expect(deviceCards).toHaveCount(3, { timeout: 10000 })
    
    // Check first device card content
    const firstCard = deviceCards.first()
    await expect(firstCard.locator('[data-testid="device-name"]')).toBeVisible()
    await expect(firstCard.locator('[data-testid="device-status"]')).toBeVisible()
  })

  test('navigates to device detail page', async ({ page }) => {
    // Wait for devices to load
    await page.waitForSelector('[data-testid="device-card"]', { timeout: 10000 })
    
    // Click on first device card
    await page.click('[data-testid="device-card"]:first-child')
    
    // Verify navigation to device page
    await expect(page).toHaveURL(/\/device\//)
    
    // Check device detail page elements
    await expect(page.locator('[data-testid="device-header"]')).toBeVisible()
    await expect(page.locator('[data-testid="device-info"]')).toBeVisible()
  })

  test('filters devices by status', async ({ page }) => {
    // Wait for devices to load
    await page.waitForSelector('[data-testid="device-card"]', { timeout: 10000 })
    
    // Click online filter
    await page.click('[data-testid="filter-online"]')
    
    // Verify only online devices are shown
    const onlineDevices = page.locator('[data-testid="device-card"][data-status="online"]')
    await expect(onlineDevices).toHaveCount(2, { timeout: 5000 })
    
    // Click offline filter
    await page.click('[data-testid="filter-offline"]')
    
    // Verify only offline devices are shown
    const offlineDevices = page.locator('[data-testid="device-card"][data-status="offline"]')
    await expect(offlineDevices).toHaveCount(1, { timeout: 5000 })
  })

  test('searches devices by name', async ({ page }) => {
    // Wait for devices to load
    await page.waitForSelector('[data-testid="device-card"]', { timeout: 10000 })
    
    // Type in search box
    await page.fill('[data-testid="device-search"]', 'MacBook')
    
    // Verify filtered results
    const searchResults = page.locator('[data-testid="device-card"]')
    await expect(searchResults).toHaveCount(1, { timeout: 5000 })
    
    // Verify the correct device is shown
    await expect(searchResults.first().locator('[data-testid="device-name"]'))
      .toContainText('MacBook')
  })

  test('displays real-time status updates', async ({ page }) => {
    // Mock WebSocket connection for real-time updates
    await page.route('**/negotiate', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'ws://localhost:8080/ws',
          accessToken: 'mock-token'
        })
      })
    })

    // Wait for devices to load
    await page.waitForSelector('[data-testid="device-card"]', { timeout: 10000 })
    
    // Check that real-time indicator is present
    await expect(page.locator('[data-testid="realtime-indicator"]')).toBeVisible()
    
    // Check connection status
    await expect(page.locator('[data-testid="connection-status"]'))
      .toHaveText('Connected', { timeout: 10000 })
  })
})

test.describe('Device Detail Page', () => {
  test('displays device information', async ({ page }) => {
    // Navigate to a specific device
    await page.goto('/device/TEST001')
    
    // Check device header
    await expect(page.locator('[data-testid="device-header"]')).toBeVisible()
    await expect(page.locator('[data-testid="device-name"]')).toContainText('TEST001')
    
    // Check device info sections
    await expect(page.locator('[data-testid="device-overview"]')).toBeVisible()
    await expect(page.locator('[data-testid="device-hardware"]')).toBeVisible()
    await expect(page.locator('[data-testid="device-events"]')).toBeVisible()
  })

  test('displays recent events', async ({ page }) => {
    await page.goto('/device/TEST001')
    
    // Wait for events to load
    await page.waitForSelector('[data-testid="event-item"]', { timeout: 10000 })
    
    // Check events are displayed
    const events = page.locator('[data-testid="event-item"]')
    await expect(events).toHaveCount(5, { timeout: 5000 })
    
    // Check event structure
    const firstEvent = events.first()
    await expect(firstEvent.locator('[data-testid="event-type"]')).toBeVisible()
    await expect(firstEvent.locator('[data-testid="event-timestamp"]')).toBeVisible()
    await expect(firstEvent.locator('[data-testid="event-details"]')).toBeVisible()
  })

  test('exports device data', async ({ page }) => {
    await page.goto('/device/TEST001')
    
    // Wait for page to load
    await page.waitForSelector('[data-testid="device-header"]', { timeout: 10000 })
    
    // Click export button
    const downloadPromise = page.waitForEvent('download')
    await page.click('[data-testid="export-device-data"]')
    
    // Verify download
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/TEST001.*\.json$/)
  })
})
