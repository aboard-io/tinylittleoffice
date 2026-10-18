/**
 * A language's file as a page fetches it (vite.config.ts, vite.api.config.ts): the .ftl without its comments. The
 * groups, the notes on what a message means, `# same` and `# en: <sha1>` are for translators and the checks
 * (scripts/i18n-extract.ts); Fluent reads none of them, so a build leaves them out, and a translation carries no bytes
 * of its bookkeeping. A comment is a line beginning "#": a pattern's lines go on indented, so none is touched.
 *
 * The library's own apps (`LIBRARY_APPS`: the Board) are in no list of the site's (kit/core/apps.ts `apps()`), and
 * their messages, `<id>-…`, are in the same files as everyone's, checked as everyone's are; but only the library's
 * editors (vite.lib.config.ts, its editors' build) and the Storybook draw them, so every other build leaves them out
 * (`library: false`, the default) and the site's files are the bytes they would be without them.
 */
import { readFileSync } from 'node:fs';
import type { Plugin } from 'vite';

/** The apps under src/apps/ the site does not list: the library serves them (docs/library.md, The library's own apps). */
export const LIBRARY_APPS = ['board'];

/** A message of one of the library's own apps: its id begins with the app's. */
const libraryOnly = new RegExp(`^(${LIBRARY_APPS.join('|')})-`);

/** The file's text without its comment lines and the blank lines they leave; without the library's apps' messages, unless `library`. */
export const bare = (source: string, library = true): string => {
  let dropping = false;
  return (
    source
      .split('\n')
      .filter((l) => !l.startsWith('#'))
      .filter((l) => {
        // A message is its id's line and the indented lines after it.
        if (!/^\s/.test(l)) dropping = !library && libraryOnly.test(l);
        return !dropping;
      })
      .join('\n')
      .replace(/\n{2,}/g, '\n')
      .trim() + '\n'
  );
};

export const ftlBare = ({ library = false }: { library?: boolean } = {}): Plugin => ({
  name: 'tinyoffice-ftl-bare',
  apply: 'build',
  enforce: 'pre',
  load(id) {
    const path = /^(.*\/src\/i18n\/[^/]+\.ftl)\?raw$/.exec(id.replaceAll('\\', '/'))?.[1];
    return path ? `export default ${JSON.stringify(bare(readFileSync(path, 'utf8'), library))};` : undefined;
  },
});
