import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { shot, reopen } from './helpers';

// Stays: each example's picture is drawn on a canvas and downloaded, and the guide is served by the real server (opening each example is in test/dom/links.test.ts).
test('every example in the skill draws a picture; the guide is served', async ({ page }) => {
  test.slow();
  await page.route('https://tile.openstreetmap.org/**', (route) => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') }));
  const skill = readFileSync(new URL('../skill/tinyoffice/SKILL.md', import.meta.url), 'utf8');
  const links = [...skill.matchAll(/^\s*https:\/\/tinylittleoffice\.com\/(\w+)\/#(\S+)$/gm)];
  expect(links.length).toBeGreaterThanOrEqual(25);
  for (const [, app, params] of links) {
    await page.goto('about:blank');
    await page.goto(`/${app}/#${params}`);
    await expect(page.locator(`to-${app}`), app).toBeVisible();
    await expect.poll(() => page.url(), app).toMatch(new RegExp(`/${app}/#/v0/${app}/[yzr][A-Za-z0-9_-]+$`));
    // It drew something: the picture every other view is made from is not empty.
    const [png] = await Promise.all([page.waitForEvent('download'), page.goto(page.url().replace(`/v0/${app}/`, `/v0/${app}.png/`))]);
    expect(png.suggestedFilename(), app).toMatch(/\.png$/);
    const bytes = readFileSync(await png.path());
    expect(bytes.length, `${app} picture`).toBeGreaterThan(3000);
  }
  // The guide itself is served where programs look for it.
  const guide = await (await page.request.get('/llms.txt')).text();
  expect(guide).toContain('# TinyLittleOffice links');
  expect((await page.request.get('/tinyoffice.js')).status()).toBe(200);
});

// Stays: the embed code is read from the real clipboard and shown in a real frame on someone else's page (the code and the page it opens are in test/dom/links.test.ts).
test('a document can be shown inside another page', async ({ page }) => {
  await page.goto('/deck/#title=Launch+plan&doc=%23%23+%3Arocket%3A+Launch+plan+%7B.title%7D%0A%0A-+Spring%0A%0A---%0A%0A%23%23+Goals%0A%0A-+Ship+it%0A');
  await expect(page.locator('to-deck')).toBeVisible();
  await page.getByRole('button', { name: 'Share' }).click();
  await page.getByRole('menuitem', { name: 'Copy embed code' }).click();
  const code = await page.evaluate(() => navigator.clipboard.readText());
  expect(code).toMatch(/^<iframe src="http:\/\/localhost:\d+\/deck\/#\/v0\/deck\.embed\/[^"]+"/);
  // In a page of its own, as the frame will show it: the document, and a way to the editor.
  await page.setContent(`<h1>Someone else's page</h1>${code}`);
  const frame = page.frameLocator('iframe');
  await expect(frame.locator('.to-embedded .pic svg')).toContainText('Launch plan');
  await expect(frame.locator('.to-header')).toHaveCount(0);
  await frame.getByRole('button', { name: 'Next page' }).click();
  await expect(frame.locator('.to-embedded .pic svg')).toContainText('Goals');
  await shot(page, 'embedded');
});

// Stays: joining, dragging and placing go by where the pointer is on the canvas (the rest is in test/dom/diagrams.test.ts).
test('draw: a join dragged between shapes follows a shape dragged away; a shape placed by a click', async ({ page, isMobile }) => {
  const { encodeEnvelope } = await import('../src/lib/envelope.ts');
  await page.goto('/#/v0/draw/' + encodeEnvelope({ created: null, body: 'Kind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\no | 4 | 6 | 16 | 8 | 1b | Web\nc | 40 | 20 | 14 | 10 | 0 | Data' }));
  const canvas = page.getByRole('img', { name: 'Drawing canvas' });
  await expect(canvas.locator('g.shape')).toHaveCount(2);
  const centre = async (i: number) => {
    const b = (await canvas.locator('g.shape').nth(i).boundingBox())!;
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  };
  // The join tool: press on one shape, let go on the other.
  await page.getByRole('button', { name: 'Join two shapes' }).click();
  const a = await centre(0);
  const b = await centre(1);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 5 });
  await page.mouse.up();
  await expect(canvas.locator('g.shape')).toHaveCount(3);
  const line = canvas.locator('g.shape').nth(2).locator('line[marker-end]');
  await expect(line).toHaveCount(1);
  const before = await line.getAttribute('x2');
  // Move the cylinder: the join goes with it.
  if (!isMobile) {
    await page.mouse.move(b.x, b.y);
    await page.mouse.down();
    await page.mouse.move(b.x + 80, b.y - 40, { steps: 5 });
    await page.mouse.up();
    await expect.poll(() => line.getAttribute('x2')).not.toBe(before);
  }
  // More shapes are a menu away.
  await page.getByRole('button', { name: 'Shapes', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Hexagon' }).click();
  const box = (await canvas.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.2, box.y + box.height * 0.8);
  await expect(canvas.locator('g.shape')).toHaveCount(4);
  await shot(page, 'draw-join');
});

// Stays: whether a font has loaded, and the style a box is drawn in, are the browser's.
test('everything is set in IBM Plex', async ({ page }) => {
  await page.goto('/#/v0/write');
  await page.evaluate(() => document.fonts.ready);
  const fonts = await page.evaluate(() => ({
    body: getComputedStyle(document.body).fontFamily,
    loaded: document.fonts.check("16px 'IBM Plex Sans'") && document.fonts.check("700 16px 'IBM Plex Sans'"),
  }));
  expect(fonts.body).toMatch(/^"?IBM Plex Sans/);
  expect(fonts.loaded).toBe(true);
  await page.goto('/#/v0/sheet');
  await expect(page.getByRole('textbox', { name: 'A1', exact: true })).toHaveCSS('font-family', /IBM Plex Mono/);
});

// Stays: zoom is the canvas's drawn size, and a click finds a shape, or a place for an icon, by where it is (an icon on a shape is in test/dom/diagrams.test.ts).
test('draw: zoom, and an icon placed by a click', async ({ page }) => {
  const { encodeEnvelope } = await import('../src/lib/envelope.ts');
  await page.goto('/#/v0/draw/' + encodeEnvelope({ created: null, body: 'Kind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\no | 4 | 6 | 16 | 8 | 1b | Web' }));
  const canvas = page.getByRole('img', { name: 'Drawing canvas' });
  const width = () => canvas.evaluate((el) => el.getBoundingClientRect().width);
  const fit = await width();
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await page.getByRole('button', { name: 'Zoom in' }).click();
  expect(await width()).toBeCloseTo(fit * 1.5, -1);
  await expect(page.getByRole('button', { name: /^Zoom: 150%/ })).toBeVisible();
  // Shapes are still where the pointer says they are.
  await canvas.locator('g.shape').first().click();
  await expect(page.getByRole('textbox', { name: 'Label' })).toHaveValue('Web');
  await page.getByRole('button', { name: /^Zoom: 150%/ }).click();
  expect(await width()).toBeCloseTo(fit, -1);
  await page.getByRole('button', { name: 'Zoom out' }).click();
  expect(await width()).toBeCloseTo(fit * 0.75, -1);
  await page.getByRole('button', { name: /^Zoom: 75%/ }).click();

  // An icon on its own: pick it, then click where it goes.
  await page.keyboard.press('Escape');
  await canvas.click({ position: { x: 5, y: 5 } });
  await page.getByRole('button', { name: 'Icon', exact: true }).click();
  await page.locator('sl-dialog.to-icons sl-input input').fill('accessib');
  await page.locator('sl-dialog.to-icons').getByRole('button', { name: 'accessibility', exact: true }).click();
  await expect(page.locator('sl-dialog.to-icons')).toHaveCount(0);
  const box = (await canvas.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.6);
  await expect(canvas.locator('g.shape')).toHaveCount(2);
  await reopen(page);
  await expect(canvas.locator('g.shape')).toHaveCount(2);
  await expect(canvas.locator('g[stroke-linecap="round"]')).toHaveCount(1);
  await shot(page, 'draw-icons');
});

// Stays: a shop's cart is its page's own script, in a frame, and the invoice's PDF is drawn on a canvas (the pages as written, and the download, are in test/dom/pages.test.ts).
test('page apps: a shop with a cart, an invoice as a PDF', async ({ page }) => {
  // A shop: things go in the cart, and the total adds up.
  const { encodeEnvelope } = await import('../src/lib/envelope.ts');
  await page.goto('/#/v0/site/' + encodeEnvelope({ created: null, body: '---\norders: orders@example.com\n---\n# Harbor Coffee Shop\n\nBeans and things.\n\n## Shop\n\nName | Price:money | About | Image\n--- | --- | --- | ---\nHouse blend, 250g | 12.50 | Chocolate and orange. |\nTin mug | 9.00 | Enamel. |' }));
  const store = page.frameLocator('to-site iframe');
  await expect(store.getByRole('button', { name: 'Send order by email' })).toBeDisabled();
  await store.getByRole('button', { name: 'Add House blend, 250g to the cart' }).click();
  await store.getByRole('button', { name: 'Add House blend, 250g to the cart' }).click();
  await store.getByRole('button', { name: 'Add Tin mug to the cart' }).click();
  await expect(store.locator('#count')).toHaveText('3');
  await expect(store.locator('#total')).toHaveText('$34.00');
  await store.getByRole('button', { name: 'One fewer House blend, 250g' }).click();
  await expect(store.locator('#total')).toHaveText('$21.50');
  await expect(store.getByRole('button', { name: 'Send order by email' })).toBeEnabled();
  await shot(page, 'shop');

  // An invoice: the PDF is the invoice.
  await page.goto('/#/v0/invoice');
  await page.getByRole('button', { name: 'Start from an example' }).click();
  await expect(page.locator('to-invoice [data-inv="total"]')).toHaveText('$5,486.40');
  const [pdf] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Control+p')]);
  expect(pdf.suggestedFilename()).toBe('invoice-0042.pdf');
  expect(readFileSync(await pdf.path()).subarray(0, 5).toString()).toBe('%PDF-');
  await shot(page, 'invoice');
});

// Stays: whether the words fit their page is the browser's layout, the PDF is drawn on a canvas, and the reading page turns by its own script (the rest is in test/dom/print.test.ts).
test('zine: the words fit the page, the PDF is drawn, and the web page turns', async ({ page }) => {
  const { encodeEnvelope } = await import('../src/lib/envelope.ts');
  await page.goto('/#/v0/zine/' + encodeEnvelope({ created: null, body: '## Small Joys {.title}\n\n- Issue one\n\n---\n\n## Coffee\n\nThe first cup.\n\n---\n\n## Bread\n\nFresh bread\n' }));
  await page.getByRole('button', { name: 'Page 2' }).click();
  await page.getByRole('textbox', { name: 'Words' }).fill('The first cup of the day, before anyone else is up. '.repeat(14));
  // (Measured at the page's own size: on a phone the rail draws it so small that the rounding of three-pixel type decides.)
  const fits = await page.locator('.deck-thumb[aria-current="true"] > svg').evaluate((svg) => {
    const [, , w, h] = svg.getAttribute('viewBox')!.split(' ').map(Number);
    Object.assign((svg as SVGSVGElement).style, { width: `${w}px`, height: `${h}px` });
    const box = svg.getBoundingClientRect();
    return [...svg.querySelectorAll('text')].every((t) => t.getBoundingClientRect().bottom <= box.bottom + 1 && t.getBoundingClientRect().right <= box.right + 1);
  });
  expect(fits).toBe(true);
  await shot(page, 'zine');
  await page.getByRole('button', { name: 'See the sheet to print' }).click();
  await shot(page, 'zine-sheet');
  const [one] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Control+p')]);
  expect(one.suggestedFilename()).toBe('small-joys.pdf');
  const pdf = readFileSync(await one.path()).toString('latin1');
  expect(pdf.startsWith('%PDF-')).toBe(true);
  expect(pdf).toContain('/MediaBox [0 0 792 612]');
  expect(pdf).toContain('/Subtype /Image');

  // The web page is the zine to read: tap to turn.
  await page.getByRole('button', { name: 'Download' }).click();
  const [file] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: /Web page/ }).click()]);
  const html = readFileSync(await file.path(), 'utf8');
  await page.setContent(html);
  await expect(page.locator('section.on')).toHaveAttribute('aria-label', 'Front cover');
  await expect(page.locator('#where')).toHaveText('1 / 8');
  const wide = page.viewportSize()!.width;
  await page.locator('#pages').click({ position: { x: wide * 0.8, y: 200 } });
  await expect(page.locator('section.on')).toContainText('Coffee');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('section.on')).toContainText('Fresh bread');
  await page.locator('#pages').click({ position: { x: 20, y: 200 } });
  await expect(page.locator('#where')).toHaveText('2 / 8');
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('button', { name: 'Back' })).toBeDisabled();
});

