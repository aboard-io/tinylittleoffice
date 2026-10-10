import { defineConfig, devices } from '@playwright/test';

// PW_PORT lets two checkouts run their suites at once (each builds and previews its own copy).
const port = Number(process.env.PW_PORT ?? 4179);

/** The small smoke run on the built site: a desktop Chromium and an iPhone-sized WebKit (390 by 844). */
export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: `http://localhost:${port}`,
    locale: 'en-US',
    timezoneId: 'America/New_York',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1100, height: 800 } } },
    { name: 'phone', use: { ...devices['iPhone 14'], browserName: 'webkit', viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: `npm run -s build && npm run -s preview -- --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
