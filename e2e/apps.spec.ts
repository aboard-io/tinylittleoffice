import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { shot, reopen, navTo } from './helpers';

// What needs a real browser: the map, pictures drawn on a canvas, drags placed on the screen, the browser's own
// editing commands, layout, axe. The rest of the apps worked by hand is in test/dom/ (lists, text, trip, motion, sharing).

/** Keep the map test off the network: blank tiles and a canned place search. */
async function offlineMap(page: Page) {
  const tile = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  await page.route('https://tile.openstreetmap.org/**', (route) => route.fulfill({ contentType: 'image/png', body: tile }));
  await page.route('https://nominatim.openstreetmap.org/**', (route) =>
    route.fulfill({ json: [{ name: 'Lisbon', display_name: 'Lisbon, Portugal', lat: '38.7077507', lon: '-9.1365919' }] }),
  );
}

// The map is Leaflet, laid out with its tiles: a tap on it is placed by where it lands on the screen.
test('trip: taps on the map add stops, and pins mark them', async ({ page }) => {
  await offlineMap(page);
  await page.goto('/#/v0/trip');
  const map = page.getByRole('application', { name: 'Map' });
  await expect(map.locator('.leaflet-tile-pane')).toBeAttached();
  const stops = page.locator('.trip-stops li:not(.to-empty)');
  const box = (await map.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.3);
  await expect(stops).toHaveCount(1);
  await page.keyboard.type('First stop');
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.7);
  await expect(stops).toHaveCount(2);
  await expect(map.locator('.trip-pin')).toHaveCount(2);
  await expect(page.getByLabel('Name of stop 1')).toHaveValue('First stop');
  await reopen(page);
  await expect(map.locator('.trip-pin')).toHaveCount(2);
  await shot(page, 'trip');
});

// Drawing on the stage and dragging a shape are placed by where the pointer is on the screen; the GIF is drawn on a canvas.
test('motion: a drawing that moves between the moments you set', async ({ page }) => {
  await page.goto('/#/v0/anim');
  // Draw mode is Draw itself.
  const canvas = page.getByRole('img', { name: 'Drawing canvas' });
  const box = (await canvas.boundingBox())!;
  await page.getByRole('button', { name: 'Rectangle' }).click();
  await page.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.1);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3, { steps: 5 });
  await page.mouse.up();
  await page.getByRole('textbox', { name: 'Label' }).fill('Go');
  await expect(canvas.locator('g.shape')).toHaveCount(1);

  // Move mode: at the last moment, drag it down and to the right.
  await page.locator('sl-radio-button[value="move"]').click();
  const stage = page.getByRole('application', { name: 'Stage' });
  const hit = stage.locator('g.hit');
  // Where the shape is: its centre, and its spin (to within a pixel, as a finger is).
  const at = async (x: number, y: number, spin = 0) => {
    const m = /^translate\(([\d.-]+) ([\d.-]+)\) rotate\(([\d.-]+)\) scale\(1 1\) translate\(-128 -80\)$/.exec((await hit.first().getAttribute('transform'))!)!;
    expect(m, 'transform').toBeTruthy();
    expect(Math.abs(+m[1] - x) <= 1 && Math.abs(+m[2] - y) <= 1 && +m[3] === spin, `${m[0]} near ${x} ${y} ${spin}`).toBe(true);
  };
  await expect(hit).toHaveCount(1);
  await at(128, 80);
  const time = page.getByRole('slider', { name: 'Time' });
  await time.fill('23');
  await expect(page.locator('.motion-clock')).toHaveText('2.9 s / 2.9 s');
  // (The slider may have scrolled the stage away.)
  await stage.scrollIntoViewIfNeeded();
  const sb = (await stage.boundingBox())!;
  const k = sb.width / 640;
  await page.mouse.move(sb.x + 128 * k, sb.y + 80 * k);
  await page.mouse.down();
  await page.mouse.move(sb.x + 428 * k, sb.y + 280 * k, { steps: 5 });
  await page.mouse.up();
  await at(428, 280);
  await expect(hit.first()).toHaveClass(/sel/);
  // It started where it was drawn, and the link says so: a row of keys for shape 0.
  const { decodeEnvelope } = await import('../src/lib/envelope.ts');
  const body = () => decodeEnvelope(page.url().split('/#/v0/anim/')[1] ?? '').body;
  await expect.poll(body).toMatch(/^---\nframes: 24\nfps: 8\n---\nKind \| X \| Y \| W \| H \| Style \| Label\n--- \| --- \| --- \| --- \| --- \| --- \| ---\nr \| 8 \| 5 \| 16 \| 10 \| 0 \| Go\n\nShape \| Keys\n--- \| ---\n0 \| 0,0,0,0,1,0; 23,(299|300|301),(199|200|201),0,1,0$/);
  await expect(page.locator('.motion-keys .key')).toHaveCount(2);

  await shot(page, 'anim');

  // An animated GIF, a frame per frame, drawn on a canvas.
  await page.getByRole('button', { name: 'Download' }).click();
  const [gif] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: /Animated GIF/ }).click()]);
  const { readFileSync } = await import('node:fs');
  expect(readFileSync(await gif.path()).subarray(0, 6).toString('latin1')).toBe('GIF89a');
});

