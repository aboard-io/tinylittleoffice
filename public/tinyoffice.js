// Tiny Little Office links from a page's own JavaScript, with nothing to build: a document is a URL, and this writes one.
//
//   import { link, embed } from 'https://tinylittleoffice.com/tinyoffice.js';
//   link({ app: 'sheet', title: 'Sales', doc: 'Quarter | Sales:money\n--- | ---\nQ1 | 120\n' });
//   embed({ app: 'deck', doc: '## Hello {.title}\n' });   // an <iframe> to put in a page
//
// app    which app: write, outline, deck, sheet, calc, draw, diagram, anim, cal, trip
// doc    the document, in the app's own text (TLO: Markdown with a few additions; see /llms.txt)
// title  its name (optional); by: who made it (optional)
// view   'pdf', 'png', 'md', 'tlo' or an app's own format to download it as it opens; 'show' a deck presenting (optional)
// base   the site (optional; this one by default)
//
// The link is the plain form, "<base><app>/#title=…&doc=…": after "#", so the document is never sent to a server,
// and turned into the packed form when it opens. /api.js does more (packed links, reading them, comparing).
const enc = (s) => encodeURIComponent(s).replace(/%20/g, '+').replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());

export function link({ app, doc = '', title = '', by = '', view = '', base = new URL('.', import.meta.url).href }) {
  const q = [title && `title=${enc(title)}`, by && `by=${enc(by)}`, view && `view=${enc(view)}`, `doc=${enc(doc.replace(/\n+$/, ''))}`].filter(Boolean);
  return `${base.replace(/\/?$/, '/')}${app}/#${q.join('&')}`;
}

const attr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** The snippet that shows a document's pages on another page: the embed page, the one address the site lets be framed. */
export function embed({ app, doc = '', title = '', base = new URL('.', import.meta.url).href, width = 640, height = 480 }) {
  const src = `${base.replace(/\/?$/, '/')}embed/#app=${enc(app)}${title ? `&title=${enc(title)}` : ''}&view=embed&doc=${enc(doc.replace(/\n+$/, ''))}`;
  return `<iframe src="${attr(src)}" title="${attr(title || app)}" loading="lazy" referrerpolicy="no-referrer" allowfullscreen style="width:100%;max-width:${width}px;aspect-ratio:${width}/${height};border:1px solid #d4d4d8;border-radius:8px"></iframe>`;
}