// Stays: the model is worked by its page's own script, in a frame, as the sliders move.
test('stock and flow: sliders move the diagram', async ({ page }) => {
  await page.goto('/#/v0/flow');
  await page.getByRole('button', { name: 'Start from an example' }).click();
  const model = page.frameLocator('to-flow iframe');
  await expect(model.locator('input[type="range"]')).toHaveCount(4);
  await expect(model.locator('svg path')).toHaveCount(6);
  await expect(model.locator('svg rect')).toHaveCount(7);
  // Every stock says how much is in it.
  await expect(model.locator('svg')).toContainText('Signups');
  await expect(model.locator('#say')).toContainText('Signups 1,200');
  const band = () => model.locator('svg path').first().getAttribute('stroke-width').then(Number);
  const before = await band();
  // More people sign up: the number changes, and the band to Signups thickens.
  await model.locator('#s_signup_rate').fill('30');
  await expect(model.locator('#o_signup_rate')).toHaveText('30%');
  await expect(model.locator('#say')).toContainText('Signups 6,000');
  await expect(model.locator('#say')).toContainText('Paying 1,500');
  expect(await band()).toBeGreaterThan(before * 3);
  await shot(page, 'flow');
});

// Stays: a drag with the real mouse finds the squares under it by their place on the screen (the rest is in test/dom/tools.test.ts).
test('pixel art: a drag colours the squares under the pointer', async ({ page }) => {
  await page.goto('/#/v0/pixel');
  const cell = (r: number, c: number) => page.getByRole('gridcell', { name: new RegExp(`^Row ${r}, column ${c}:`) });
  await page.getByRole('radio', { name: 'Red' }).click();
  const drag = async (r1: number, c1: number, r2: number, c2: number) => {
    const [a, b] = [(await cell(r1, c1).boundingBox())!, (await cell(r2, c2).boundingBox())!];
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
    await page.mouse.up();
  };
  await drag(3, 2, 3, 6);
  for (const c of [2, 3, 4, 5, 6]) await expect(cell(3, c)).toHaveAccessibleName(`Row 3, column ${c}: Red`);
  await page.getByRole('button', { name: 'Box', exact: true }).click();
  await drag(6, 6, 9, 10);
  await expect(cell(9, 10)).toHaveAccessibleName('Row 9, column 10: Red');
  await expect(cell(7, 8)).toHaveAccessibleName('Row 7, column 8: empty');
  await shot(page, 'pixel-tools');
});
// Stays: each game works by its page's own script, in a frame (what the pages say before anyone plays is in test/dom/pages.test.ts).
test('small apps: games and things to share work as pages', async ({ page }) => {
  const open = async (app: string) => {
    await page.goto(`/#/v0/${app}`);
    await page.getByRole('button', { name: 'Start from an example' }).click();
    return page.frameLocator(`to-${app} iframe`);
  };
  // The wheel picks someone.
  let f = await open('spinner');
  await f.getByRole('button', { name: 'Spin' }).click();
  await expect(f.locator('#won')).toHaveText(/Ada|Grace|Alan|Margaret|Linus|Barbara/, { timeout: 8000 });
  // Secret Santa: a person's own link shows their draw at the press of a button.
  f = await open('santa');
  const adas = await f.locator('.links li', { hasText: 'Ada' }).getByRole('link').getAttribute('href');
  await page.goto(adas!.replace(/^https?:\/\/[^/]+\//, '/'));
  f = page.frameLocator('to-santa iframe');
  await f.getByRole('button', { name: 'Show me who I give to' }).click();
  await expect(f.locator('#who')).toContainText(/^You give to (Grace|Alan|Margaret|Linus)\.$/);
});

// Stays: the map is Leaflet, laid out by the browser, and the tap lands by where it is.
test('a map on a slide: a tap on the map goes to the next stop', async ({ page }) => {
  const { encodeEnvelope } = await import('../src/lib/envelope.ts');
  const trip = '```trip\nPlace | Lat:number | Lon:number | Note\n--- | --- | --- | ---\nLisbon | 38.7223 | -9.1393 | Start here\nCoimbra | 40.2033 | -8.4103 |\nPorto | 41.1579 | -8.6291 |\n```';
  await page.goto('/#/v0/deck/' + encodeEnvelope({ created: null, body: `## Trip\n\n${trip}\n\n---\n\n## After\n\n- done\n` }));
  await page.getByRole('button', { name: 'Present' }).click();
  const map = page.locator('.deck-show .deck-map');
  await expect(map).toBeVisible();
  const box = (await map.boundingBox())!;
  // Taps land on the slide even over the map: stop by stop, then the next slide.
  // (Spaced out: a quick second tap means "show me the whole slide".)
  const tap = async () => {
    await page.waitForTimeout(450);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  };
  for (let i = 0; i < 3; i++) await tap();
  await expect(map.locator('.leaflet-popup').last()).toContainText('3. Porto');
  await tap();
  await expect(page.locator('.deck-show .frame > svg')).toContainText('After');
});

// Stays: the PNG is drawn on a canvas and downloaded (the dialog, the SVG and the too-long message are in test/dom/links.test.ts).
test('the whole document as a QR code, kept as a PNG', async ({ page }) => {
  const { encodeEnvelope } = await import('../src/lib/envelope.ts');
  await page.goto('/#/v0/todo/' + encodeEnvelope({ created: 1, body: '- [ ] Scan me' }));
  // The header button, or on a phone the Share menu's item.
  if (await page.locator('sl-button[aria-label="QR code"]').isVisible()) await page.locator('sl-button[aria-label="QR code"]').click();
  else {
    await page.getByRole('button', { name: 'Share' }).click();
    await page.getByRole('menuitem', { name: 'QR code' }).click();
  }
  const dialog = page.locator('#qr-dialog');
  await expect(dialog.getByRole('img', { name: 'QR code of this document' }).locator('svg')).toBeVisible();
  const [png] = await Promise.all([page.waitForEvent('download'), dialog.getByRole('button', { name: 'PNG' }).click()]);
  expect(png.suggestedFilename()).toMatch(/-qr\.png$/);
  expect(readFileSync(await png.path()).subarray(1, 4).toString()).toBe('PNG');
  await shot(page, 'qr');
});

// Stays: marks are made by the browser's own editing commands, on a selection made with the keyboard (nesting is in test/dom/deck-write.test.ts).
test('slides: bold and italic, from the keyboard and the toolbar', async ({ page }) => {
  await page.goto('/#/v0/deck');
  const value = () => page.evaluate(() => (document.querySelector('to-deck') as HTMLElement & { value: string }).value);
  const head = page.getByRole('textbox', { name: 'Headline' });
  await head.click();
  await page.keyboard.type('Spring launch');
  await page.keyboard.press('Home');
  for (let i = 0; i < 6; i++) await page.keyboard.press('Shift+ArrowRight');
  // (A headline is bold already; italic is the mark that shows.)
  await page.keyboard.press('Control+i');
  await expect.poll(value).toMatch(/\*Spring\* launch/);
  // The slide itself (in the rail) shows the words, not the marks.
  await expect(page.locator('.deck-rail .deck-thumb svg').first()).toContainText('Spring launch');
  await expect(page.locator('.deck-rail .deck-thumb svg').first()).not.toContainText('*');
  // Bullets: the toolbar marks what is selected.
  const bullets = page.getByRole('textbox', { name: 'Bullets' });
  await bullets.click();
  await page.keyboard.type('Ship the beta');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Tell everyone');
  await page.keyboard.press('Home');
  for (let i = 0; i < 4; i++) await page.keyboard.press('Shift+ArrowRight');
  await page.getByRole('button', { name: 'Italic' }).click();
  await expect.poll(value).toMatch(/- Ship the beta\n- \*Tell\* everyone/);
  // Tab, from the real keyboard, steps the bullet in.
  await page.keyboard.press('End');
  await page.keyboard.press('Tab');
  await expect.poll(value).toMatch(/\n  - \*Tell\* everyone/);
});

// Stays: highlight and alignment are the browser's own editing commands (the icon, and the marks read back, are in test/dom/deck-write.test.ts).
test('write: highlight and alignment from the toolbar', async ({ page }) => {
  await page.goto('/#/v0/write');
  const doc = page.getByRole('textbox', { name: 'Document' });
  await doc.click();
  await page.keyboard.type('Ship it today');
  await page.keyboard.press('Shift+Home');
  await page.getByRole('button', { name: 'Highlight' }).click();
  // (The browser writes a coloured span; the document reads it as a highlight.)
  await expect(doc.locator('mark, span[style*="background"]')).toHaveText('Ship it today');
  await page.getByRole('button', { name: 'Centre' }).click();
  await expect(doc.locator('p')).toHaveAttribute('style', /text-align: ?center/);
  await expect.poll(() => page.evaluate(() => (document.querySelector('to-write') as HTMLElement & { value: string }).value)).toMatch(/^==Ship it today== \{\.center\}$/);
  await shot(page, 'write-marks');
});

