import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { siteFrame } from './scripts/site-frame.ts';

/**
 * Two kinds of test. "unit" runs pure modules under node (the codec, the QR code, the strings, the colour
 * tokens). "browser" runs everything that touches the DOM in a real Chromium through Playwright: the shell,
 * the bar, the menus, each app's editor (src/apps/<id>/tests/). e2e/ (Playwright itself) is the small smoke
 * run on the built site, desktop and phone.
 */
export default defineConfig({
  test: {
    projects: [
      // An app's model and view tests are node tests too: src/apps/<id>/tests/*.unit.test.ts.
      { test: { name: 'unit', include: ['test/*.test.ts', 'test/doc/*.test.ts', 'src/**/tests/*.unit.test.ts'], environment: 'node' } },
      {
        // The Website Builder's frame loads its script from the server (scripts/site-frame.ts).
        plugins: [siteFrame(import.meta.dirname)],
        test: {
          name: 'browser',
          include: ['test/browser/**/*.test.ts', 'src/**/tests/*.test.ts'],
          exclude: ['**/node_modules/**', 'src/**/tests/*.unit.test.ts'],
          browser: { enabled: true, headless: true, provider: playwright(), instances: [{ browser: 'chromium' }], screenshotFailures: false },
        },
      },
    ],
  },
});
