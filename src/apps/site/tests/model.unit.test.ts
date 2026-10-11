// Website under node: the site read from the document (pages, sections, cards, buttons, pictures, icons, a
// shop, documents and things from the web), the page it becomes (its nav, its ids, its look, its registered
// scripts, nothing typed able to run), the preview's marks, a Quick Links page, the sixteen themes at AA in
// light and dark, every command as ops, the pictures of the pages, and the templates.
import { expect, test } from 'vitest';
import { applyAll, invertAll, parse, write, type Block } from '../../../doc/index.ts';
// The registry, so a document held in a page is drawn by its own app.
import { appOf } from '../../../kit/apps.ts';
import { embedOf } from '../../../kit/embeds.ts';
import { iconNamed } from '../../../kit/icons.ts';
import { pageScripts } from '../../../kit/page.ts';
import site from '../def.ts';
import {
  cardFields,
  cardRuns,
  duplicateObj,
  fieldsOf,
  insertObj,
  keptRuns,
  kindsOf,
  linesOf,
  linkFields,
  linkRuns,
  linksOp,
  moveObj,
  moveOps,
  objBlocks,
  objectsOf,
  objId,
  pasteObj,
  readSite,
  removeObj,
  retitle,
  settingOp,
  splitOps,
  themeOp,
  titleOf,
  withLine,
  wordsOf,
  wordsOps,
} from '../model.ts';
import { templates } from '../templates.ts';
import { contrast, isDark, paletteOf, parseTheme, themeCss, themeWords, THEMES } from '../theme.ts';
import { CART, PEEK, ROUTER, WEB, sitePage, sitePictures } from '../view.ts';

