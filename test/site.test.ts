import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../src/apps/index.ts';
import { appOf, pageScripts } from '../src/kit/core.ts';
import { makeRef } from '../src/kit/embed.ts';
import { specOf } from '../src/lib/diagram.ts';
import { depths, headLevel, movePart, readLines, removePart, writeLines } from '../src/lib/lines.ts';
import { fromMarkdown, toMarkdown } from '../src/lib/markdown.ts';
import { mdToSite, parseSite, readSite, siteToMd } from '../src/lib/sitemodel.ts';
import { EDIT_SCRIPT, PLACE_SCRIPT, editData, placeData } from '../src/lib/pageedit.ts';

const spec = specOf('site')!;
const def = appOf('site')!;
const page = (text: string) => spec.page!(text);

const BIO = '# Ada Diaz\nhttps://example.com/ada.jpg\nPotter in Lisbon. Mugs, bowls, the odd lamp.\ntheme: rose serif\n> :shopping-bag Shop | https://example.com/shop\n> :instagram Instagram | https://instagram.com/ada\n> :mail Email me | mailto:ada@example.com';

test('site: pages, sections, theme, pictures, icons, embeds and buttons are read from the lines', () => {
  const ref = makeRef('sheet', 'Item\tCost\nRent\t1200');
  const site = parseSite(`# Harbor\nOn the quay.\ntheme: Serif, dark teal\n:coffee\n> :mail Write | mailto:a@b.c\n> Menu | #menu\n> Bad | javascript:alert(1)\n=== Menu ===\nEspresso.\n## Coffee\n- :coffee Espresso | 3.00\nhttps://example.com/beans.png\n@@${ref}\n===\nLast.`);
  assert.equal(site.name, 'Harbor');
  assert.deepEqual(site.theme, { color: 'teal', serif: true, dark: true });
  assert.deepEqual(site.pages.map((p) => p.title), ['', 'Menu', '']);
  const [home, menu, last] = site.pages;
  assert.deepEqual(home.sections[0].text, ['On the quay.']);
  assert.equal(home.sections[0].icon, 'coffee');
  assert.deepEqual(home.sections[0].buttons, [{ icon: 'mail', label: 'Write', url: 'mailto:a@b.c' }, { icon: '', label: 'Menu', url: '#menu' }, { icon: '', label: 'Bad', url: '#' }]);
  assert.deepEqual(menu.sections.map((s) => s.title), ['', 'Coffee']);
  assert.deepEqual(menu.sections[1].points, [':coffee Espresso | 3.00']);
  assert.deepEqual(menu.sections[1].pics, ['https://example.com/beans.png']);
  assert.deepEqual(menu.sections[1].embeds, [ref]);
  assert.deepEqual(last.sections[0].text, ['Last.']);
  // A site of one page, as written before pages existed, reads as it did.
  const one = parseSite('# A\nabout\n## B\n- x');
  assert.equal(one.pages.length, 1);
  assert.deepEqual(one.pages[0].sections.map((s) => s.title), ['', 'B']);
});

