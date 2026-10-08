import { defineConfig, devices } from '@playwright/test';

// PW_PORT lets two checkouts run their suites at once (each builds and previews its own copy).
const port = Number(process.env.PW_PORT ?? 4173);

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    // The service worker has a test of its own (e2e/offline.spec.ts); everywhere else pages talk to the server directly.
    serviceWorkers: 'block',
    // A link opens as a document to read, with Edit a button away; tests of the editors open straight into them (e2e/view.spec.ts tests reading).
    // Text apps open as a form; most tests type the text itself, so they start in text mode (e2e/forms.spec.ts tests the form).
    storageState: { cookies: [], origins: [{ origin: `http://localhost:${port}`, localStorage: [{ name: 'tinyoffice.keep', value: '1' }, { name: 'tinyoffice.edit', value: 'text' }, { name: 'tinyoffice.open', value: 'edit' }] }] },
    baseURL: `http://localhost:${port}`,
    timezoneId: 'America/New_York',
    locale: 'en-US',
    permissions: ['clipboard-read', 'clipboard-write'],
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1100, height: 800 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], browserName: 'chromium' } },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    // Always a fresh build: a preview server left from an earlier run serves stale files.
    reuseExistingServer: false,
    timeout: 90_000,
  },
});