const CAFE = templates().find((t) => t.id === 'cafe')!.doc;
const SHOP = templates().find((t) => t.id === 'shop')!.doc;
const MAKER = templates().find((t) => t.id === 'links-maker')!.doc;
const page = (text: string, o = {}) => sitePage(parse(text), o);
const scriptsIn = (html: string) => [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const code = (tag: string) => tag.slice('<script>'.length, -'</script>'.length);

test('pages, sections, theme, pictures, icons, documents and buttons are read from the blocks, each with its span', () => {
  const text =
    '---\ntheme: teal serif dark\n---\n# Harbor\n\nOn the quay.\n\n:coffee:\n\n> :mail: Write | mailto:a@b.c\n> Menu | #menu\n> Bad | javascript:alert(1)\n\n# Menu\n\nEspresso.\n\n## Coffee\n\n- :coffee: Espresso | 3.00\n\nhttps://example.com/beans.png\n\n```todo\n- grind\n```\n\n# Last\n\nLast.\n';
  const s = readSite(parse(text));
  expect(s.name).toBe('Harbor');
  expect(s.theme).toEqual({ id: 'teal', face: 'serif', dark: true });
  expect(s.pages.map((p) => [p.title, p.id, p.from, p.to])).toEqual([
    ['', 'home', 0, 4],
    ['Menu', 'menu', 4, 10],
    ['Last', 'last', 10, 12],
  ]);
  const [home, coffee] = [s.sections[0], s.sections[2]];
  expect(home.text.map((r) => r.map((x) => x.t).join(''))).toEqual(['On the quay.']);
  expect(home.icon).toBe('coffee');
  expect(home.buttons).toEqual([
    { icon: 'mail', label: 'Write', url: 'mailto:a@b.c' },
    { icon: '', label: 'Menu', url: '#menu' },
    { icon: '', label: 'Bad', url: '#' },
  ]);
  expect([home.title, home.at, home.from, home.to]).toEqual(['Harbor', 0, 0, 4]);
  expect(s.sections.map((x) => [x.n, x.page, x.title, x.from, x.to])).toEqual([
    [0, 0, 'Harbor', 0, 4],
    [1, 1, 'Menu', 4, 6],
    [2, 1, 'Coffee', 6, 10],
    [3, 2, 'Last', 10, 12],
  ]);
  expect(coffee.cards.map((c) => [c.icon, c.head[0].t, c.detail[0].t])).toEqual([['coffee', 'Espresso', '3.00']]);
  expect(coffee.pics).toEqual([{ url: 'https://example.com/beans.png', alt: '' }]);
  expect(coffee.embeds).toEqual([{ lang: 'todo', body: '- grind' }]);
  // A site of one page is navigated by its sections; lines and fields are cut where the text says.
  expect(readSite(parse('# A\n\nabout\n\n## B\n\n- x\n')).pages[0].sections.map((x) => x.title)).toEqual(['A', 'B']);
  const li = parse('- **Big** one | small *words*\n').blocks[0];
  const [a, b] = fieldsOf(li.k === 'li' ? li.runs : []);
  expect([a, b]).toEqual([
    [{ t: 'Big', b: true }, { t: ' one' }],
    [{ t: 'small ' }, { t: 'words', i: true }],
  ]);
  expect(
    linesOf([
      { t: 'a\nb', b: true },
      { t: '', ic: 'star' },
    ]),
  ).toEqual([
    [{ t: 'a', b: true }],
    [
      { t: 'b', b: true },
      { t: '', ic: 'star' },
    ],
  ]);
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
  for (const s of [ROUTER, WEB, CART, PEEK]) expect(pageScripts()).toContain(code(s));
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
  expect(shop.products.map((p) => [p.name, p.price])).toEqual([
    ['Harbour mug', 24],
    ['Breakfast bowl', 30],
    ['Bud vase', 18],
  ]);
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

test('the editor’s frame: every thing marked with its id and its words with their part, the words and the thing in hand in the data, the frame’s script from the site; none of it downloaded', () => {
  const html = page(CAFE, { cur: 2, edit: { stamp: 7, held: '2.1', y: 120 } });
  // The site's name, its line, its two buttons (lines of one quote), its three big links; a page's heading; a section's.
  expect(html).toContain('<h1 data-o="0" data-w="0:0">Harbor Coffee</h1><p data-o="1" data-w="1:0" data-empty="Words for the page">Small-batch coffee, roasted on the quay every morning.</p>');
  expect(html).toContain(
    '<p class="go"><a class="btn" data-o="2.0" href="#menu"><span data-w="2.0:label" data-empty="Label">See the menu</span></a> <a class="btn quiet" data-o="2.1" href="#find-us"><span data-w="2.1:label" data-empty="Label">Find us</span></a></p>',
  );
  expect(html).toContain('<ul class="cards"><li data-o="3"><svg');
  expect(html).toMatch(
    /<li data-o="3"><svg[^]*?<\/svg><strong data-w="3:head" data-empty="Heading">Roasted daily<\/strong><span data-w="3:detail" data-empty="A line about it">Never more than a week old<\/span><\/li>/,
  );
  expect(html).toContain('<div class="hero" data-sec="0">');
  expect(html).toContain('<section class="part" id="coffee" data-sec="8"><div class="wrap"><h2 data-o="8" data-w="8:0">Coffee</h2>');
  expect(html).toContain('<figure class="embed" data-o="17">');
  // What the frame's script needs: the stamp, the thing in hand, the scroll to keep, every thing's words; the page to show first.
  expect(html).toContain('{"stamp":7,"held":"2.1","y":120,"show":false,"dark":false,"words":{');
  expect(html).toContain('"1:0":{"next":true,"breaks":true,"runs":[{"t":"Small-batch coffee, roasted on the quay every morning."}],"kind":"rich"');
  expect(html).toContain('"2.1:label":{"next":false,"breaks":false,"runs":[{"t":"Find us"}],"kind":"plain"');
  expect(html).toContain('<script type="application/json" id="site-at">"menu"</script>');
  // The editor's script is the frame's, from the site ('self' in the policy the frame inherits), never inline.
  expect(html).toContain('<script src="/site-frame.js"></script>');
  expect(page(CAFE, { edit: { stamp: 1, src: 'https://x.example/site-frame.js' } })).toContain('<script src="https://x.example/site-frame.js"></script>');
  expect(scriptsIn(html)).toEqual([code(ROUTER), code(WEB)]);
  // None of it in the page as it is downloaded; the Preview carries only its Escape.
  const plain = page(CAFE);
  for (const mark of ['data-o=', 'data-sec=', 'data-w=', 'site-cur', 'site-edit', 'site-at"', 'site-peek', 'site-frame.js']) expect(plain).not.toContain(mark);
  const peek = page(CAFE, { cur: 4, peek: 3 });
  expect(peek).not.toContain('data-o=');
  expect(peek).toContain('<script type="application/json" id="site-at">"find-us"</script>');
  expect(scriptsIn(peek)).toEqual([code(ROUTER), code(WEB), '{"stamp":3}', code(PEEK)].filter((x) => !x.startsWith('{')));
  // A home page with no name yet: its heading is still a thing to tap, its id -1.
  expect(page('', { edit: { stamp: 1 } })).toContain('<h1 data-o="-1" data-w="-1:0">My site</h1>');
});

test('the things of a site in the order of the document, rows of cards, buttons and small links; a heading inside a section is a thing, not a section', () => {
  const doc = parse('# Site\n\nWords.\n\n> A | #a\n> B | #b\n\n- :star: One | first\n- Two | second\n\n![Cup](https://x.example/c.png)\n\n## Part\n\n### Under\n\nMore.\n\n:heart:\n');
  const s = readSite(doc);
  expect(s.sections.map((x) => x.title)).toEqual(['Site', 'Part']);
  expect(objectsOf(s).map((o) => `${o.kind}:${objId(o)}`)).toEqual(['page:0', 'p:1', 'button:2.0', 'button:2.1', 'card:3', 'card:4', 'picture:5', 'section:6', 'heading:7', 'p:8', 'icon:9']);
  const html = page(write(doc));
  // In order: the words and buttons under the title; the cards, a row, begin the part below; the picture after them.
  expect(html).toMatch(
    /<h1>Site<\/h1><p>Words\.<\/p><p class="go">.*<\/p><\/div><\/div>\n<div class="part"><div class="wrap"><ul class="cards">.*<\/ul><img class="pic" src="https:\/\/x\.example\/c\.png" alt="Cup"/,
  );
  expect(html).toContain('<h2>Part</h2><h3>Under</h3><p>More.</p><svg class="ico"');
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
  // Edited: Insert offers what a links page takes; its small links are things to tap.
  expect(kindsOf(readSite(parse(MAKER)))).toEqual(['p', 'button', 'link', 'picture', 'icon', 'web']);
  expect(page(MAKER, { edit: { stamp: 1 } })).toContain('<li data-o="4"><a href="https://instagram.com/ada"');
  expect(page(MAKER, { edit: { stamp: 1 } })).toMatch(/<li data-o="4"><a [^]*?<\/a><span class="site-label" data-w="4:label" data-empty="Label">Instagram<\/span><\/li>/);
  // The same lines with the shape changed are a website: the list items cards.
  const asSite = write(applyAll(parse(MAKER), [linksOp(false)]));
  expect(readSite(parse(asSite)).sections[0].cards.length).toBe(2);
});

test('a thing from the web in a section is a card on the page, loaded only by its button', () => {
  const text = '# A\n\nWatch this.\n\nhttps://youtu.be/dQw4w9WgXcQ\n\n## Listen\n\nhttps://example.org/talk.mp3\n\nhttps://en.wikipedia.org/wiki/Ada_Lovelace\n';
  const s = readSite(parse(text));
  expect(s.sections[0].embeds).toEqual([{ web: 'https://youtu.be/dQw4w9WgXcQ' }]);
  const html = page(text);
  expect(html).toContain(
    '<div class="web-pic" data-as="frame" data-kind="video" data-src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" data-title="YouTube video"><button type="button" class="btn web-load">Play (loads it from YouTube)</button></div>',
  );
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

test('the things as ops: each moved, removed, duplicated, copied, pasted and put in is a splice or a move that undoes exactly, and says what is in hand after', () => {
  const doc = parse(CAFE);
  const s = readSite(doc);
  const check = (c: { ops: Parameters<typeof applyAll>[1] } | null) => {
    const after = applyAll(doc, c!.ops);
    expect(write(parse(write(after)))).toBe(write(after));
    expect(write(applyAll(after, invertAll(doc, c!.ops)))).toBe(CAFE);
    return write(after);
  };
  // A big link left and right in its row; up, its whole row past the buttons; it cannot leave its section.
  const right = moveObj(doc, s, '3', 'right')!;
  expect(right).toEqual({ ops: [{ op: 'move', at: 3, n: 1, to: 4 }], id: '4' });
  expect(check(right)).toContain('- :leaf: Fair trade | From farms we have visited\n- :coffee: Roasted daily');
  expect(moveObj(doc, s, '3', 'left')).toBeNull();
  const up = moveObj(doc, s, '4', 'up')!;
  expect(up).toEqual({ ops: [{ op: 'move', at: 3, n: 3, to: 2 }], id: '3' });
  expect(check(up)).toContain('Small-batch coffee, roasted on the quay every morning.\n\n- :coffee: Roasted daily');
  expect(moveObj(doc, s, '5', 'down')).toBeNull();
  expect(moveObj(doc, s, '1', 'up')).toBeNull();
  // Buttons change places line for line in their quote; a paragraph has no left or right.
  const swap = moveObj(doc, s, '2.0', 'right')!;
  expect(swap.id).toBe('2.1');
  expect(check(swap)).toContain('> Find us | #find-us\n> See the menu | #menu\n');
  expect(moveObj(doc, s, '1', 'right')).toBeNull();
  // A page or a section moves with its part: Find us before Menu; Pastry before Coffee.
  expect(moveObj(doc, s, '15', 'up')).toEqual({ ops: moveOps(s, 4, -1), id: '6' });
  expect(check(moveObj(doc, s, '12', 'up'))).toContain('## Pastry\n\n- Cardamom bun | 3.50\n- Sourdough toast, butter and jam | 4.00\n\n## Coffee');
  expect(moveObj(doc, s, '0', 'down')).toBeNull();
  // Removed: a button is its line (the quote stays with the other), a big link its block, a page its part; the thing before is in hand after.
  const lone = removeObj(doc, s, '2.1')!;
  expect(lone.id).toBe('2.0');
  expect(check(lone)).toContain('> See the menu | #menu\n\n- :coffee:');
  expect(check(removeObj(doc, s, '4'))).not.toContain('Fair trade');
  expect(check(removeObj(doc, s, '6'))).not.toContain('# Menu');
  expect(removeObj(doc, s, '0')).toBeNull();
  // Duplicated: a button in its row, a big link after itself, a section with its things.
  const twin = duplicateObj(doc, s, '2.0')!;
  expect(twin.id).toBe('2.1');
  expect(check(twin)).toContain('> See the menu | #menu\n> See the menu | #menu\n> Find us');
  expect(duplicateObj(doc, s, '5')!.id).toBe('6');
  expect(check(duplicateObj(doc, s, '8')).match(/## Coffee/g)!.length).toBe(2);
  expect(duplicateObj(doc, s, '0')).toBeNull();
  // Copied: a button as a quote of its own line, a section as its part; pasted after the thing in hand.
  expect(write({ head: {}, blocks: objBlocks(doc, s, '2.1') })).toBe('> Find us | #find-us\n');
  expect(objBlocks(doc, s, '12').length).toBe(3);
  const pasted = pasteObj(s, '3', objBlocks(doc, s, '2.1'))!;
  expect(pasted.at).toBe(4);
  expect(check(pasted)).toContain('- :coffee: Roasted daily | Never more than a week old\n\n> Find us | #find-us\n\n- :leaf:');
  // Put in: after the thing in hand; a button after a button in its row; under a section's heading; with nothing in hand at the end of the section on view; a page after its page.
  const para: Block = { k: 'p', runs: [{ t: 'New words.' }] };
  expect(insertObj(doc, s, '1', 0, para)).toEqual({ ops: [{ op: 'splice', at: 2, n: 0, blocks: [para] }], id: '2' });
  const btn = insertObj(doc, s, '2.0', 0, { k: 'quote', runs: linkRuns({ icon: 'mail', label: 'Write', url: 'mailto:a@b.c' }) });
  expect(btn.id).toBe('2.1');
  expect(check(btn)).toContain('> See the menu | #menu\n> :mail: Write | mailto:a@b.c\n> Find us | #find-us\n');
  expect(insertObj(doc, s, '8', 0, para).ops).toEqual([{ op: 'splice', at: 9, n: 0, blocks: [para] }]);
  expect(insertObj(doc, s, null, 3, para).ops).toEqual([{ op: 'splice', at: 15, n: 0, blocks: [para] }]);
  expect(check(insertObj(doc, s, '9', 0, { k: 'h', level: 1, runs: [{ t: 'Hours' }] }))).toContain('- Sourdough toast, butter and jam | 4.00\n\n# Hours\n\n# Find us');
  expect(insertObj(doc, s, '9', 0, { k: 'h', level: 2, runs: [{ t: 'Tea' }] }).ops[0]).toMatchObject({ at: 12 });
  // The look and the shop's settings are head fields.
  expect(write(applyAll(doc, [themeOp({ id: 'forest', dark: true })]))).toMatch(/^---\ntheme: forest dark\n---\n/);
  expect(write(applyAll(doc, [themeOp({ id: 'indigo' })]))).toMatch(/^# Harbor Coffee/);
  expect(write(applyAll(doc, [linksOp(true)]))).toMatch(/^---\ntheme: amber\nlook: links\n---\n/);
  expect(write(applyAll(parse(SHOP), [settingOp('currency', ' ')]))).not.toContain('currency:');
});

test('a thing’s fields and the line the code writes from them: nothing typed is a marker or a separator', () => {
  const doc = parse(CAFE);
  // A button: its icon, its words, where it goes; a "|" typed in the words cannot cut the line.
  const q = doc.blocks[2];
  expect(linkFields(linesOf(q.k === 'quote' ? q.runs : [])[1])).toEqual({ icon: '', label: 'Find us', url: '#find-us' });
  const line = linkRuns({ icon: 'map-pin', label: 'Find | us', url: '#find-us' });
  expect(write({ head: {}, blocks: [withLine(q, 1, line)] })).toBe('> See the menu | #menu\n> :map-pin: Find ¦ us | #find-us\n');
  expect(write({ head: {}, blocks: [{ k: 'quote', runs: linkRuns({ icon: '', label: '**Big** :star:', url: '' }) }] })).toBe('> \\*\\*Big\\*\\* \\:star:\n');
  // A big link: rich words that link where it goes, a rich line under them, its icon; read back the same.
  const card = cardRuns({ icon: 'coffee', head: [{ t: 'Roasted ' }, { t: 'daily', b: true }], detail: [{ t: 'Never | old', i: true }], url: '#menu' });
  const text = write({ head: {}, blocks: [{ k: 'li', depth: 0, runs: card }] });
  expect(text).toBe('- :coffee: [Roasted **daily**](#menu) | *Never ¦ old*\n');
  const back = parse(text).blocks[0];
  expect(cardFields(back.k === 'li' ? back.runs : [])).toEqual({ icon: 'coffee', head: [{ t: 'Roasted ' }, { t: 'daily', b: true }], detail: [{ t: 'Never ¦ old', i: true }], url: '#menu' });
  // Drawn: the whole card is the link.
  expect(page(`# A\n\n${text}`)).toContain('<li class="go-card"><svg');
  expect(page(`# A\n\n${text}`)).toContain('<strong><a href="#menu">Roasted <strong>daily</strong></a></strong>');
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
  expect(site.templates.map((t) => t.id)).toEqual([
    'cafe',
    'shop',
    'event',
    'portfolio',
    'wedding',
    'band',
    'clinic',
    'campaign',
    'mutual-aid',
    'club',
    'newsletter',
    'cottage',
    'trades',
    'studio',
    'links-maker',
    'links-group',
    'links-band',
    'links-business',
    'links-writer',
    'links-one',
  ]);
  for (const tpl of site.templates) {
    expect(write(parse(tpl.doc))).toBe(tpl.doc);
    for (const [, name] of tpl.doc.matchAll(/:([a-z0-9-]+):/g)) expect(iconNamed(name), `${tpl.id}: ${name}`).toBeTruthy();
    expect(tpl.id.startsWith('links-')).toBe(readSite(parse(tpl.doc)).links);
  }
  const html = site.exports!.find((x) => x.ext === 'html')!;
  const out = (await html.build(CAFE, { def: site, title: 'Harbor Coffee', link: 'https://tinylittleoffice.com/#/v1/site/abc' })) as string;
  expect(out).toMatch(/^<!doctype html>/);
  expect(out).not.toContain('site-edit');
});

test("a table's money in its column's currency, else the site's: the plumber's prices and the cottage's weeks in pounds", async () => {
  const html = site.exports!.find((x) => x.ext === 'html')!;
  const page = async (id: string) => (await html.build(templates().find((t) => t.id === id)!.doc, { def: site, title: id, link: 'https://tinylittleoffice.com/#/v1/site/abc' })) as string;
  const trades = await page('trades');
  expect(trades).toContain('£85.00');
  expect(trades).not.toContain('$85.00');
  const cottage = await page('cottage');
  expect(cottage).toContain('£520.00');
  expect(cottage).toContain('£74.29');
  // A column that names none takes the head's currency.
  const shop = sitePage(parse('---\ncurrency: €\n---\n# Prices\n\nWhat | Cost:money\n--- | ---\nTea | 3\n'), {});
  expect(shop).toContain('€3.00');
});

test("a shop's prices in the Price column's currency, else the site's: a code through Intl, never \"GBP12.00\"; a symbol before the price", () => {
  const gbp = '---\ncurrency: €\n---\n# Shop\n\nName | Price:money(GBP) | About | Image\n--- | --- | --- | ---\nMug | 12 |  |\nJug | 1200 |  |\n';
  const shop = readSite(parse(gbp)).sections[0].products;
  expect(shop.map((p) => [p.name, p.price, p.currency])).toEqual([
    ['Mug', 12, 'GBP'],
    ['Jug', 1200, 'GBP'],
  ]);
  const pounds = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'GBP' });
  const html = page(gbp);
  expect(html).toContain(`<b class="price">${pounds.format(12)}</b>`);
  expect(html).toContain(`<b class="price">${pounds.format(1200)}</b>`);
  expect(html).not.toContain('GBP12');
  expect(html).not.toContain('€12');
  // The cart is given each thing's currency.
  expect(html).toContain('"currency":"GBP"');
  // A Price column that names none: the head's symbol, before the price.
  const euros = '---\ncurrency: €\n---\n# Shop\n\nName | Price:money | About | Image\n--- | --- | --- | ---\nTea | 3 |  |\n';
  expect(readSite(parse(euros)).sections[0].products[0].currency).toBe('€');
  expect(page(euros)).toContain('<b class="price">€3.00</b>');
  // And none anywhere: dollars.
  expect(page('# Shop\n\nName | Price:money\n--- | ---\nTea | 3\n')).toContain('<b class="price">$3.00</b>');
});

test('words typed in the page, as ops: one text op on the block, the rest of a line kept; Enter makes a paragraph; the site’s name put in where there is none', () => {
  const doc = parse(CAFE);
  const site = readSite(doc);
  const ops = (id: string, part: Parameters<typeof wordsOps>[3], runs: Parameters<typeof wordsOps>[4]) => {
    const o = wordsOps(doc, site, id, part, runs);
    expect(o).not.toBeNull();
    expect(o!.length).toBe(1);
    expect(o![0].op).toBe('text');
    return write(applyAll(doc, o!));
  };
  // A paragraph keeps its marks and its line breaks; a heading is plain words, whatever was pasted.
  expect(ops('1', '0', [{ t: 'Fresh ', b: true }, { t: 'daily.\nOn the quay.' }])).toContain('\n\n**Fresh** daily.\nOn the quay.\n\n> See the menu');
  expect(ops('8', '0', [{ t: 'Hot ', b: true }, { t: 'drinks' }])).toContain('\n\n## Hot drinks\n\n');
  // A button's words: its line, where it goes kept; a "|" typed is never a separator.
  expect(ops('2.1', 'label', [{ t: 'Where | when' }])).toContain('> See the menu | #menu\n> Where ¦ when | #find-us\n');
  // A big link's words and the line under them: marks alone, its link and icon kept.
  const card = ops('3', 'head', [
    { t: 'Roasted ', i: true },
    { t: 'fresh', href: 'https://x.y' },
  ]);
  expect(card).toContain('- :coffee: *Roasted* fresh | Never more than a week old\n');
  expect(ops('3', 'detail', [{ t: 'Within the week' }])).toContain('- :coffee: Roasted daily | Within the week\n');
  // A small link on a Quick Links page.
  const links = parse(MAKER);
  const lw = wordsOps(links, readSite(links), '4', 'label', [{ t: 'Insta' }])!;
  expect(write(applyAll(links, lw))).toContain('- :camera: Insta | https://instagram.com/ada\n');
  // The same words: nothing; a part the thing has not: nothing.
  expect(wordsOps(doc, site, '1', '0', (doc.blocks[1] as Extract<Block, { k: 'p' }>).runs)).toBeNull();
  expect(wordsOps(doc, site, '1', 'label', [{ t: 'x' }])).toBeNull();
  // The site's name with no heading yet: one put in at the top.
  const blank = parse('Words.\n');
  const named = wordsOps(blank, readSite(blank), '-1', '0', [{ t: 'Harbor' }])!;
  expect(write(applyAll(blank, named))).toBe('# Harbor\n\nWords.\n');
  // Enter: the words before the caret stay, a paragraph after takes the rest (empty at the end), and is the thing next.
  const c = splitOps(doc, site, '1', [{ t: 'Small-batch coffee,' }], [{ t: 'roasted on the quay.' }])!;
  expect(c.id).toBe('2');
  expect(write(applyAll(doc, c.ops))).toContain('# Harbor Coffee\n\nSmall-batch coffee,\n\nroasted on the quay.\n\n> See the menu');
  const end = splitOps(doc, site, '8', [{ t: 'Coffee' }], [])!;
  const after = applyAll(doc, end.ops);
  expect(after.blocks[9]).toEqual({ k: 'p', runs: [] });
  // A paragraph with no words yet is a thing on the page (it is being typed in).
  expect(objectsOf(readSite(after)).find((o) => objId(o) === '9')!.kind).toBe('p');
  // Every thing's words, for the page's editor.
  const w = wordsOf(doc, site);
  expect(Object.keys(w).slice(0, 6)).toEqual(['0:0', '1:0', '2.0:label', '2.1:label', '3:head', '3:detail']);
  expect(w['3:head'].kind).toBe('marks');
  expect(
    keptRuns(
      [
        { t: 'a', b: true },
        { t: '', fn: 'n' },
        { t: 'b\nc', href: 'x' },
      ],
      'plain',
    ),
  ).toEqual([{ t: 'ab c' }]);
});

test('every template is a whole site: a name, every card and button filled, every embed one the page can draw, the shops with things to sell', () => {
  for (const tpl of site.templates) {
    const s = readSite(parse(tpl.doc));
    expect(s.name, tpl.id).toBeTruthy();
    expect(tpl.doc, tpl.id).not.toMatch(/[Ll]orem|ipsum|\bTODO\b|\bTBD\b/);
    for (const sec of s.sections) {
      for (const c of sec.cards) expect(c.head.length && c.detail.length, `${tpl.id}: a card`).toBeTruthy();
      for (const b of [...sec.buttons, ...sec.socials]) expect(b.label && b.url !== '#', `${tpl.id}: ${b.label}`).toBeTruthy();
      for (const e of sec.embeds) expect('lang' in e ? !!appOf(e.lang) || e.lang === 'qr' || e.lang === 'sheet' : !!embedOf(e.web), `${tpl.id}: an embed`).toBe(true);
    }
    if (/orders:/.test(tpl.doc))
      expect(
        s.sections.some((x) => x.products.length),
        `${tpl.id}: a shop`,
      ).toBe(true);
  }
});
