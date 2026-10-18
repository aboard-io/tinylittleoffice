/**
 * The Storybook (docs/library.md, The Storybook): every element of the kit and every app's editor, alone on a page that
 * is not the site, as a host will hold them. `npm run storybook` serves it at http://0.0.0.0:6006, and
 * `npm run build-storybook` writes it to storybook-static/ (ignored by git). Its Vite is its own (.storybook/vite.config.ts),
 * never the site's, so nothing of the site's build runs and the site never bundles Storybook. The stories are in
 * stories/, one folder per part of the hierarchy.
 */
import type { StorybookConfig } from '@storybook/web-components-vite';

const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.ts'],
  framework: { name: '@storybook/web-components-vite', options: { builder: { viteConfigPath: '.storybook/vite.config.ts' } } },
  // The faces editors.css names at /fonts/… (src/styles/fonts.css), served where the site serves them.
  staticDirs: [{ from: '../public/fonts', to: '/fonts' }],
  core: { disableTelemetry: true },
};
export default config;