// The picture is drawn on a canvas, and downloaded.
test('share: the picture of a document is a PNG download', async ({ page }) => {
  await page.goto('/#/v0/write');
  await page.getByRole('textbox', { name: 'Document' }).click();
  await page.keyboard.type('Quarterly memo');
  await expect(page).toHaveTitle('Quarterly memo · TinyLittleOffice');
  await page.getByRole('button', { name: 'Share' }).click();
  const [png] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: 'Save a picture' }).click()]);
  expect(png.suggestedFilename()).toBe('quarterly-memo.png');
});

// Overflow is measured layout.
test('every app is reachable and none overflows the page', async ({ page }) => {
  await offlineMap(page);
  await page.goto('/');
  for (const name of ['Todo', 'Board', 'Gantt', 'Trip', 'Motion']) {
    await navTo(page, name);
    await expect(page.locator('.to-panel h1')).toHaveText(new RegExp(name));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, name).toBeLessThanOrEqual(0);
  }
});

// What the built site serves, from its own server.
test('web niceties: icons, manifest and preview tags are served', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveAttribute('href', './favicon.svg');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /^https:\/\/.+\/og\.png$/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /^https:\/\//);
  for (const path of ['favicon.svg', 'favicon-32.png', 'apple-touch-icon.png', 'og.png', 'manifest.webmanifest', 'robots.txt', 'icon-512.png']) {
    expect((await request.get('/' + path)).status(), path).toBe(200);
  }
  const manifest = await (await request.get('/manifest.webmanifest')).json();
  expect(manifest.icons).toHaveLength(3);
});

