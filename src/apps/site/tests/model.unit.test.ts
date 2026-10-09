// Website under node: the site read from the document (pages, sections, cards, buttons, pictures, icons, a
// shop, documents and things from the web), the page it becomes (its nav, its ids, its look, its registered
// scripts, nothing typed able to run), the preview's marks, a Quick Links page, the sixteen themes at AA in
// light and dark, every command as ops, the pictures of the pages, and the templates.
import { expect, test } from 'vitest';
import { applyAll, invertAll, parse, write, type Doc } from '../../../doc/index.ts';
// The registry, so a document held in a page is drawn by its own app.
import { appOf } from '../../../kit/apps.ts';
import { iconNamed } from '../../../kit/icons.ts';
import { pageScripts } from '../../../kit/page.ts';
import site from '../def.ts';
import { addOps, duplicateOps, fieldsOf, partBlocks, pasteOps, kindsOf, linesOf, linksOp, moveOps, readSite, removeOps, retitle, sectionAt, settingOp, themeOp, titleOf } from '../model.ts';
import { templates } from '../templates.ts';
import { contrast, isDark, paletteOf, parseTheme, themeCss, themeWords, THEMES } from '../theme.ts';
import { CART, EDIT, ROUTER, WEB, sitePage, sitePictures } from '../view.ts';

