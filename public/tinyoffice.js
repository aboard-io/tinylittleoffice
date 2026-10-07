// TinyLittleOffice links from JavaScript. A document is a URL; this writes one.
//
//   import { link } from 'https://tinylittleoffice.com/tinyoffice.js';
//   link({ app: 'sheet', title: 'Sales', doc: '!bar\nQuarter\tSales\nQ1\t120' });
//
// app    which app: sheet, write, deck, draw, cal, todo, board, gantt, trip,
//        org, mind, lanes, venn, net, db, site, store, invoice
// doc    the document as plain text, in the app's format (see /llms.txt)
// title  the document's name (optional)
// view   'show' (decks: open presenting), 'embed' (the document alone, for an
//        iframe), or 'pdf' / 'png' / 'html' to download it (optional)
// base   the site (optional; this one by default)
export function link({ app, doc = '', title = '', view = '', base = new URL('.', import.meta.url).href }) {
  const q = new URLSearchParams();
  if (title) q.set('title', title);
  if (view) q.set('view', view);
  q.set('doc', doc);
  // After "#", so the document is never sent to a server.
  return `${base}${app}/#${q}`;
}

/** The snippet that shows a document on another page. */
export function embed({ width = 640, height = 444, ...doc }) {
  const src = link({ ...doc, view: 'embed' }).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  const title = (doc.title || doc.app).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  return `<iframe src="${src}" title="${title}" loading="lazy" referrerpolicy="no-referrer" allowfullscreen style="width:100%;max-width:${width}px;aspect-ratio:${width}/${height};border:1px solid #d4d4d8;border-radius:8px"></iframe>`;
}
