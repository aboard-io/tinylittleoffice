import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { siteFrame } from './scripts/site-frame.ts';
import { readFileSync, writeFileSync } from 'node:fs';

/**
 * The commands the browser tests ran (src/kit/commands.ts `trace`, set by test/browser/setup.ts), added to the map the
 * registry's lint reads (test/commands-covered.json): every command is run by at least one test. A browser command runs
 * in this process, so the files' writes never interleave; ids only join, sorted, so a run of some files keeps the rest.
 */
const COVERED = new URL('./test/commands-covered.json', import.meta.url);
const recordCommands = (_ctx: unknown, ids: string[]) => {
  let had: string[] = [];
  try {
    had = JSON.parse(readFileSync(COVERED, 'utf8'));
  } catch {
    // None yet.
  }
  const all = [...new Set([...had, ...ids])].sort();
  if (all.length !== had.length) writeFileSync(COVERED, `${JSON.stringify(all, null, 1)}\n`);
};

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
          setupFiles: ['test/browser/setup.ts'],
          browser: { enabled: true, headless: true, provider: playwright(), instances: [{ browser: 'chromium' }], screenshotFailures: false, commands: { recordCommands } },
        },
      },
    ],
  },
});