const CAFE = templates().find((t) => t.id === 'cafe')!.doc;
const SHOP = templates().find((t) => t.id === 'shop')!.doc;
const MAKER = templates().find((t) => t.id === 'links-maker')!.doc;
const page = (text: string, o = {}) => sitePage(parse(text), o);
const scriptsIn = (html: string) => [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const code = (tag: string) => tag.slice('<script>'.length, -'</script>'.length);
const run = (doc: Doc, ops: ReturnType<typeof removeOps>) => write(applyAll(doc, ops!));

test('pages, sections, theme, pictures, icons, documents and buttons are read from the blocks, each with its span', () => {
  const text = '---\ntheme: teal serif dark\n---\n# Harbor\n\nOn the quay.\n\n:coffee:\n\n> :mail: Write | mailto:a@b.c\n> Menu | #menu\n> Bad | javascript:alert(1)\n\n# Menu\n\nEspresso.\n\n## Coffee\n\n- :coffee: Espresso | 3.00\n\nhttps://example.com/beans.png\n\n```todo\n- grind\n```\n\n# Last\n\nLast.\n';
  const s = readSite(parse(text));
  expect(s.name).toBe('Harbor');
  expect(s.theme).toEqual({ id: 'teal', face: 'serif', dark: true });
  expect(s.pages.map((p) => [p.title, p.id, p.from, p.to])).toEqual([['', 'home', 0, 4], ['Menu', 'menu', 4, 10], ['Last', 'last', 10, 12]]);
  const [home, coffee] = [s.sections[0], s.sections[2]];
  expect(home.text.map((r) => r.map((x) => x.t).join(''))).toEqual(['On the quay.']);
  expect(home.icon).toBe('coffee');
  expect(home.buttons).toEqual([{ icon: 'mail', label: 'Write', url: 'mailto:a@b.c' }, { icon: '', label: 'Menu', url: '#menu' }, { icon: '', label: 'Bad', url: '#' }]);
  expect([home.title, home.at, home.from, home.to]).toEqual(['Harbor', 0, 0, 4]);
  expect(s.sections.map((x) => [x.n, x.page, x.title, x.from, x.to])).toEqual([[0, 0, 'Harbor', 0, 4], [1, 1, 'Menu', 4, 6], [2, 1, 'Coffee', 6, 10], [3, 2, 'Last', 10, 12]]);
  expect(coffee.cards.map((c) => [c.icon, c.head[0].t, c.detail[0].t])).toEqual([['coffee', 'Espresso', '3.00']]);
  expect(coffee.pics).toEqual([{ url: 'https://example.com/beans.png', alt: '' }]);
  expect(coffee.embeds).toEqual([{ lang: 'todo', body: '- grind' }]);
  expect(sectionAt(s, 7)).toBe(2);
  // A site of one page is navigated by its sections; lines and fields are cut where the text says.
  expect(readSite(parse('# A\n\nabout\n\n## B\n\n- x\n')).pages[0].sections.map((x) => x.title)).toEqual(['A', 'B']);
  const li = parse('- **Big** one | small *words*\n').blocks[0];
  const [a, b] = fieldsOf(li.k === 'li' ? li.runs : []);
  expect([a, b]).toEqual([[{ t: 'Big', b: true }, { t: ' one' }], [{ t: 'small ' }, { t: 'words', i: true }]]);
  expect(linesOf([{ t: 'a\nb', b: true }, { t: '', ic: 'star' }])).toEqual([[{ t: 'a', b: true }], [{ t: 'b', b: true }, { t: '', ic: 'star' }]]);
});

test('the page: a nav of its pages, each a section switched by a registered script, and the look asked for', () => {
  const html = page(CAFE);
  expect(html).toContain('<nav aria-label="Pages"><a href="#home">Home</a><a href="#menu">Menu</a><a href="#find-us">Find us</a></nav>');
  expect(html).toContain('<section class="page" id="home">');
  expect(html).toContain('<section class="part" id="coffee"><div class="wrap"><h2>Coffee</h2>');
  // Amber: serif, light; every shade is an oklch() the browser shows as written.
  expect(html).toMatch(/--a:oklch\([\d.]+ [\d.]+ [\d.]+\);--on:#ffffff/);
  expect(html).toContain("--font:'Iowan Old Style'");
  expect(html).toContain('<title>Harbor Coffee</title>');
  expect(html).toContain('content="Small-batch coffee, roasted on the quay every morning."');
  // Two buttons side by side, the second quiet; the cards of the front in a part under it.
  expect(html).toContain('<p class="go"><a class="btn" href="#menu">See the menu</a> <a class="btn quiet" href="#find-us">Find us</a></p>');
  expect(html).toContain('<ul class="cards"><li><svg viewBox="0 0 24 24" width="28"');
  // The scripts are registered ones, so the policy allows them by hash; the map is a card to tap, loaded by WEB.
  const scripts = scriptsIn(html);
  expect(scripts).toEqual([code(ROUTER), code(WEB)]);
  for (const s of scripts) expect(pageScripts()).toContain(s);
  for (const s of [ROUTER, WEB, CART, EDIT]) expect(pageScripts()).toContain(code(s));
  // Dark: an ink accent goes pale; a site of one page has a nav of its sections.
  const dark = page('---\ntheme: ink dark\n---\n# A\n\nabout\n\n## B\n\n- x\n\n## C\n');
  expect(dark).toContain('--on:#18181b');
  expect(dark).toContain('--bg:#18181b');
  expect(dark).toContain('<nav aria-label="Sections"><a href="#b">B</a><a href="#c">C</a></nav>');
  // A page and a section may share a name: the page keeps it.
  const same = page('# A\n\n## Menu\n\n# Menu\n\nx\n');
  expect(same).toContain('<section class="page" id="menu">');
  expect(same).toContain('<section class="part" id="menu-2">');
  // Words are inline Markdown; nothing typed can break out.
  expect(page('# A\n\nSome **bold** and [a link](https://x.y).\n')).toContain('<p>Some <strong>bold</strong> and <a href="https://x.y">a link</a>.</p>');
  const evil = page('# <script>alert(1)</script>\n\n# </script><script>x\n\n> a | javascript:b\n\n[x](javascript:y)\n');
  expect(evil).not.toContain('<script>alert');
  expect(evil).not.toContain('href="javascript');
  expect(scriptsIn(evil).every((s) => pageScripts().includes(s))).toBe(true);
  expect(page('')).toMatch(/^<!doctype html>/);
});

test('another document on a page: a picture of it and a link that opens it', () => {
  const html = page('# A\n\n# Numbers\n\n```sheet\nQ | Sales:number\n--- | ---\nQ1 | 120\n```\n', { base: 'https://tinylittleoffice.com/' });
  expect(html).toContain('<figure class="embed"><svg xmlns="http://www.w3.org/2000/svg"');
  expect(html).toContain('<figcaption><a href="https://tinylittleoffice.com/#/v1/sheet/');
  expect(html).toContain(`<small>${appOf('sheet')!.name}</small>`);
  // A table that is not a shop is a sheet on the page too.
  expect(readSite(parse('# A\n\nQ | Sales\n--- | ---\nQ1 | 120\n')).sections[0].embeds).toEqual([{ lang: 'sheet', body: 'Q | Sales\n--- | ---\nQ1 | 120' }]);
});

test('a shop: a table of products, one cart for the site, its words and the orders in its data', () => {
  const s = readSite(parse(SHOP));
  expect([s.currency, s.orders]).toEqual(['£', 'orders@quaypottery.example']);
  const shop = s.sections.find((x) => x.products.length)!;
  expect(shop.products.map((p) => [p.name, p.price])).toEqual([['Harbour mug', 24], ['Breakfast bowl', 30], ['Bud vase', 18]]);
  const html = page(SHOP);
  expect(html).toContain('data-add="0"');
  expect(html).toContain('data-add="2"');
  expect(html.match(/<aside class="cart"/g)!.length).toBe(1);
  expect(html).toContain('£24.00');
  expect(html).toContain('"orders":"orders@quaypottery.example"');
  expect(html).toContain('"order":"Order from Quay Pottery"');
  expect(html).toContain('Send order by email');
  expect(scriptsIn(html)).toEqual([code(CART), code(ROUTER)]);
  // A price worked out by a formula is the price; with nowhere for orders to go, the order is copied.
  const bare = '# A\n\nName | Price:money | About | Image\n--- | --- | --- | ---\nMug | =4*2 |  |\n';
  expect(readSite(parse(bare)).sections[0].products[0].price).toBe(8);
  expect(page(bare)).toContain('Copy order');
});

test('the preview: a "+" in every section, handles on every heading but the home page’s, each part marked, the section in hand outlined', () => {
  const html = page(CAFE, { edit: { cur: 2, stamp: 7 } });
  const plus = [...html.matchAll(/data-site-add="(\d+)"/g)].map((m) => +m[1]);
  expect(plus).toEqual([0, 1, 2, 3, 4]);
  expect(html).toContain('<h1>Menu<span class="site-tools" role="group" aria-label="This page"><button type="button" data-site-part="1" data-site-do="up" aria-label="Move this page earlier">↑</button>');
  expect(html).toContain('<h2>Coffee<span class="site-tools" role="group" aria-label="This section"><button type="button" data-site-part="2" data-site-do="up"');
  expect(html).toContain('data-site-do="remove" aria-label="Remove this section">×</button>');
  expect(html).not.toContain('<h1>Harbor Coffee<span');
  expect(html).toContain('<section class="part site-cur" id="coffee" data-s="2">');
  // What the frame's script needs: the stamp, the section, the kinds and their names; the page to show first.
  expect(html).toContain('"cur":2,"stamp":7');
  expect(html).toContain('["card","Card"]');
  expect(html).toContain('<script type="application/json" id="site-at">"menu"</script>');
  expect(scriptsIn(html)).toEqual([code(ROUTER), code(WEB), code(EDIT)]);
  // None of it in the page as it is downloaded.
  const plain = page(CAFE);
  for (const mark of ['site-plus', 'site-tools', 'site-cur', 'site-edit', 'site-at"']) expect(plain).not.toContain(mark);
  expect(plain).not.toContain('data-s=');
});

test('Quick Links: one column, a picture, a name, a line, a stack of buttons, the small links at the foot', () => {
  const html = page(MAKER);
  expect(html).toContain('<main class="hero"><div><img class="pic" src="https://images.unsplash.com/');
  expect(html).toContain('<h1>Ada Diaz</h1><p>Potter in Lisbon. Mugs, bowls, the odd lamp.</p>');
  expect(html).toContain('<p class="go stack">');
  expect(html.match(/<a class="btn" href=/g)!.length).toBe(3);
  expect(html).toContain('<ul class="social" aria-label="Elsewhere"><li><a href="https://instagram.com/ada" aria-label="Instagram"');
  expect(html).not.toContain('<nav');
  expect(scriptsIn(html)).toEqual([]);
  expect(titleOf(MAKER)).toBe('Ada Diaz');
  // Edited: a "+" offering what a links page takes.
  expect(kindsOf(readSite(parse(MAKER)))).toEqual(['p', 'button', 'link', 'picture', 'icon']);
  expect(page(MAKER, { edit: { cur: 0, stamp: 1 } })).toContain('["link","Small link"]');
  // The same lines with the shape changed are a website: the list items cards.
  const asSite = write(applyAll(parse(MAKER), [linksOp(false)]));
  expect(readSite(parse(asSite)).sections[0].cards.length).toBe(2);
});

test('a thing from the web in a section is a card on the page, loaded only by its button', () => {
  const text = '# A\n\nWatch this.\n\nhttps://youtu.be/dQw4w9WgXcQ\n\n## Listen\n\nhttps://example.org/talk.mp3\n\nhttps://en.wikipedia.org/wiki/Ada_Lovelace\n';
  const s = readSite(parse(text));
  expect(s.sections[0].embeds).toEqual([{ web: 'https://youtu.be/dQw4w9WgXcQ' }]);
  const html = page(text);
  expect(html).toContain('<div class="web-pic" data-as="frame" data-kind="video" data-src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" data-title="Video dQw4w9WgXcQ"><button type="button" class="btn web-load">Play (loads it from YouTube)</button></div>');
  expect(html).not.toContain('<iframe');
  expect(html).toContain('data-as="audio" data-kind="audio" data-src="https://example.org/talk.mp3"');
  // Wikipedia must be asked first: the link alone.
  expect(html).toContain('>Ada Lovelace</a> <small>Wikipedia</small>');
  expect(html).not.toContain('loads it from Wikipedia');
  expect(scriptsIn(page('# A\n\nJust words.\n'))).toEqual([code(ROUTER)]);
  // The document is kept as written.
  expect(write(parse(text))).toBe(text);
});

test('sixteen themes, each a look, a type and a roundness; the words written canonically; dark by nature or by asking', () => {
  expect(Object.keys(THEMES).length).toBe(16);
  for (const [id, T] of Object.entries(THEMES)) {
    const css = themeCss({ id });
    expect(css).toContain(`--r:${T.round}rem`);
    expect(themeWords(parseTheme(`${id} dark`))).toBe(T.dark ? id : `${id} dark`);
    expect(themeWords(parseTheme(`${id} light`))).toBe(T.dark ? `${id} light` : id);
  }
  expect(themeWords(parseTheme('candy mono'))).toBe('candy mono');
  expect(themeWords(parseTheme('rose serif'))).toBe('rose');
  expect(isDark({ id: 'midnight' }) && !isDark({ id: 'midnight', dark: false }) && isDark({ id: 'teal', dark: true }) && !isDark({ id: 'teal' })).toBe(true);
  expect(parseTheme('sparkly')).toEqual({ id: 'indigo' });
});

test('every theme reads at AA, light and dark: words on the accent, the deep shade on the tint and the page, the accent as a mark', () => {
  for (const id of Object.keys(THEMES))
    for (const dark of [false, true]) {
      const p = paletteOf({ id, dark });
      const what = `${id} ${dark ? 'dark' : 'light'}`;
      expect(contrast(p.on, p.hex.a), `${what}: words on the accent`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.hex.deep, p.hex.tint), `${what}: deep on the tint`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.hex.deep, p.bg), `${what}: links`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.hex.a, p.bg), `${what}: the accent as a mark`).toBeGreaterThanOrEqual(3);
      expect(contrast(p.ink3, p.bg), `${what}: the faintest words`).toBeGreaterThanOrEqual(4.5);
    }
});

