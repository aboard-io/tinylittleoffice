import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../src/apps/index.ts';
import { appOf, pageScripts } from '../src/kit/core.ts';
import { hashOf, makeRef } from '../src/kit/embed.ts';
import { specOf } from '../src/lib/diagram.ts';
import { depths, headLevel, movePart, readLines, removePart, writeLines, type Kind as LineKind } from '../src/lib/lines.ts';
import { fromMarkdown, toMarkdown } from '../src/lib/markdown.ts';
import { parseSite, readSite, THEMES, parseTheme, themeWords, themeCss, isDark } from '../src/lib/sitemodel.ts';
import { EDIT_SCRIPT, PLACE_SCRIPT, editData, placeData } from '../src/lib/pageedit.ts';

const spec = specOf('site')!;
const def = appOf('site')!;
const page = (text: string) => spec.page!(text);
const fence = (ref: string) => '```' + ref + '\n```';

const BIO = 'theme: rose\n\n# Ada Diaz\n\nhttps://example.com/ada.jpg\nPotter in Lisbon. Mugs, bowls, the odd lamp.\n\n> :shopping-bag: Shop | https://example.com/shop\n> :instagram: Instagram | https://instagram.com/ada\n> :mail: Email me | mailto:ada@example.com';

test('site: pages, sections, theme, pictures, icons, embeds and buttons are read from the text', () => {
  const ref = makeRef('sheet', 'Item | Cost\n--- | ---\nRent | 1200');
  const site = parseSite(`theme: teal serif dark\n\n# Harbor\n\nOn the quay.\n:coffee:\n\n> :mail: Write | mailto:a@b.c\n> Menu | #menu\n> Bad | javascript:alert(1)\n\n# Menu\n\nEspresso.\n\n## Coffee\n\n- :coffee: Espresso | 3.00\n\nhttps://example.com/beans.png\n\n${fence(ref)}\n\n# Last\n\nLast.`);
  assert.equal(site.name, 'Harbor');
  assert.deepEqual(site.theme, { id: 'teal', face: 'serif', dark: true });
  assert.deepEqual(site.pages.map((p) => p.title), ['', 'Menu', 'Last']);
  const [home, menu, last] = site.pages;
  assert.deepEqual(home.sections[0].text, ['On the quay.']);
  assert.equal(home.sections[0].icon, 'coffee');
  assert.deepEqual(home.sections[0].buttons, [{ icon: 'mail', label: 'Write', url: 'mailto:a@b.c' }, { icon: '', label: 'Menu', url: '#menu' }, { icon: '', label: 'Bad', url: '#' }]);
  assert.deepEqual(menu.sections.map((s) => s.title), ['', 'Coffee']);
  assert.deepEqual(menu.sections[1].points, [{ icon: 'coffee', head: 'Espresso', detail: '3.00' }]);
  assert.deepEqual(menu.sections[1].pics, ['https://example.com/beans.png']);
  assert.deepEqual(menu.sections[1].embeds, [ref]);
  assert.deepEqual(last.sections[0].text, ['Last.']);
  // A site of one page is navigated by its sections.
  const one = parseSite('# A\n\nabout\n\n## B\n\n- x');
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
  // The theme: amber, whose type is serif, light.
  assert.ok(html.includes('--a:#b45309') && html.includes('--bg:#fff') && html.includes("--font:'Iowan Old Style'"));
  assert.ok(html.includes('<title>Harbor Coffee</title>') && html.includes('content="Small-batch coffee, roasted on the quay every morning."'));
  // Two buttons sit side by side; the second is quiet.
  assert.ok(html.includes('<p class="go"><a class="btn" href="#menu">See the menu</a> <a class="btn quiet" href="#find-us">Find us</a></p>'));
  // The scripts in it are registered ones, so the policy allows them by hash and nothing typed can run.
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  assert.equal(scripts.length, 1);
  assert.ok(pageScripts().includes(scripts[0]));
  assert.ok(pageScripts().includes(PLACE_SCRIPT.slice(8, -9)) && pageScripts().includes(EDIT_SCRIPT.slice(8, -9)));
  assert.match(placeData('#menu'), /^<script type="application\/json" id="lf-at">"#menu"<\/script>$/);
  assert.ok(editData([], [], '', 3).includes('"s":3'));
  // Dark (an ink accent goes pale on a dark page), and a site of one page has a nav of its sections.
  const dark = page('theme: ink dark\n\n# A\n\nabout\n\n## B\n\n- x\n\n## C');
  assert.ok(dark.includes('--a:#e4e4e7;--on:#18181b') && dark.includes('--bg:#18181b'));
  assert.ok(dark.includes('<nav aria-label="Sections"><a href="#b">B</a><a href="#c">C</a></nav>'));
  // A page and a section may share a name: the page keeps it.
  const same = page('# A\n\n## Menu\n\n# Menu\n\nx');
  assert.ok(same.includes('id="menu">\n<div class="hero top">') && same.includes('<section class="part" id="menu-2">'));
  // Words are inline Markdown.
  assert.ok(page('# A\n\nSome **bold** and [a link](https://x.y).').includes('<p>Some <strong>bold</strong> and <a href="https://x.y">a link</a>.</p>'));
  // Nothing typed can break out.
  assert.ok(!page('# <script>alert(1)</script>\n\n# </script><script>x\n\n> a | javascript:b\n\n[x](javascript:y)').includes('<script>alert'));
  assert.ok(!page('[x](javascript:alert(1))').includes('href="javascript'));
  assert.ok(page('').startsWith('<!doctype html>'));
});

