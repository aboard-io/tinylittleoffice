/**
 * What every story shares: the editors as a page that is not the site holds them (src/editors.ts and its stylesheet,
 * src/editors.css), set up once (`setup`: the theme, the size, the language), with the host a page gives (documents
 * open on tinylittleoffice.com, not at the Storybook's own address). The toolbar's Theme is the kit's own
 * (`setTheme`), and its Language `setLanguage`. A story whose element is the site's page (its chrome, home page and
 * dialogs: stories/site/) sets `parameters.page`, and gets the site's page.css under the editors' sheet while it is
 * shown, as the site has it (src/styles.css).
 */
import type { Decorator, Loader, Preview } from '@storybook/web-components-vite';
import { languages, setLanguage, setTheme, setup, type Theme } from '../src/editors.ts';
import { host, siteHost } from '../src/kit/core/host.ts';
import { languageName } from '../src/kit/core/i18n.ts';
import pageCss from '../src/styles/page.css?inline';
import './preview.css';

Object.assign(
  host,
  siteHost(() => 'https://tinylittleoffice.com/'),
);

/**
 * The site's page.css, on only while a story that asks for it is shown: put in after the editors' sheet, the first
 * time it is asked for, so its rules come at the end of each layer as in the site's (src/styles.css), the layers in
 * their order whatever comes first.
 */
const page = Object.assign(document.createElement('style'), { id: 'sb-page-css', textContent: `@layer tokens, kit, apps, responsive, a11y;\n${pageCss}` });

const ready: Loader = async ({ globals }) => {
  await setup();
  const lang = globals.lang === 'auto' ? null : (globals.lang as string);
  await setLanguage(lang);
  return {};
};

const ground: Decorator = (story, { globals, parameters }) => {
  setTheme((globals.theme as Theme) ?? 'auto');
  if (parameters.page && !page.isConnected) document.head.append(page);
  page.media = parameters.page ? 'all' : 'not all';
  return story();
};

const preview: Preview = {
  loaders: [ready],
  decorators: [ground],
  globalTypes: {
    theme: {
      description: 'The kit’s theme (setTheme)',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: [
          { value: 'auto', title: 'Match the device' },
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
    lang: {
      description: 'The language the kit speaks (setLanguage)',
      toolbar: {
        title: 'Language',
        icon: 'globe',
        items: [{ value: 'auto', title: 'The browser’s' }, ...languages().map((code) => ({ value: code, title: languageName(code) }))],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'auto', lang: 'en' },
  parameters: {
    layout: 'padded',
    controls: { expanded: true },
    // The kit's ground is the page's, set by the theme: Storybook's own backgrounds would hide it.
    backgrounds: { disable: true },
    options: {
      storySort: { order: ['Foundations', 'Kit', ['Core', 'UI', 'Text', 'Draw'], 'Apps', 'Site', 'Packages'] },
    },
  },
};
export default preview;
