/** Editors tested in an emulated browser (happy-dom), through Vite: the real elements, typed into, in seconds. */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/dom/**/*.test.ts'],
    environment: 'happy-dom',
    setupFiles: ['test/dom/setup.ts'],
  },
});