test('site: a link-in-bio page is a picture, a line of words and a stack of buttons', () => {
  const html = page(BIO);
  assert.ok(html.includes('<img class="pic" src="https://example.com/ada.jpg" alt="" loading="lazy"><h1>Ada Diaz</h1><p>Potter in Lisbon. Mugs, bowls, the odd lamp.</p>'));
  assert.ok(html.includes('<p class="go stack">'));
  assert.equal(html.match(/<a class="btn" href=/g)!.length, 3);
  assert.ok(!html.includes('class="btn quiet"'));
  // Each button carries its icon; the look is rose, which is serif.
  assert.ok(html.includes('<a class="btn" href="mailto:ada@example.com"><svg viewBox="0 0 24 24" width="20"'));
  assert.ok(html.includes('--a:#be123c') && html.includes('Georgia,serif'));
  // No pages, so no page nav; and the whole thing is small.
  assert.ok(html.includes('<nav aria-label="Sections"></nav>'));
  assert.ok(BIO.length < 400);
  assert.equal(def.title(BIO), 'Ada Diaz');
});

test('site: another document on a page, and the lines as the picture', () => {
  const ref = makeRef('sheet', 'Q | Sales\n--- | ---\nQ1 | 120\nQ2 | 180', 'Sales');
  const text = `# A\n\n# Numbers\n\n${fence(ref)}`;
  const html = spec.page!(text, { base: 'https://example.com/' });
  assert.ok(html.includes('<figure class="embed"><svg xmlns="http://www.w3.org/2000/svg"') && html.includes('aria-label="Sales"'));
  assert.ok(html.includes(`<figcaption><a href="https://example.com/#/v0/sheet/`) && html.includes('>Sales</a> <small>Sheet</small>'));
  assert.deepEqual(def.outline(text), ['A', 'Numbers', '↗  Sales']);
  assert.equal(def.view(text)[0].svg.includes('Numbers'), true);
});

test('site: the text is its own Markdown, and Markdown as it is written comes in canonical', () => {
  assert.equal(toMarkdown(spec.example), spec.example + '\n');
  assert.equal(fromMarkdown(def, toMarkdown(spec.example)), spec.example);
  assert.equal(def.read!(spec.example), spec.example);
  // Pages after "---" (one with no heading of its own is named), deeper headings as sections, links alone as buttons,
  // pictures, a table as an embedded sheet, a whole TinyLittleOffice link as the document it holds.
  const ref = makeRef('todo', '- a');
  const link = `https://tinylittleoffice.com/todo/${hashOf('todo', '- a')}`;
  assert.equal(
    readSite(`# Ada\n\nHello.\ntheme: Serif, dark teal\n\n![me](https://x.y/me.jpg)\n\n[Shop](https://x.y/shop) {.button}\n[:mail: Mail](mailto:a@x.y)\n\n---\n\n# About\n\n### Now\n\n* :star: Potter\n\n---\n\n| Q | Sales |\n| --- | --- |\n| Q1 | 120 |\n\n${link}`),
    `---\ntheme: teal serif dark\n---\n# Ada\n\nHello.\n\n![me](https://x.y/me.jpg)\n\n> Shop | https://x.y/shop\n> :mail: Mail | mailto:a@x.y\n\n# About\n\n## Now\n\n- :star: Potter\n\n# Page 3\n\n\`\`\`sheet\nQ | Sales\n--- | ---\nQ1 | 120\n\`\`\`\n\n${fence(ref)}`,
  );
});

