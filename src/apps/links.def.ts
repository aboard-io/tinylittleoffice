/**
 * Quick Links: a link-in-bio page. A picture (or a big icon), a name, a
 * line about you, a stack of buttons, and small icons for the places you
 * are at the foot. The same lines as a website's (lib/sitemodel.ts), with
 * one page and no sections: "# Name", "![](picture)" (or ":icon:" for a
 * big icon), words, "> Label | url" for a button, "- :icon: Label | url"
 * for a small link at the foot, "theme: candy" for the look. The icons are
 * the curated set (lib/icons.ts), the only ones a page can draw.
 */
import { definePage, htmlPage } from '../lib/diagram.ts';
import { listPage, xml } from '../kit/core.ts';
import { plain } from '../lib/tlo.ts';
import { FORM, parseSite, readSite, siteOutline, themeCss } from '../lib/sitemodel.ts';
import type { Kind } from '../lib/lines.ts';
import { EDIT_CSS, SITE_CSS, drawn, type SitePageOpts } from './site.def.ts';

const of = (name: string) => FORM.find((k) => k.name === name)!;
export const LINKS_FORM: Kind[] = [
  { name: 'Name', is: '# {Name}', once: true },
  of('Theme'),
  of('Picture'),
  of('Big icon'),
  of('Button'),
  { name: 'Small link', is: '- [:{Picture:icon}: ]{Label} | {Link}' },
  of('Paragraph'),
];

/** The page's own look: everything centred in one narrow column, the buttons always stacked. */
const LINKS_CSS = `main{max-width:26rem;margin:0 auto;padding:3rem 1.25rem 4rem;text-align:center}
.hero{background:none;padding:0}.go{flex-direction:column}.go .btn{padding:.9rem 1.1rem;font-size:1.05rem;text-align:center;box-shadow:0 1px 2px rgba(0,0,0,.06)}.go .btn.quiet{background:var(--a);color:var(--on)}
h1{font-size:2rem;margin:0 0 .6rem}p{color:var(--ink2);margin:0 0 1rem}
footer{border:0;padding:1rem 0 0;font-size:.85rem}`;

function page(text: string, opts: SitePageOpts = {}): string {
  const site = parseSite(text, LINKS_FORM);
  const name = site.name || 'Quick Links';
  const s = site.pages[0].sections[0];
  const d = drawn(site, s, { ...opts, form: LINKS_FORM }, true, []);
  return htmlPage(
    name,
    s.text[0] ? plain(s.text[0]) : name,
    `${themeCss(site.theme)}\n${SITE_CSS}${LINKS_CSS}${opts.edit ? EDIT_CSS : ''}`,
    `<main class="hero">${d.pics}<h1>${xml(name)}</h1>${d.body}${d.add}<footer>${xml(name)}</footer></main>`,
  );
}

export const spec = {
  form: LINKS_FORM,
  hint: '"# Your name", "![](https://… a picture)" or ":icon:", a line about you; "> :icon: Label | https://…" for each button; "- :camera: Instagram | https://…" for a small icon at the foot; "theme: candy" for the look.',
  example: '---\ntheme: rose\n---\n# Ada Diaz\n\n![](https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400)\n\nPotter in Lisbon. Mugs, bowls, the odd lamp.\n\n> :cart: The shop | https://example.com/shop\n> :calendar: Book a class | https://example.com/classes\n> :mail: Email me | mailto:ada@example.com\n\n- :camera: Instagram | https://instagram.com/ada\n- :film: YouTube | https://youtube.com/@ada',
  page,
};

export default definePage(
  {
    id: 'links',
    name: 'Quick Links',
    icon: 'bio',
    group: 'Create',
    blurb: 'A link-in-bio page: a picture, a line about you, and the buttons to everywhere you are.',
    title: (body) => parseSite(body, LINKS_FORM).name,
    outline: (body) => siteOutline(body, LINKS_FORM).slice(0, 14),
    view: (body, opts = {}) => {
      const name = parseSite(body, LINKS_FORM).name;
      return [listPage(name || 'Quick Links', siteOutline(body, LINKS_FORM).slice(name ? 1 : 0, (name ? 1 : 0) + (opts.step ?? 40)), opts.w)];
    },
    steps: (body) => Math.min(40, siteOutline(body, LINKS_FORM).length - (parseSite(body, LINKS_FORM).name ? 1 : 0)),
    read: (text) => readSite(text, LINKS_FORM),
  },
  spec,
);
