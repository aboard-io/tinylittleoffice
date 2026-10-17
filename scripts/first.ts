/**
 * What a page says before any script runs: the inside of its <header id="to-first"> (scripts/seo.ts writes it into
 * each page; kit/core/shell.ts takes it away as it starts). Plain text for a crawler, drawn by the stylesheet as the
 * page it becomes (page.css, #to-first): on the home page the line for agents first (out of sight), then the site's name
 * and the apps' names, each a link to its page; on an app's page its name, its line and its templates' names (out of
 * sight). Pure, so the browser test that measures it against the shell builds it as the build does
 * (test/browser/first-paint.test.ts).
 */

/** An app as the pages name it: its route, name, line and templates' names. */
export interface Listed {
  id: string;
  name: string;
  blurb: string;
  templates: string[];
}

export const SITE_NAME = 'Tiny Little Office';
export const text = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * The home page's first words, before the site's name: a fetcher that reads only the first few hundred characters
 * meets the guide for agents first, and that a document goes inside another.
 */
export const agents = (site: string) => `Agents: ${site}llms.txt says how to make a document as a link; a document goes inside another as a fence named by its app.`;

/** The home page's first text: the line for agents, the site's name, the apps' names as links to their pages. */
export const homeFirst = (site: string, apps: Listed[]) =>
  `<p class="sr-only">${text(agents(site))}</p><h1>${SITE_NAME}</h1><ul>${apps.map((a) => `<li><a href="${a.id}/">${text(a.name)}</a></li>`).join('')}</ul>`;

/** An app's page's first text: its name, its line, its templates' names. */
export const appFirst = (app: Listed) => `<h1>${text(app.name)}</h1><p>${text(app.blurb)}</p><ul class="sr-only">${app.templates.map((n) => `<li>${text(n)}</li>`).join('')}</ul>`;