test('site: sixteen themes, each a look, a type and a shape; dark by nature or by asking', () => {
  assert.ok(Object.keys(THEMES).length >= 16);
  for (const [id, T] of Object.entries(THEMES)) {
    const css = themeCss({ id });
    assert.ok(css.includes(`--a:${T.dark ? T.a : T.a}`) && css.includes(`--r:${T.round}rem`) && css.includes('--font:'), id);
    assert.equal(themeWords(parseTheme(`${id} dark`)), T.dark ? id : `${id} dark`);
    assert.equal(themeWords(parseTheme(`${id} light`)), T.dark ? `${id} light` : id);
  }
  // A type apart from the theme's own is kept; the theme's own is not written twice.
  assert.equal(themeWords(parseTheme('candy mono')), 'candy mono');
  assert.equal(themeWords(parseTheme('rose serif')), 'rose');
  assert.ok(isDark({ id: 'midnight' }) && !isDark({ id: 'midnight', dark: false }) && isDark({ id: 'teal', dark: true }) && !isDark({ id: 'teal' }));
  // An unknown word is let be; nothing is a theme indigo did not know.
  assert.deepEqual(parseTheme('sparkly'), { id: 'indigo' });
  assert.ok(page('theme: midnight\n\n# A').includes('--bg:#141418'));
});

test('site: a shop is a table of products in a section: a grid, one cart for the site, orders where the header says', () => {
  const SHOP = '---\ncurrency: £\norders: hi@example.com\n---\n# Harbor\n\nBeans.\n\n## Shop\n\nName | Price:money | About | Image\n--- | --- | --- | ---\nHouse blend | 12.50 | Good | https://x.y/a.jpg\nMug | 9 |  |\n\n# More\n\n## Also\n\nName | Price:money | About | Image\n--- | --- | --- | ---\nHat | 20 |  |';
  const site = parseSite(SHOP);
  assert.deepEqual([site.currency, site.orders], ['£', 'hi@example.com']);
  assert.deepEqual(site.pages[0].sections[1].products.map((p) => [p.name, p.price, p.image]), [['House blend', 12.5, 'https://x.y/a.jpg'], ['Mug', 9, '']]);
  const html = page(SHOP);
  // Every product has its button, numbered across the whole site; the cart sits by the first grid, and its script is a registered one.
  assert.ok(html.includes('data-add="0"') && html.includes('data-add="1"') && html.includes('data-add="2"'));
  assert.equal(html.match(/<aside class="cart"/g)!.length, 1);
  assert.ok(html.includes('£12.50') && html.includes('"orders":"hi@example.com"') && html.includes('Send order by email'));
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  assert.equal(scripts.length, 2);
  assert.ok(scripts.every((s) => pageScripts().includes(s)));
  assert.ok(page('# A\n\nName | Price:money | About | Image\n--- | --- | --- | ---\nMug | 9 |  |').includes('Copy order'));
  assert.ok(def.outline(SHOP).includes('Mug  ·  £9.00'));
  assert.equal(def.read!(SHOP), SHOP);
});

test('site: edited on the page itself, a "+" at the end of every section offers what can go there, and headings carry their buttons', () => {
  const html = spec.page!(spec.example, { edit: true });
  const kind = (name: string) => spec.form!.findIndex((k) => k.name === name);
  // The home page's front, then each section: a "+" after the last row of each, offering the kinds in a sensible order; a page's "+" offers a page too.
  const plus = [...html.matchAll(/<button type="button" class="lf-plus" data-lf-menu="(\d+)" data-lf-kinds="([\d,]+)"/g)].map((m) => [+m[1], m[2]]);
  assert.deepEqual(plus[0], [7, ['Paragraph', 'Card', 'Button', 'Picture', 'Product', 'Section', 'Page'].map(kind).join(',')]);
  // (The home page's front has cards, so its "+" sits in the part under its title; the other pages' fronts and the sections have their own.)
  assert.equal(plus.length, 5);
  // Pages after the home page and every section have buttons to move or remove them, by their row.
  assert.ok(html.includes('<h1>Menu<span class="lf-tools" role="group" aria-label="This page"><button type="button" data-lf-part="8" data-lf-do="up"'));
  assert.ok(html.includes('<h2>Coffee<span class="lf-tools" role="group" aria-label="This section"><button type="button" data-lf-part="10" data-lf-do="up"'));
  assert.ok(html.includes('data-lf-do="remove" aria-label="Remove this section">×</button>'));
  assert.ok(!html.includes('<h1>Harbor Coffee<span'));
  // A picture's address sits under it to type over, whichever way it was written.
  const pics = spec.page!('# A\n\n![](https://x.y/a.jpg)\n\nhttps://x.y/b.png', { edit: true });
  assert.ok(pics.includes('<span class="pic-at" data-lf="1,1"') && pics.includes('<span class="pic-at" data-lf="2,0"'));
  // None of it in the page as it is read or downloaded.
  assert.ok(!page(spec.example).includes('lf-') && !page(spec.example).includes('lf-tools'));
});