test('site: the page has a nav of its pages, each a section switched by a fixed script, and the look asked for', () => {
  const html = page(spec.example);
  // Pages are sections with ids; the nav names them; the home page comes first.
  assert.ok(html.includes('<nav aria-label="Pages"><a href="#home">Home</a><a href="#menu">Menu</a><a href="#find-us">Find us</a></nav>'));
  assert.ok(html.includes('<section class="page" id="home">') && html.includes('<section class="page" id="menu">') && html.includes('<section class="page" id="find-us">'));
  // Each page has its own heading; a section within a page its own id.
  assert.ok(html.includes('<h1>Harbor Coffee</h1>') && html.includes('<h1>Menu</h1>') && html.includes('<section class="part" id="coffee"><div class="wrap"><h2>Coffee</h2>'));
  // The theme: amber, serif, light.
  assert.ok(html.includes('--a:#b45309') && html.includes('--bg:#fff') && html.includes("font-family:'Iowan Old Style'"));
  assert.ok(html.includes('<title>Harbor Coffee</title>') && html.includes('content="Small-batch coffee, roasted on the quay every morning."'));
  // Two buttons sit side by side; the second is quiet.
  assert.ok(html.includes('<p class="go"><a class="btn" href="#menu">See the menu</a> <a class="btn quiet" href="#find-us">Find us</a></p>'));
  // The scripts in it are registered ones, so the policy allows them by hash and nothing typed can run.
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  assert.equal(scripts.length, 1);
  assert.ok(pageScripts().includes(scripts[0]));
  assert.ok(pageScripts().includes(PLACE_SCRIPT.slice(8, -9)) && pageScripts().includes(EDIT_SCRIPT.slice(8, -9)));
  assert.match(placeData('#menu'), /^<script type="application\/json" id="lf-at">"#menu"<\/script>$/);
  assert.ok(editData([], [], '', [['menu', 8, 'Page']]).includes('"s":[["menu",8,"Page"]]'));
  // Dark, and a site of one page keeps the nav of sections it always had.
  const dark = page('# A\nabout\ntheme: ink dark\n## B\n- x\n## C');
  assert.ok(dark.includes('--a:#fafafa;--on:#18181b') && dark.includes('--bg:#18181b'));
  assert.ok(dark.includes('<nav aria-label="Sections"><a href="#b">B</a><a href="#c">C</a></nav>'));
  // A page and a section may share a name: the page keeps it.
  const same = page('# A\n## Menu\n=== Menu\nx');
  assert.ok(same.includes('id="menu">\n<div class="hero top">') && same.includes('<section class="part" id="menu-2">'));
  // Nothing typed can break out.
  assert.ok(!page('# <script>alert(1)</script>\n=== </script><script>x\n> a | javascript:b').includes('<script>alert'));
  assert.ok(page('').startsWith('<!doctype html>'));
});

test('site: a link-in-bio page is a picture, a line of words and a stack of buttons', () => {
  const html = page(BIO);
  assert.ok(html.includes('<img class="pic" src="https://example.com/ada.jpg" alt="" loading="lazy"><h1>Ada Diaz</h1><p>Potter in Lisbon. Mugs, bowls, the odd lamp.</p>'));
  assert.ok(html.includes('<p class="go stack">'));
  assert.equal(html.match(/<a class="btn" href=/g)!.length, 3);
  assert.ok(!html.includes('class="btn quiet"'));
  // Each button carries its icon; the look is rose and serif.
  assert.ok(html.includes('<a class="btn" href="mailto:ada@example.com"><svg viewBox="0 0 24 24" width="20"'));
  assert.ok(html.includes('--a:#be123c') && html.includes('Georgia,serif'));
  // No pages, so no page nav; and the whole thing is small.
  assert.ok(html.includes('<nav aria-label="Sections"></nav>'));
  assert.ok(BIO.length < 400);
  assert.equal(def.title(BIO), 'Ada Diaz');
});

test('site: another document on a page, and the lines as the picture', () => {
  const ref = makeRef('sheet', '!bar\nQ\tSales\nQ1\t120\nQ2\t180', 'Sales');
  const html = spec.page!(`# A\n=== Numbers\n@@${ref}`, 'https://example.com/');
  assert.ok(html.includes('<figure class="embed"><svg xmlns="http://www.w3.org/2000/svg"') && html.includes('aria-label="Sales"'));
  assert.ok(html.includes(`<figcaption><a href="https://example.com/#/v2/sheet/`) && html.includes('>Sales</a> <small>Sheet</small>'));
  assert.deepEqual(def.outline(`# A\n=== Numbers\n@@${ref}`), ['A', 'Numbers', '↗  Sales']);
});

