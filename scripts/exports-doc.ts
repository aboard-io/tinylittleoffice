/**
 * docs/exports.md, written from the apps' definitions: what every document can be saved as (the kit's
 * formats, then each app's own `exports`) and the other apps it opens in (`handoffs`). The words around
 * the tables are here; the tables are the defs', so the page cannot drift from the code.
 *
 *   node scripts/exports-doc.ts           write docs/exports.md
 *   node scripts/exports-doc.ts --check   write nothing; fail if docs/exports.md is not what the defs say
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { apps, appOf } from '../src/kit/apps.ts';
import { KIT_FORMATS } from '../src/kit/exports.ts';
import { generate } from './generated.ts';

const cell = (s: string) => s.replace(/\|/g, '\\|');

export function exportsDoc(): string {
  const all = apps();
  const own = all.flatMap((a) => (a.exports ?? []).map((x) => `| ${a.name} | \`.${x.ext}\` | ${cell(x.label())} |`));
  const opens = all.flatMap((a) => (a.handoffs ?? []).filter((h) => appOf(h.to)).map((h) => `| ${a.name} | ${appOf(h.to)!.name} | ${cell(h.label())} |`));
  return `# What each app exports

Every document is a link; these are the files it becomes, from the Download menu, and from a link with the
extension after the app's name (\`#/v1/sheet.xlsx/<payload>\` downloads on arrival; \`#/v1/write.print/…\`
prints). Every file is built in the browser, from the document, by the app's definition
(\`src/apps/<id>/def.ts\`, \`exports\`) and the kit (\`src/kit/exports.ts\`); nothing is sent anywhere. Mod+S
keeps the document on the device (under Saved), it does not download. In the Download menu each format is a
row: View (in a new tab, where the browser shows the file), Share (the device's share sheet, where it takes the
file), Download, and Copy link (the link that downloads it on arrival). This page is written from the
definitions by \`node scripts/exports-doc.ts\`; a test fails when it is out of date.

## Every app

| Format | What the file holds |
| --- | --- |
| Print, or save as PDF | The browser's own print dialog, which saves a PDF: a page per page the app draws, at its own size, the words in the SVG still text. Mod+P. |
${KIT_FORMATS
  .map((x) => `| \`.${x.ext}\` | ${cell(x.label())}${x.ext === 'png' ? ': the whole document as one picture, its pages stacked' : x.ext === 'html' ? ': a web page of its pages as pictures (an app with its own web page lists it below, and that one is used)' : ': the document exactly as its link holds it (docs/tlo.md)'}. |`)
  .join('\n')}

Text files are UTF-8; only CSV carries a byte order mark, which Excel needs. A file is named from the
document's title, or from what one of the app's documents is called.

An animation, on its own or placed in another document (a slide, a site's page, a text), plays wherever the
page can move: the Display Link, an embed, a slideshow, a web page. Print, a PDF and a PNG cannot move, so
there it is drawn still, at its resting moment (\`ViewOpts.still\`).

## Each app's own

| App | Format | Menu item |
| --- | --- | --- |
${own.join('\n')}

A seating chart (Diagram Maker, \`kind: seating\`) prints its place cards from its bar: a card a guest, eight to a
letter sheet, with lines to cut along.

## Open in another app

Under Download, "Open in": the document as another app reads it, converted by a pure function of its text
(\`src/apps/<id>/convert.ts\`), opened in this tab.

| From | Opens in | Menu item |
| --- | --- | --- |
${opens.join('\n')}
`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) generate({ 'docs/exports.md': exportsDoc() }, 'npm run docs:exports');
