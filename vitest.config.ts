import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

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
