import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
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
/** A browser project's settings (each project gets its own instance, named for it: Vitest names an instance in place). */
const browser = (name: string) => ({
  enabled: true,
  headless: true,
  provider: playwright(),
  instances: [{ browser: 'chromium' as const, name }],
  screenshotFailures: false,
  commands: { recordCommands },
});
/** The browser files that count what the device holds; they run after the others (see below). */
const ALONE = ['test/browser/privacy.test.ts'];

export default defineConfig({
  test: {
    projects: [
      // An app's model and view tests are node tests too: src/apps/<id>/tests/*.unit.test.ts.
      { test: { name: 'unit', include: ['test/*.test.ts', 'test/doc/*.test.ts', 'src/**/tests/*.unit.test.ts'], environment: 'node' } },
      {
        test: {
          name: 'browser',
          include: ['test/browser/**/*.test.ts', 'src/**/tests/*.test.ts'],
          exclude: ['**/node_modules/**', 'src/**/tests/*.unit.test.ts', ...ALONE],
          setupFiles: ['test/browser/setup.ts'],
          browser: browser('browser'),
        },
      },
      {
        // The files that count what the origin holds run after the rest, alone: browser files share one origin's
        // localStorage, so a file that turns Saved on or chooses a language while these count would be counted.
        test: {
          name: 'browser-alone',
          include: ALONE,
          setupFiles: ['test/browser/setup.ts'],
          sequence: { groupOrder: 1 },
          browser: browser('browser-alone'),
        },
      },
    ],
  },
});
