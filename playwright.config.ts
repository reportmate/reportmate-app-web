import { defineConfig, devices } from '@playwright/test'

const isProduction = process.env.TEST_ENV === 'production'
const isStaging = process.env.TEST_ENV === 'staging'
const isRemote = isProduction || isStaging

const baseURL = isProduction
  ? 'https://reportmate.ecuad.ca'
  : isStaging
    ? 'https://reportmate-staging.azurecontainerapps.io'
    : 'http://localhost:3000'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
  ],

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    extraHTTPHeaders: {
      'User-Agent': 'ReportMate-E2E-Tests/1.0',
    },
  },

  projects: [
    {
      name: 'api-health',
      testMatch: /api-health\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'api-endpoints',
      testMatch: /api-endpoints\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'frontend-routes',
      testMatch: /frontend-routes\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'dashboard',
      testMatch: /dashboard\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Only start dev server when testing locally
  webServer: isRemote ? undefined : {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },

  timeout: 30 * 1000,
  expect: {
    timeout: 10 * 1000,
  },
})