// Drawing in the inserted document's own editor is a click placed on its canvas.
test('write: Insert makes a drawing in its own editor, and Edit opens it again', async ({ page }) => {
  await page.goto('/#/v0/write');
  const editor = page.getByRole('textbox', { name: 'Document' });
  const embeds = editor.locator('to-embed');
  // Insert makes a new one from a menu and opens it for editing.
  await editor.click();
  await page.getByRole('button', { name: 'Insert' }).click();
  await page.getByRole('combobox', { name: 'Narrow the list' }).fill('draw');
  await page.getByRole('combobox', { name: 'Narrow the list' }).press('Enter');
  const sub = page.locator('sl-dialog.to-sub');
  await expect(sub).toHaveAttribute('open');
  await sub.getByRole('button', { name: 'Ellipse' }).click();
  const canvas = sub.getByRole('img', { name: 'Drawing canvas' });
  const box = (await canvas.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await sub.getByRole('button', { name: 'Done' }).click();
  await expect(embeds).toHaveCount(1);
  await expect(embeds.nth(0).locator('svg[role="img"] ellipse')).toHaveCount(1);
  await reopen(page);
  await expect(embeds.nth(0).locator('svg[role="img"] ellipse')).toHaveCount(1);
  // Edit reopens it.
  await embeds.nth(0).getByRole('button', { name: 'Edit' }).click();
  await expect(sub.locator('g.shape')).toHaveCount(1);
  await sub.getByRole('button', { name: 'Done' }).click();
});

// Pasting goes through the browser's own editing commands (execCommand), as does a list's Tab; a link's underline is computed style.
test('write: a pasted web address is a link you can click', async ({ page }) => {
  await page.goto('/#/v0/write');
  const editor = page.getByRole('textbox', { name: 'Document' });
  const paste = (text: string) =>
    editor.evaluate((el, t) => {
      const data = new DataTransfer();
      data.setData('text/plain', t);
      el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
    }, text);
  await editor.click();
  await page.keyboard.type('Read this: ');
  await paste('https://example.com/report?year=2026');
  await page.keyboard.type('and say what you think.');
  // Ordinary text still pastes as text.
  await paste(' This is not a link.');
  await expect(editor).toContainText('This is not a link.');
  const link = editor.locator('a');
  await expect(link).toHaveCount(1);
  await expect(link).toHaveText('https://example.com/report?year=2026');
  await expect(link).toHaveAttribute('href', 'https://example.com/report?year=2026');
  // It is highlighted; a click asks first, showing where it goes, and Go opens it in a new tab.
  expect(await link.evaluate((el) => getComputedStyle(el).textDecorationLine)).toBe('underline');
  // A plain click puts the caret in it and shows where it goes; Mod+click follows it, asking first.
  await link.click();
  await expect(page.locator('.link-bubble .lb-href')).toHaveText('https://example.com/report?year=2026');
  await link.click({ modifiers: ['ControlOrMeta'] });
  await expect(page.locator('.to-link-guard .lg-url')).toHaveText('https://example.com/report?year=2026');
  const [popup] = await Promise.all([page.waitForEvent('popup'), page.getByRole('button', { name: /Go/ }).click()]);
  expect(popup.url()).toBe('https://example.com/report?year=2026');
  await popup.close();
  await expect(page.locator('sl-dialog.to-link-guard')).not.toHaveAttribute('open');
  // It is still a link when the document is opened again.
  await reopen(page);
  await expect(link).toHaveAttribute('href', 'https://example.com/report?year=2026');
  await expect(editor).toContainText('and say what you think.');
});

// A list's Tab is the browser's own indent command.
test('write: list items nest with Tab', async ({ page }) => {
  await page.goto('/#/v0/write');
  const editor = page.getByRole('textbox', { name: 'Document' });
  await editor.click();
  await page.getByRole('button', { name: 'Bulleted list' }).click();
  await page.keyboard.type('Fruit');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await page.keyboard.type('Apples');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await page.keyboard.type('Bramley');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.type('Veg');
  await expect(editor.locator('ul ul ul li')).toHaveText(['Bramley']);
  await reopen(page);
  await expect(editor.locator('li')).toHaveCount(4);
  await expect(editor.locator(':scope > ul > li')).toHaveCount(2);
  await expect(editor.locator('ul ul ul li')).toHaveText(['Bramley']);
  await expect(editor.locator(':scope > ul > li').nth(1)).toHaveText('Veg');
});

// Leaflet's map and its popups, presented.
test('trip on a slide: the map goes from stop to stop', async ({ page }) => {
  await offlineMap(page);
  const { encodeEnvelope } = await import('../src/lib/envelope.ts');
  const trip = '```trip\nPlace | Lat:number | Lon:number | Note\n--- | --- | --- | ---\nLisbon | 38.7223 | -9.1393 | Start here\nSecond | 41.1579 | -8.6291 |\n```';
  await page.goto('/#/v0/deck/' + encodeEnvelope({ created: null, body: `## Where we are going\n\n${trip}\n` }));
  await page.getByRole('button', { name: 'Present' }).click();
  const map = page.locator('.deck-show to-trip[present]');
  await expect(map.locator('.trip-pin')).toHaveCount(2);
  await expect(map.locator('.leaflet-popup')).toHaveCount(0);
  await page.keyboard.press('ArrowRight');
  await expect(map.locator('.leaflet-popup', { hasText: '1. Lisbon' })).toContainText('Start here');
  await page.keyboard.press('ArrowRight');
  await expect(map.locator('.leaflet-popup', { hasText: '2. Second' })).toBeVisible();
  // Then the closing QR code of the deck, then out.
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.deck-show .frame > svg path[shape-rendering="crispEdges"]')).toHaveCount(1);
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.deck-show')).toHaveCount(0);
});

// axe scans a real browser's rendering (not part of the deploy's checks).
test('accessibility: no app has violations a machine can find', async ({ page }) => {
  test.slow();
  await offlineMap(page);
  const { encodeEnvelope } = await import('../src/lib/envelope.ts');
  const docs: Record<string, string> = {
    sheet: '---\nchart: bar\n---\nItem | Cost:money\n--- | ---\nRent | 1200\nFood | 600',
    write: '# Memo\n\nSome **bold** text\n\n- one\n  - nested\n\n```draw\n```',
    deck: '## :rocket: Spring launch {.title}\n\n- What ships\n\n---\n\n## Agenda {.two}\n\n- one\n\n|\n\n- two\n',
    draw: 'Kind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\nr | 2 | 1 | 12 | 6 | 1b3 | Box\na | 14 | 4 | 8 | 0 | 0 |',
    cal: '- 2020-01-03 to 2020-01-04: Offsite',
    todo: '- [ ] one\n- [x] two {.star due=2025-06-23}',
    board: '## To do\n\n- x\n- y\n\n## Done {limit=1}',
    gantt: 'Task | Start:date | Days:number | Done:percent\n--- | --- | --- | ---\nDesign | 2025-06-23 | 5 | 50%\n- Sketch | 2025-06-23 | 2 | 100%',
    trip: 'Place | Lat:number | Lon:number | Note\n--- | --- | --- | ---\nLisbon | 38.7223 | -9.1393 | note\nB | 41.1579 | -8.6291 |',
    anim: '---\nframes: 24\nfps: 8\n---\nKind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\nt | 4 | 20 | 20 | 4 | 04 | Lift off\ni | 8 | 36 | 8 | 8 | 0b | rocket\n\nShape | Keys\n--- | ---\n0 | 0,0,0,0,1,0; 23,0,-100,0,1,0,i\n1 | 0,0,0,0,1,0; 23,200,-200,100,1,-30,d',
    org: '- Ada | CEO\n  - Ben | Engineering\n  - Eve | Design',
    mind: '- Launch\n  - Product\n    - Pricing\n  - Marketing',
    lanes: '- Customer: Orders\n- Sales: In stock?\n- Warehouse: Packs',
    venn: '- Fast: a\n- Cheap: b\n- Fast & Cheap: c',
    net: '~ Web -> API: calls\n~ API -- Cache',
    db: '## teams\n\nid | name\n--- | ---\n1 | Platform\n\n## people\n\nid | name | team_id>teams\n--- | --- | ---\n1 | Ann | 1\n\n```sql\nselect name from people;\n```',
    site: '# Harbor Coffee\n\nRoasted on the quay.\n\n> Menu | #menu\n\n- :coffee: Daily | Fresh\n\n## Menu\n\nEspresso and buns.',
    links: '# Ada\n\nPotter.\n\n> Shop | https://example.com\n\n- :mail: Mail | mailto:a@b.c',
    invoice: 'From: Harbor\nTo: Acme\nNumber: 7\nTax: 8%\n\nWhat | Qty:number | Units | Price:money\n--- | --- | --- | ---\nDesign | 2 |  | 150',
    contract: '# Deal\n\nSam walks the dog.',
    zine: '## :star: My zine\n\nIssue one\n\n---\n\n## Inside\n\nSome words for page two.\n',
    booklet: '## A book\n\nby me\n\n---\n\n## One\n\nwords\n',
    brochure: '## Visit\n\n---\n\n## Why\n\nbecause\n',
    comic: '## Biscuit\n\n---\n\n- :dog: Walk? | Monday\n',
    poster: '## :music: Open mic\n\nFriday 8pm\n',
    badges: '## Ada\n\nEng\n\n---\n\n## Grace\n\nCompilers\n',
    pixel: 'ab.c\n.dd',
    seating: '- Top: Sam, Paul, Ada',
    family: '- Rose + Albert\n  - Helen',
    timeline: '- 1969: First message\n- 1989: The web',
    wordsearch: '# Coffee\n\n- espresso\n- filter',
    spinner: '# Lunch?\n\n- Ada\n- Grace\n- Alan',
    santa: '# Santa\n\n- Ada\n- Grace\n- Alan',
    split: '# Trip\n\nWho | Amount:money | What\n--- | --- | ---\nPaul | 60 | dinner\nSam | 20 | taxi',
    qr: 'https://tinylittleoffice.com/',
  };
  const found: string[] = [];
  const check = async (what: string) => {
    // Map tiles are OpenStreetMap's pictures; the map itself is a labelled application.
    // label-title-only: compact toolbar pickers are named for assistive tech but show an icon or their value, not a visible label.
    // The page apps show their result in a frame: a document of its own, with a <main> of its own, which is not a duplicate landmark.
    const frame = (await page.locator('.diagram.page iframe').count()) > 0;
    const results = await new AxeBuilder({ page }).exclude('.leaflet-container').disableRules(['label-title-only', ...(frame ? ['landmark-unique'] : [])]).analyze();
    found.push(...results.violations.map((v) => `${what}: ${v.id} (${v.nodes.length}) ${v.nodes[0].target.join(' ')}`));
  };
  await page.goto('/');
  await check('home');
  for (const [app, body] of Object.entries(docs)) {
    await page.goto('about:blank');
    await page.goto(`/#/v0/${app}/${encodeEnvelope({ created: 1, body })}`);
    await expect(page.locator(`to-${app}`)).toBeVisible();
    await page.waitForTimeout(150);
    await check(app);
  }
  // And in the dark.
  await page.evaluate(() => localStorage.setItem('to-theme', 'dark'));
  await page.goto('about:blank');
  await page.goto(`/#/v0/todo/${encodeEnvelope({ created: 1, body: docs.todo })}`);
  await expect(page.locator('html')).toHaveClass(/sl-theme-dark/);
  await check('dark todo');
  expect(found).toEqual([]);
});

// Layout: what sticks out past the right edge. Run twice: as the phone or desktop is, and at 320px, which is what a laptop shows zoomed to 400%.
for (const narrow of [false, true]) test(`nothing is cut off at the right edge${narrow ? ', zoomed to 400%' : ', on any screen'}`, async ({ page, isMobile }) => {
  test.slow();
  if (narrow && isMobile) test.skip();
  if (narrow) await page.setViewportSize({ width: 320, height: 640 });
  await offlineMap(page);
  const { encodeEnvelope } = await import('../src/lib/envelope.ts');
  const docs: Record<string, string> = {
    sheet: '---\nchart: bar\n---\nItem | When:date | Cost:money\n--- | --- | ---\nRent | 2027-03-01 | 1200',
    write: '# Memo\n\nSome **bold** text\n\n- one\n  - nested',
    deck: '## :rocket: Launch plan\n\n- Build it\n- Ship it\n',
    draw: 'Kind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\nr | 2 | 1 | 12 | 6 | 1b3 | Box',
    cal: '- 2020-01-03 to 2020-01-04: Offsite',
    todo: '- [ ] one\n- [x] two {.star due=2025-06-23}',
    board: '## To do\n\n- x\n- y\n\n## Done {limit=1}',
    gantt: 'Task | Start:date | Days:number | Done:percent\n--- | --- | --- | ---\nDesign | 2025-06-23 | 5 | 50%\n- Sketch | 2025-06-23 | 2 | 100%',
    trip: 'Place | Lat:number | Lon:number | Note\n--- | --- | --- | ---\nLisbon | 38.7223 | -9.1393 | note\nB | 41.1579 | -8.6291 |',
    anim: '---\nframes: 24\nfps: 8\n---\nKind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\nt | 4 | 20 | 20 | 4 | 04 | Lift\ni | 8 | 36 | 8 | 8 | 0b | rocket\n\nShape | Keys\n--- | ---\n0 | 0,0,0,0,1,0; 23,0,-100,0,1,0,i\n1 | 0,0,0,0,1,0; 23,200,-200,100,1,-30,d',
    org: '- Ada | CEO\n  - Ben | Engineering\n  - Eve | Design',
    mind: '- Launch\n  - Product\n    - Pricing\n  - Marketing',
    lanes: '- Customer: Orders\n- Sales: In stock?\n- Warehouse: Packs',
    venn: '- Fast: a\n- Cheap: b\n- Fast & Cheap: c',
    net: '~ Web -> API: calls\n~ API -- Cache',
    db: '## teams\n\nid | name\n--- | ---\n1 | Platform\n\n## people\n\nid | name | team_id>teams\n--- | --- | ---\n1 | Ann | 1\n\n```sql\nselect name from people;\n```',
    site: '# Harbor Coffee\n\nRoasted on the quay.\n\n> Menu | #menu\n\n- :coffee: Daily | Fresh\n\n## Menu\n\nEspresso and buns.',
    links: '# Ada\n\nPotter.\n\n> Shop | https://example.com\n\n- :mail: Mail | mailto:a@b.c',
    invoice: 'From: Harbor\nTo: Acme\nNumber: 7\nTax: 8%\n\nWhat | Qty:number | Units | Price:money\n--- | --- | --- | ---\nDesign | 2 |  | 150',
    contract: '# Deal\n\nSam walks the dog.',
    zine: '## :star: My zine\n\nIssue one\n\n---\n\n## Inside\n\nSome words for page two.\n',
    booklet: '## A book\n\nby me\n\n---\n\n## One\n\nwords\n',
    brochure: '## Visit\n\n---\n\n## Why\n\nbecause\n',
    comic: '## Biscuit\n\n---\n\n- :dog: Walk? | Monday\n',
    poster: '## :music: Open mic\n\nFriday 8pm\n',
    badges: '## Ada\n\nEng\n\n---\n\n## Grace\n\nCompilers\n',
    pixel: 'ab.c\n.dd',
    seating: '- Top: Sam, Paul, Ada',
    family: '- Rose + Albert\n  - Helen',
    timeline: '- 1969: First message\n- 1989: The web',
    wordsearch: '# Coffee\n\n- espresso\n- filter',
    spinner: '# Lunch?\n\n- Ada\n- Grace\n- Alan',
    santa: '# Santa\n\n- Ada\n- Grace\n- Alan',
    split: '# Trip\n\nWho | Amount:money | What\n--- | --- | ---\nPaul | 60 | dinner\nSam | 20 | taxi',
    qr: 'https://tinylittleoffice.com/',
  };
  const found: string[] = [];
  for (const [app, body] of Object.entries(docs)) {
    await page.goto('about:blank');
    await page.goto(`/#/v0/${app}/${encodeEnvelope({ created: 1, title: 'A fairly long title for this document', body })}`);
    await expect(page.locator(`to-${app}`)).toBeVisible();
    await page.waitForTimeout(200);
    // Anything that sticks out past the right edge, unless it is inside something that scrolls sideways on purpose.
    const out = await page.evaluate(() => {
      const scrolls = (el: Element | null): boolean => !!el && el !== document.body && (/(auto|scroll)/.test(getComputedStyle(el).overflowX) || scrolls(el.parentElement));
      const bad: string[] = [];
      for (const el of document.querySelectorAll<HTMLElement>('to-app *')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.right <= window.innerWidth + 1 || scrolls(el)) continue;
        if (el.closest('.leaflet-container, .sr-only, sl-dialog, sl-drawer, sl-menu, [aria-hidden="true"]')) continue;
        if ([...el.children].some((c) => c.getBoundingClientRect().right > window.innerWidth + 1)) continue;
        bad.push(`${el.tagName.toLowerCase()}.${el.className && typeof el.className === 'string' ? el.className.split(' ')[0] : ''} +${Math.round(r.right - window.innerWidth)}`);
      }
      return [...new Set(bad)].slice(0, 6);
    });
    for (const o of out) found.push(`${app}: ${o}`);
    const page_ = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (page_ > 0) found.push(`${app}: page scrolls sideways by ${page_}`);
  }
  expect(found).toEqual([]);
});