test('site: Markdown out and back, and friendly input', () => {
  const md = siteToMd(spec.example);
  assert.ok(md.startsWith('# Harbor Coffee\n\n**Theme:** amber serif\n\nSmall-batch coffee'));
  assert.ok(md.includes('\n- :coffee: Roasted daily | Never more than a week old\n') && md.includes('[See the menu](#menu)\n[Find us](#find-us)\n'));
  assert.ok(md.includes('\n# Menu\n\nEspresso, filter') && md.includes('\n## Coffee\n\n- Espresso | 3.00\n') && md.includes('\n# Find us\n'));
  assert.ok(md.includes('[Email us](mailto:hello@example.com)'));
  // Back again, it is the same site.
  assert.deepEqual(parseSite(mdToSite(md)), parseSite(spec.example));
  assert.equal(toMarkdown(def, spec.example), md);
  assert.deepEqual(parseSite(fromMarkdown(def, md)), parseSite(spec.example));
  // A Markdown document with several "#" headings becomes that many pages.
  assert.equal(mdToSite('# Ada\n\nHello.\n\n![me](https://x.y/me.jpg)\n\n[Shop](https://x.y/shop)\n\n# About\n\n## Now\n\n- :star: Potter'), '# Ada\nHello.\nhttps://x.y/me.jpg\n> Shop | https://x.y/shop\n=== About\n## Now\n- :star Potter');
  const bio = siteToMd(BIO);
  assert.ok(bio.includes('![](https://example.com/ada.jpg)') && bio.includes('[:mail: Email me](mailto:ada@example.com)'));
  assert.deepEqual(parseSite(mdToSite(bio)), parseSite(BIO));
  // read(): a whole link on a line is an embedded document; a Markdown link a button; a Markdown picture a picture.
  const ref = makeRef('todo', '- a');
  assert.equal(readSite(`# A\nhttps://tinylittleoffice.com/todo/#/v2/todo/${ref.slice(5)}\n[Shop](https://x.y)\n![](https://x.y/a.png)\n> kept | #a`), `# A\n@@${ref}\n> Shop | https://x.y\nhttps://x.y/a.png\n> kept | #a`);
  assert.equal(def.read!(spec.example), spec.example);
});

test('lines: headings of two kinds nest, and a part moves or goes with everything under it', () => {
  const form = spec.form!;
  const rows = readLines(spec.example, form);
  assert.equal(writeLines(rows, form), spec.example);
  const kind = (name: string) => form.findIndex((k) => k.name === name);
  assert.deepEqual([headLevel(form, kind('Page')), headLevel(form, kind('Section')), headLevel(form, kind('Card'))], [1, 2, 0]);
  // The home page's lines sit at the top; a page's words one in; a section one more; its cards one more again.
  assert.deepEqual(depths(rows, form), [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 2, 1, 2, 0, 1, 1]);
  // Find us, moved earlier, goes before Menu with its words and button; Menu cannot go above the home page.
  const moved = movePart(rows, form, 15, -1)!;
  assert.equal(writeLines(moved, form).split('\n').slice(8, 12).join('\n'), '=== Find us\n14 Quay Street, open 7 to 3, every day but Monday.\n> Email us | mailto:hello@example.com\n=== Menu');
  assert.equal(movePart(rows, form, 8, -1), null);
  assert.equal(movePart(rows, form, 15, 1), null);
  assert.deepEqual(movePart(rows, form, 8, 1), moved);
  // A section moves past its neighbour within the page, not out of it.
  assert.equal(writeLines(movePart(rows, form, 13, -1)!, form).split('\n').slice(10, 14).join('\n'), '## Pastry\n- Cardamom bun | 3.50\n## Coffee\n- Espresso | 3.00');
  assert.equal(movePart(rows, form, 10, -1), null);
  // Removed, a page takes its sections with it.
  assert.equal(writeLines(removePart(rows, form, 8), form), spec.example.split('\n').filter((_, i) => i < 8 || i >= 15).join('\n'));
  // An app with one heading kind is as it was.
  const menu = specOf('menu')!.form!;
  assert.deepEqual(depths(readLines('# Cafe\n## Coffee\nEspresso | 3.00\n## Tea', menu), menu), [0, 0, 1, 0]);
});