test('commands as ops: a thing added is one splice (a product one rows), a part moved one move, removed one splice; each undoes exactly', () => {
  const doc = parse(CAFE);
  const s = readSite(doc);
  const check = (ops: ReturnType<typeof addOps>['ops']) => {
    const after = applyAll(doc, ops);
    expect(write(parse(write(after)))).toBe(write(after));
    expect(write(applyAll(after, invertAll(doc, ops)))).toBe(CAFE);
    return write(after);
  };
  // A card at the end of the Coffee section; a section after it; a page after the Menu page.
  const card = addOps(doc, s, 2, 'card');
  expect(card.ops).toEqual([{ op: 'splice', at: 12, n: 0, blocks: [{ k: 'li', depth: 0, runs: [{ t: 'Heading | A line about it' }] }] }]);
  expect(check(card.ops)).toContain('- Filter, by the cup | 3.50\n- Heading | A line about it\n');
  expect(addOps(doc, s, 2, 'section').ops).toEqual([{ op: 'splice', at: 12, n: 0, blocks: [{ k: 'h', level: 2, runs: [{ t: 'New section' }] }] }]);
  expect(check(addOps(doc, s, 2, 'page').ops)).toContain('- Sourdough toast, butter and jam | 4.00\n\n# New page\n\n# Find us');
  expect(check(addOps(doc, s, 0, 'button', 'https://x.y').ops)).toContain('> Label | https://x.y\n');
  expect(check(addOps(doc, s, 4, 'picture', 'https://x.y/p.jpg').ops)).toContain('![](https://x.y/p.jpg)\n');
  expect(check(addOps(doc, s, 4, 'icon', 'heart').ops)).toContain('> Email us | mailto:hello@harborcoffee.example\n\n:heart:\n');
  // A product: a new table where there is none, a row where there is.
  expect(check(addOps(doc, s, 4, 'product').ops)).toContain('Name | Price:money | About | Image\n--- | --- | --- | ---\nNew thing | 10 |  |\n');
  const shop = parse(SHOP);
  const ss = readSite(shop);
  const row = addOps(shop, ss, 1, 'product');
  expect(row.ops).toEqual([{ op: 'rows', at: ss.sections[1].shop, r: 3, n: 1, rows: [['New thing', '10', '', '']] }]);
  expect(readSite(applyAll(shop, row.ops)).sections[1].products.length).toBe(4);
  // Find us, moved earlier, goes before Menu with its words; the Menu page moved later is the same; the first page cannot pass the home page.
  const up = moveOps(s, 4, -1)!;
  expect(up).toEqual([{ op: 'move', at: 15, n: 4, to: 6 }]);
  expect(check(up).indexOf('# Find us')).toBeLessThan(check(up).indexOf('# Menu'));
  expect(write(applyAll(doc, moveOps(s, 1, 1)!))).toBe(write(applyAll(doc, up)));
  expect(moveOps(s, 1, -1)).toBeNull();
  expect(moveOps(s, 4, 1)).toBeNull();
  expect(moveOps(s, 0, 1)).toBeNull();
  // A section passes its neighbour within its page, not out of it.
  expect(check(moveOps(s, 3, -1)!)).toContain('## Pastry\n\n- Cardamom bun | 3.50\n- Sourdough toast, butter and jam | 4.00\n\n## Coffee');
  expect(moveOps(s, 2, -1)).toBeNull();
  expect(moveOps(s, 3, 1)).toBeNull();
  // Removed, a page takes its sections with it; the home page stays.
  expect(run(doc, removeOps(s, 1))).not.toContain('## Coffee');
  expect(run(doc, removeOps(s, 1))).toContain('# Find us');
  expect(run(doc, removeOps(s, 3))).not.toContain('Pastry');
  expect(removeOps(s, 0)).toBeNull();
  // The look and the shop's settings are head fields.
  expect(write(applyAll(doc, [themeOp({ id: 'forest', dark: true })]))).toMatch(/^---\ntheme: forest dark\n---\n/);
  expect(write(applyAll(doc, [themeOp({ id: 'indigo' })]))).toMatch(/^# Harbor Coffee/);
  expect(write(applyAll(doc, [linksOp(true)]))).toMatch(/^---\ntheme: amber\nlook: links\n---\n/);
  expect(write(applyAll(shop, [settingOp('currency', ' ')]))).not.toContain('currency:');
});

test('a thing at the caret, a part duplicated, copied and pasted after itself: each one splice that undoes exactly', () => {
  const doc = parse(CAFE);
  const s = readSite(doc);
  const coffee = s.sections[2];
  const check = (ops: ReturnType<typeof addOps>['ops']) => {
    const after = applyAll(doc, ops);
    expect(write(applyAll(after, invertAll(doc, ops)))).toBe(CAFE);
    return write(after);
  };
  // Under the caret's block (Espresso), not at the end of the section; a caret outside the section is the end; a page still goes after its page.
  const card = addOps(doc, s, 2, 'card', '', coffee.from + 1);
  expect(card.at).toBe(coffee.from + 2);
  expect(check(card.ops)).toContain('- Espresso | 3.00\n- Heading | A line about it\n- Flat white');
  expect(addOps(doc, s, 2, 'card', '', 0).at).toBe(coffee.to);
  expect(addOps(doc, s, 2, 'page', '', coffee.from + 1).at).toBe(s.pages[1].to);
  // A section duplicated: its copy right after it, in the same page; a page with its sections; never the home page.
  const dup = duplicateOps(doc, s, 2)!;
  expect(dup.at).toBe(coffee.to);
  const twice = check(dup.ops);
  expect(twice.match(/## Coffee/g)!.length).toBe(2);
  expect(twice).toContain('- Filter, by the cup | 3.50\n\n## Coffee\n\n- Espresso');
  expect(readSite(applyAll(doc, dup.ops)).sections[3].title).toBe('Coffee');
  expect(check(duplicateOps(doc, s, 1)!.ops).match(/# Menu\n/g)!.length).toBe(2);
  expect(duplicateOps(doc, s, 0)).toBeNull();
  // Copied: the part's blocks (a page with its sections; the home page its front section); pasted after the part in hand.
  expect(partBlocks(doc, s, 1).length).toBe(s.pages[1].to - s.pages[1].from);
  expect(partBlocks(doc, s, 0)).toEqual(doc.blocks.slice(0, s.sections[0].to));
  const pasted = pasteOps(s, 4, partBlocks(doc, s, 3))!;
  expect(pasted.at).toBe(s.sections[4].to);
  expect(check(pasted.ops).trimEnd().endsWith('## Pastry\n\n- Cardamom bun | 3.50\n- Sourdough toast, butter and jam | 4.00')).toBe(true);
  expect(pasteOps(s, 0, [])).toBeNull();
});

test('the name is the first heading; renamed, that heading changes, or one is put in at the top', () => {
  expect(titleOf(CAFE)).toBe('Harbor Coffee');
  expect(titleOf('---\ntitle: Named\n---\n# A\n')).toBe('Named');
  expect(retitle('# A\n\nwords\n', 'Harbor *Tea*')).toBe('# Harbor *Tea*\n\nwords\n');
  expect(retitle('words\n', 'New')).toBe('# New\n\nwords\n');
  expect(site.title(retitle(CAFE, 'Quay Café'))).toBe('Quay Café');
});

test('the pictures: a page each, the theme’s colours, the home page alone when small', () => {
  const pages = site.view(CAFE);
  expect(pages.length).toBe(3);
  expect(pages.map((p) => p.alt)).toEqual(['Harbor Coffee', 'Menu', 'Find us']);
  expect(pages[0].svg).toContain('Harbor Coffee');
  expect(pages[0].svg).toContain(paletteOf(parseTheme('amber')).hex.a);
  expect(site.view(CAFE, { small: true }).length).toBe(1);
  expect(sitePictures('').length).toBe(1);
  expect(sitePictures(MAKER)[0].svg).toContain('Ada Diaz');
});

test('the templates: real sites and Quick Links pages, every icon one the page can draw; the download is the site itself', async () => {
  expect(site.templates.map((t) => t.id)).toEqual(['cafe', 'shop', 'event', 'links-maker', 'links-group', 'links-band', 'links-business', 'links-writer']);
  for (const tpl of site.templates) {
    expect(write(parse(tpl.doc))).toBe(tpl.doc);
    for (const [, name] of tpl.doc.matchAll(/:([a-z0-9-]+):/g)) expect(iconNamed(name), `${tpl.id}: ${name}`).toBeTruthy();
    expect(tpl.id.startsWith('links-')).toBe(readSite(parse(tpl.doc)).links);
  }
  const html = site.exports!.find((x) => x.ext === 'html')!;
  const out = (await html.build(CAFE, { title: 'Harbor Coffee', link: 'https://tinylittleoffice.com/#/v1/site/abc' })) as string;
  expect(out).toMatch(/^<!doctype html>/);
  expect(out).not.toContain('site-edit');
});