// Pen clicks and a corner dragged are placed by where they land on the canvas.
test('draw: the pen makes any shape, corner by corner; Motion morphs its corners', async ({ page }) => {
  await page.goto('/#/v0/draw');
  const canvas = page.locator('.draw-canvas');
  const b = (await canvas.boundingBox())!;
  const at = (fx: number, fy: number) => page.mouse.click(b.x + b.width * fx, b.y + b.height * fy);
  await page.getByRole('button', { name: /^Pen/ }).click();
  await at(0.2, 0.2);
  await at(0.5, 0.15);
  await at(0.45, 0.5);
  await at(0.15, 0.4);
  await page.keyboard.press('Enter');
  await expect(canvas.locator('polygon')).toHaveCount(1);
  const { decodeEnvelope } = await import('../src/lib/envelope.ts');
  await expect.poll(() => decodeEnvelope(page.url().split('/').pop()!, 'draw').body).toMatch(/\nv \| \d+ \| \d+ \| \d+ \| \d+ \| 1 \| +\| \d+:\d+;\d+:\d+;\d+:\d+;\d+:\d+/);
  // Esc drops a half-drawn one.
  await page.getByRole('button', { name: /^Pen/ }).click();
  await at(0.7, 0.7);
  await at(0.8, 0.8);
  await page.keyboard.press('Escape');
  await expect(canvas.locator('polygon')).toHaveCount(1);
  // In Motion, a corner dragged at a later moment morphs between the two.
  const body = decodeEnvelope(page.url().split('/').pop()!, 'draw').body;
  const { encodeEnvelope } = await import('../src/lib/envelope.ts');
  // (A drawing is a motion in which nothing moves yet.)
  await page.goto(`/#/v0/anim/${encodeEnvelope({ created: null, body })}`);
  await page.getByRole('radio', { name: 'Move' }).click();
  await page.locator('input[type=range][aria-label="Time"]').fill('23');
  await page.locator('.motion-stage .hit').first().click();
  const corner = page.locator('.motion-stage .corner').first();
  await expect(corner).toHaveCount(1);
  const c = (await corner.boundingBox())!;
  await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2);
  await page.mouse.down();
  await page.mouse.move(c.x + c.width / 2 + 60, c.y + c.height / 2 + 40, { steps: 6 });
  await page.mouse.up();
  await expect.poll(() => decodeEnvelope(page.url().split('/').pop()!, 'anim').body).toMatch(/\n0 \| .*,p\d+:\d+\/.*; 23,.*,p/);
});