test('links: a Quick Links page is a picture, a name, a line, a stack of buttons and the small links at the foot', () => {
  const l = specOf('links')!;
  const html = l.page!(l.example);
  assert.ok(html.includes('<img class="pic" src="https://images.unsplash.com/') && html.includes('<h1>Ada Diaz</h1>'));
  assert.ok(html.includes('<p class="go stack">') && html.match(/<a class="btn" href=/g)!.length === 3);
  assert.ok(html.includes('<ul class="social" aria-label="Elsewhere"><li><a href="https://instagram.com/ada" aria-label="Instagram"'));
  assert.ok(html.includes('--a:#be123c') && !html.includes('<nav'));
  assert.equal(appOf('links')!.title(l.example), 'Ada Diaz');
  assert.equal(appOf('links')!.read!(l.example), l.example);
  // Written loosely, it comes in canonical: a link alone is a button, a list item a small link.
  assert.equal(appOf('links')!.read!('# Ada\n\n[Shop](https://x.y)\n\n- :mail: Mail | mailto:a@b.c'), '# Ada\n\n> Shop | https://x.y\n\n- :mail: Mail | mailto:a@b.c');
  // Edited: a "+" offering a paragraph, a button, a small link, a picture; no sections or pages.
  const edit = l.page!(l.example, { edit: true });
  const kind = (name: string) => l.form!.findIndex((k) => k.name === name);
  assert.ok(edit.includes(`data-lf-kinds="${['Paragraph', 'Button', 'Social', 'Picture'].map(kind).join(',')}"`));
  assert.ok(!edit.includes('data-lf-part'));
});

test('lines: headings of two kinds nest, and a part moves or goes with everything under it', () => {
  const form = spec.form!;
  const rows = readLines(spec.example, form);
  assert.equal(writeLines(rows, form), spec.example);
  const kind = (name: string) => form.findIndex((k) => k.name === name);
  assert.deepEqual([headLevel(form, kind('Page')), headLevel(form, kind('Section')), headLevel(form, kind('Card'))], [1, 2, 0]);
  // Each page's lines sit one in; a section one in from its page; its cards one more again.
  assert.deepEqual(depths(rows, form), [0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 2, 2, 1, 2, 0, 1, 1]);
  // Find us, moved earlier, goes before Menu with its words and button.
  const moved = movePart(rows, form, 15, -1)!;
  assert.equal(writeLines(moved, form).split('\n\n').slice(4, 8).join('\n\n'), '# Find us\n\n14 Quay Street, open 7 to 3, every day but Monday.\n\n> Email us | mailto:hello@example.com\n\n# Menu');
  assert.equal(movePart(rows, form, 15, 1), null);
  assert.deepEqual(movePart(rows, form, 8, 1), moved);
  // A section moves past its neighbour within the page, not out of it.
  assert.equal(writeLines(movePart(rows, form, 13, -1)!, form).split('\n\n').slice(6, 10).join('\n\n'), '## Pastry\n\n- Cardamom bun | 3.50\n\n## Coffee\n\n- Espresso | 3.00\n- Flat white | 4.20');
  assert.equal(movePart(rows, form, 10, -1), null);
  // Removed, a page takes its sections with it.
  assert.equal(writeLines(removePart(rows, form, 8), form), spec.example.replace(/# Menu[\s\S]*?(?=# Find us)/, ''));
  // An app with one heading kind: its rows sit one in under a section.
  const menu: LineKind[] = [{ name: 'Name', is: '# {Name}', once: true }, { name: 'Section', is: '## {Section}', head: true }, { name: 'Dish', is: '{Dish} | {Price:money} | {About}', table: true }, { name: 'Line', is: '{Text}' }];
  assert.deepEqual(depths(readLines('# Cafe\n\n## Coffee\n\nDish | Price\n--- | ---\nEspresso | 3.00\n\n## Tea', menu), menu), [0, 0, 1, 0]);
});