// Pasting formatted text goes through the browser's own insert command, and the copy is the browser's own.
test('write: text copied from one document pastes into another with its headings, bullets, marks and links; Mod+K links', async ({ page, browserName }) => {
  await page.goto('/#/v0/write');
  const editor = page.getByRole('textbox', { name: 'Document' });
  await editor.evaluate((el) => {
    el.innerHTML = '<h1>Plan</h1><p>Some <b>bold</b> and <a href="https://a.co/r">a report</a>.</p><ul><li>One</li><li>Two</li></ul>';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  // Copied from it as a person would: everything selected, then the browser's copy.
  await editor.click();
  await page.keyboard.press('ControlOrMeta+A');
  const copied = await editor.evaluate((el) => {
    const data = new DataTransfer();
    el.dispatchEvent(new ClipboardEvent('copy', { clipboardData: data, bubbles: true, cancelable: true }));
    const sel = getSelection()!;
    const holder = document.createElement('div');
    holder.append(sel.getRangeAt(0).cloneContents());
    return { html: data.getData('text/html') || holder.innerHTML, text: sel.toString() };
  });
  // Into a new document.
  await page.goto('/#/v0/write');
  await page.reload();
  const fresh = page.getByRole('textbox', { name: 'Document' });
  await fresh.click();
  await fresh.evaluate((el, c) => {
    const data = new DataTransfer();
    data.setData('text/html', c.html);
    data.setData('text/plain', c.text);
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  }, copied);
  await expect(fresh.locator('h1')).toHaveText('Plan');
  await expect(fresh.locator('b')).toHaveText('bold');
  await expect(fresh.locator('a')).toHaveAttribute('href', 'https://a.co/r');
  await expect(fresh.locator('ul li')).toHaveCount(2);
  // Mod+K links the selected words.
  await fresh.locator('li').first().click();
  await page.keyboard.press('End');
  await page.keyboard.press('Shift+Home');
  await page.keyboard.press('ControlOrMeta+K');
  await page.locator('.to-link-dialog .ld-url input').fill('example.com');
  await page.keyboard.press('Enter');
  await expect(fresh.locator('li a')).toHaveAttribute('href', 'https://example.com');
  expect(browserName).toBe('chromium');
});

// Bold is the browser's own command, and how heavy a heading is drawn is computed style.
test('write: a heading stays bold: Mod+B and the Bold button do nothing there', async ({ page }) => {
  await page.goto('/#/v0/write');
  const editor = page.getByRole('textbox', { name: 'Document' });
  await editor.click();
  await page.keyboard.press('ControlOrMeta+1');
  await page.keyboard.type('Big title');
  await page.keyboard.press('Shift+Home');
  await page.keyboard.press('ControlOrMeta+B');
  await expect(page.getByRole('button', { name: 'Bold' })).toBeDisabled();
  const weight = await editor.locator('h1').evaluate((h) => Math.min(...[h, ...h.querySelectorAll('*')].map((e) => parseInt(getComputedStyle(e).fontWeight))));
  expect(weight).toBeGreaterThanOrEqual(600);
  await expect(editor.locator('h1')).toHaveText('Big title');
  expect(await editor.locator('h1').innerHTML()).not.toContain('font-weight');
});

// Whether words stay inside their boxes is measured text: a real browser's.
test('mind map: long ideas and web addresses wrap inside their boxes', async ({ page }) => {
  const doc = '- Launch plan for the spring season\n  - See https://tinylittleoffice.com/outline/#/v0/outline/YjZndjttGEoXv8xQE9mYWkGbswJsslCt7vMkuMF471iA for the list\n  - Marketing\n    - A really long idea that goes on and on about the press release and the social posts and the launch party';
  await page.goto('/#/v0/mind');
  await page.locator('to-mind').waitFor();
  // (The document arrives as a change from the editor, as typing it would make.)
  await page.evaluate((text) => {
    const el = document.querySelector('to-mind') as unknown as { value: string; dispatchEvent(e: Event): boolean };
    el.dispatchEvent(new CustomEvent('docchange', { detail: text, bubbles: true, composed: true }));
  }, doc);
  const svg = page.locator('to-mind .pic svg').first();
  await expect(svg.locator('text', { hasText: 'outline/#/v0/' })).toHaveCount(1);
  const outside = await svg.evaluate((s) => {
    const boxes = [...s.querySelectorAll('rect')].map((r) => r.getBBox()).filter((b) => b.width > 20 && b.height > 20);
    return [...s.querySelectorAll('text')].filter((t) => t.textContent!.trim()).map((t) => ({ t: t.textContent, b: (t as SVGGraphicsElement).getBBox() })).filter(({ b }) => !boxes.some((r) => b.x >= r.x - 1 && b.x + b.width <= r.x + r.width + 1 && b.y >= r.y - 1 && b.y + b.height <= r.y + r.height + 1)).map((o) => o.t);
  });
  expect(outside).toEqual([]);
});

// Typing, as typed: the browser's own input events and editing commands.
test('write: "- " and "1. " start lists, Backspace takes a bullet off, quotes are curly', async ({ page }) => {
  await page.goto('/#/v0/write');
  const editor = page.getByRole('textbox', { name: 'Document' });
  await editor.click();
  await page.keyboard.type('- Milk');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Eggs');
  await expect(editor.locator('ul li')).toHaveText(['Milk', 'Eggs']);
  // An empty item: Backspace takes the bullet off and leaves the list.
  await page.keyboard.press('Enter');
  await page.keyboard.press('Backspace');
  await page.keyboard.type('After the list');
  await expect(editor.locator('ul li')).toHaveCount(2);
  await expect(editor.locator('p').last()).toHaveText('After the list');
  await page.keyboard.press('Enter');
  await page.keyboard.type('1. First');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Second');
  await expect(editor.locator('ol li')).toHaveText(['First', 'Second']);
  // Backspace at the start of an item with words in it takes just the bullet off.
  await page.keyboard.press('Home');
  await page.keyboard.press('Backspace');
  await expect(editor.locator('ol li')).toHaveText(['First']);
  await expect(editor.locator('p').last()).toHaveText('Second');
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await page.keyboard.type(`She said "it's 'fine'" today.`);
  await expect(editor.locator('p').last()).toHaveText('She said “it’s ‘fine’” today.');
  await expect.poll(() => page.evaluate(() => (document.querySelector('to-app') as unknown as { env: { body: string } }).env.body)).toBe('- Milk\n- Eggs\n\nAfter the list\n\n1. First\n\nSecond\n\nShe said “it’s ‘fine’” today.');
  // A dash in the middle of a line, or a number with no space after it, is just text.
  await page.keyboard.press('Enter');
  await page.keyboard.type('Pages 1-2 and 3.5 are well-known');
  await expect(editor.locator('p').last()).toHaveText('Pages 1-2 and 3.5 are well-known');
});

// Quotes are curly in every text that takes marks: a slide's bullets, an outline's items.
test('quotes are curly in a deck and an outline too', async ({ page }) => {
  await page.goto('/deck/#doc=' + encodeURIComponent('## Plan\n\n- first'));
  const bullets = page.getByRole('textbox', { name: 'Bullets' });
  await bullets.click();
  await page.keyboard.press('End');
  await page.keyboard.type(` "done" it's`);
  await expect(bullets).toContainText('first “done” it’s');
  await page.goto('/#/v0/outline');
  const item = page.getByRole('textbox', { name: 'Item 1' });
  await item.click();
  await page.keyboard.type(`Rock 'n' roll`);
  await expect(item).toHaveText('Rock ‘n’ roll');
});
