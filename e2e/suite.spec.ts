import { test, expect } from '@playwright/test';
import { shot, reopen, navTo, pickOption } from './helpers';

// Stays: the corner handle and a mouse drag find their cells by where the pointer is on screen (the rest of blocks is in test/dom/suite.test.ts).
test('sheet: the corner handle carries a block on, and a mouse drag selects one', async ({ page, isMobile }) => {
  await page.goto('/#/v0/sheet');
  const cell = (ref: string) => page.getByRole('textbox', { name: ref, exact: true });
  const ref = page.getByLabel('Selected cells');
  // The handle at the corner of a block carries it on: numbers in step keep counting.
  await cell('A1').fill('5');
  await cell('A2').fill('10');
  await cell('A1').click();
  await page.keyboard.press('Shift+ArrowDown');
  const handle = page.locator('table.sheet .fill');
  await expect(handle).toHaveCount(1);
  const from = (await handle.boundingBox())!;
  const to = (await cell('A5').boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 5 });
  await expect(page.locator('table.sheet td.filling')).toHaveCount(5);
  await page.mouse.up();
  await expect(ref).toHaveText('A1:A5');
  await cell('F1').click();
  await expect(cell('A3')).toHaveValue('15');
  await expect(cell('A5')).toHaveValue('25');

  // Dragging across cells with a mouse selects a block too.
  if (!isMobile) {
    const a = (await cell('A1').boundingBox())!;
    const b = (await cell('B3').boundingBox())!;
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 5 });
    await page.mouse.up();
    await expect(ref).toHaveText('A1:B3');
  }
  await shot(page, 'sheet-block');
  await reopen(page);
  await expect(cell('A5')).toHaveValue('25');
});

// Stays: whether a column clips its text, and how wide it is dragged, is real layout.
test('sheet: columns squeeze to fit or widen to show everything', async ({ page }) => {
  await page.goto('/#/v0/sheet');
  const cell = (ref: string) => page.getByRole('textbox', { name: ref, exact: true });
  const long = 'A sentence that is far too long for one third of a small page to show';
  await cell('B1').fill(long);
  await cell('A1').fill('1');
  await cell('A2').click();
  const clipped = () => cell('B1').evaluate((el: HTMLInputElement) => el.scrollWidth > el.clientWidth);
  const tableWidth = () => page.locator('table.sheet').evaluate((el) => el.getBoundingClientRect().width);
  const scrollWidth = () => page.locator('.sheet-scroll').evaluate((el) => el.clientWidth);
  expect(await clipped()).toBe(true);
  expect(await tableWidth()).toBeLessThanOrEqual((await scrollWidth()) + 1);

  await page.getByRole('button', { name: 'Show all text' }).click();
  expect(await clipped()).toBe(false);
  const colA = () => cell('A1').evaluate((el) => el.getBoundingClientRect().width);
  expect(await colA()).toBeLessThan(80);
  await shot(page, 'sheet-all');

  // Drag a header edge to widen one column by hand.
  const grip = page.getByRole('separator', { name: 'Resize column A' });
  const box = (await grip.boundingBox())!;
  const before = await colA();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2, { steps: 4 });
  await page.mouse.up();
  expect(Math.round((await colA()) - before)).toBe(60);

  await page.getByRole('button', { name: 'Fit to page' }).click();
  expect(await clipped()).toBe(true);
  expect(await tableWidth()).toBeLessThanOrEqual((await scrollWidth()) + 1);
});

// Stays: typing, Bold and lists go through the browser's editing commands (execCommand), which happy-dom lacks.
test('write: rich text survives the round trip', async ({ page }) => {
  await page.goto('/#/v0/write');
  const editor = page.getByRole('textbox', { name: 'Document' });
  await editor.click();
  await page.keyboard.type('Memo');
  await page.getByRole('button', { name: 'Heading', exact: true }).click();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Plain then ');
  await page.keyboard.press('Control+b');
  await page.keyboard.type('bold');
  await page.keyboard.press('Control+b');
  await page.keyboard.type(' text.');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Bulleted list' }).click();
  await page.keyboard.type('first');
  await page.keyboard.press('Enter');
  await page.keyboard.type('second');
  await expect(page.locator('.write-foot')).toContainText('7 words');
  expect(page.url()).toMatch(/#\/v0\/write\/[WYZR]/);

  await reopen(page);
  const html = await editor.innerHTML();
  expect(html).toMatch(/<h1>Memo<\/h1>/);
  expect(html).toMatch(/Plain then <b>bold<\/b> text\./);
  expect(html).toMatch(/<ul><li>first<\/li><li>second<\/li><\/ul>/);
  // Toolbar reflects the caret's formatting.
  await editor.locator('b').click();
  await expect(page.locator('sl-button', { hasText: 'Bold' })).toHaveAttribute('aria-pressed', 'true');
  await shot(page, 'write');
});

// Stays: how bullets wrap and how big the type is drawn are real layout (the rest of the deck is in test/dom/suite-deck.test.ts).
test('deck: bullets wrap under their dots, and type shrinks as a slide fills', async ({ page }) => {
  await page.goto('/#/v0/deck');
  const bullets = page.getByRole('textbox', { name: 'Bullets' });
  await page.getByRole('textbox', { name: 'Headline' }).fill('Spring launch');
  await page.getByRole('button', { name: 'Slide', exact: true }).click();
  await expect(page.locator('.deck-slide.lay-b')).toBeVisible();
  // Each bullet is a line of its own with a dot before it, and a long one wraps under its dot.
  await bullets.fill('Build it\n' + 'A long bullet that wraps on to more lines than one. '.repeat(3).trim() + '\nTell people');
  const geometry = await page.locator('.deck-slide .bullets .write-page').evaluate((el) => {
    const lines = [...el.querySelectorAll(':scope > p')];
    return { dots: lines.filter((p) => p.textContent?.trim()).length, wrapped: lines[1].getBoundingClientRect().height > lines[0].getBoundingClientRect().height * 1.8 };
  });
  expect(geometry).toEqual({ dots: 3, wrapped: true });
  // Type shrinks as the slide fills up, and grows back.
  // (--body is the size on the 960px slide the audience sees; a phone's editor stops shrinking at 16px so it stays typeable.)
  const px = () => page.locator('.deck-slide').evaluate((el) => parseFloat(getComputedStyle(el).getPropertyValue('--body')));
  await bullets.fill('Build it\nShip it\nTell people');
  const roomy = await px();
  await bullets.fill(Array.from({ length: 12 }, (_, i) => `Point number ${i + 1} with a few more words in it`).join('\n'));
  expect(await px()).toBeLessThan(roomy * 0.8);
  await bullets.fill('Build it\nShip it\nTell people');
  expect(await px()).toBe(roomy);
  await shot(page, 'deck');
});

// Stays: that a document on a slide takes the slide's whole width is real layout (the rest is in test/dom/suite-deck.test.ts).
test('deck: a document on a slide has the slide to itself', async ({ page }) => {
  const { encodeEnvelope } = await import('../src/lib/envelope.ts');
  const draw = 'draw/' + encodeEnvelope({ created: null, body: 'r,2,1,12,6,1,One\ne,20,10,10,8,0,Two\na,14,4,8,8,0' });
  await page.goto('/#/v0/deck/' + encodeEnvelope({ created: null, body: `Drawing\nfirst\n@@${draw}` }));
  await expect(page.locator('.deck-slide to-embed')).toHaveCount(1);
  const full = await page.locator('.deck-slide to-embed').evaluate((el) => el.getBoundingClientRect().width / el.parentElement!.getBoundingClientRect().width);
  expect(full).toBeGreaterThan(0.9);
  await shot(page, 'deck-sub');
});

// Stays: the motion is drawn and moved by dragging on the canvas and the stage, by where the pointer is.
test('deck: a motion slide is made and changed from the slide itself', async ({ page }) => {
  await page.goto('/#/v0/deck');
  await page.getByRole('combobox', { name: 'Add a slide' }).fill('motion');
  await page.getByRole('combobox', { name: 'Add a slide' }).press('Enter');
  const sub = page.locator('sl-dialog.to-sub');
  await expect(sub).toHaveAttribute('open');
  // An empty one opens in Draw mode: some text, then Done.
  await sub.getByRole('button', { name: 'Text', exact: true }).click();
  const canvas = sub.getByRole('img', { name: 'Drawing canvas' });
  const box = (await canvas.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.5);
  await sub.getByRole('textbox', { name: 'Label' }).fill('Lift off');
  await sub.getByRole('button', { name: 'Done' }).click();
  const embed = page.locator('.deck-slide to-embed');
  await expect(embed.locator('svg[role="img"]')).toContainText('Lift off');
  // Tapping the picture opens it again; so does Edit. Its bar sits inside the slide.
  await expect(embed).toContainText('Tap to edit');
  const inside = await embed.evaluate((el) => el.getBoundingClientRect().bottom <= el.closest('.deck-slide')!.getBoundingClientRect().bottom + 1);
  expect(inside).toBe(true);
  await embed.locator('svg[role="img"]').click();
  // Drawn already, it opens in Move mode. Give the words somewhere to go, so they move when the deck is shown.
  const stage = sub.getByRole('application', { name: 'Stage' });
  await expect(stage.locator('g.hit')).toHaveCount(1);
  await sub.getByRole('slider', { name: 'Time' }).fill('23');
  await stage.scrollIntoViewIfNeeded();
  const sb = (await stage.boundingBox())!;
  await page.mouse.move(sb.x + sb.width * 0.3 + 48 * (sb.width / 640), sb.y + sb.height * 0.5 + 12 * (sb.height / 400));
  await page.mouse.down();
  await page.mouse.move(sb.x + sb.width * 0.8, sb.y + sb.height * 0.2, { steps: 4 });
  await page.mouse.up();
  await expect(page.locator('.motion-keys .key')).toHaveCount(2);
  await sub.getByRole('button', { name: 'Done' }).click();
  await expect(sub).toHaveCount(0);
  await expect(embed.locator('svg[role="img"] animateTransform').first()).toBeAttached();
  await reopen(page);
  // (It was added as a slide of its own, after the first.)
  await page.locator('.deck-rail .deck-thumb').nth(1).click();
  await embed.getByRole('button', { name: 'Edit' }).click();
  await expect(sub.locator('.motion-stage g.hit')).toHaveCount(1);
  await sub.getByRole('button', { name: 'Done' }).click();
  // Presented, it has the slide and it plays.
  await page.getByRole('button', { name: 'Present' }).click();
  const slide = page.locator('.deck-show .frame > svg');
  await expect(slide).toContainText('Lift off');
  // It plays once and stops where it ended; it does not loop.
  await expect(slide.locator('animateTransform').first()).toHaveAttribute('repeatCount', '1');
  await expect(slide.locator('animateTransform').first()).toHaveAttribute('fill', 'freeze');
  await page.keyboard.press('Escape');
});

// Stays: shapes are drawn by dragging at coordinates, and text size is what the browser draws (choosing, colouring, deleting are in test/dom/suite-deck.test.ts).
test('draw: shapes with labels persist', async ({ page }) => {
  await page.goto('/#/v0/draw');
  const canvas = page.getByRole('img', { name: 'Drawing canvas' });
  const box = (await canvas.boundingBox())!;
  const at = (fx: number, fy: number) => ({ x: box.x + box.width * fx, y: box.y + box.height * fy });

  await page.getByRole('button', { name: 'Rectangle' }).click();
  let p = at(0.1, 0.1);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  p = at(0.35, 0.3);
  await page.mouse.move(p.x, p.y, { steps: 5 });
  await page.mouse.up();
  await page.getByRole('textbox', { name: 'Label' }).fill('Start');

  await page.getByRole('button', { name: 'Ellipse' }).click();
  p = at(0.6, 0.5);
  await page.mouse.click(p.x, p.y);
  await page.getByRole('textbox', { name: 'Label' }).fill('End');
  await pickOption(page, 'sl-select.draw-fill', '2');

  await page.getByRole('button', { name: 'Arrow' }).click();
  p = at(0.36, 0.2);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  p = at(0.59, 0.5);
  await page.mouse.move(p.x, p.y, { steps: 5 });
  await page.mouse.up();

  await expect(canvas.locator('g.shape')).toHaveCount(3);
  await reopen(page);
  await expect(canvas.locator('g.shape')).toHaveCount(3);
  await expect(canvas.locator('text')).toHaveText(['Start', 'End']);
  await expect(canvas.locator('ellipse[fill="var(--to-ink)"]')).toHaveCount(1);

  // Colour and text size belong to each shape and travel in the link.
  await canvas.locator('g.shape').nth(0).click();
  await page.getByRole('radio', { name: 'Blue' }).click();
  await pickOption(page, 'sl-select[label="Text size"]', '4');
  await expect(canvas.locator('rect[stroke="#0072b2"]')).toHaveCount(1);
  await reopen(page);
  await expect(canvas.locator('rect[stroke="#0072b2"]')).toHaveCount(1);
  const sizes = await canvas.locator('text').evaluateAll((els) => els.map((el) => getComputedStyle(el).fontSize));
  expect(sizes).toEqual(['30px', '14px']);
  await shot(page, 'draw');
});

// Stays: a finger on the handle finds its cell by where it is on screen.
test('sheet: on a touch screen the corner handle stretches the block any way, and buttons fill it', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'touch only');
  await page.goto('/#/v0/sheet');
  const cell = (ref: string) => page.getByRole('textbox', { name: ref, exact: true });
  await cell('A1').fill('1');
  await cell('B1').fill('=A1*2');
  await cell('A1').click();
  const handle = page.locator('table.sheet .fill');
  const from = (await handle.boundingBox())!;
  const to = (await cell('B3').boundingBox())!;
  // A finger on the handle, dragged diagonally.
  const touch = (type: string, x: number, y: number) => handle.dispatchEvent(type, { pointerType: 'touch', pointerId: 7, clientX: x, clientY: y, bubbles: true, isPrimary: true });
  await touch('pointerdown', from.x + 5, from.y + 5);
  await touch('pointermove', to.x + to.width / 2, to.y + to.height / 2);
  await touch('pointerup', to.x + to.width / 2, to.y + to.height / 2);
  await expect(page.getByLabel('Selected cells')).toHaveText('A1:B3');
  await page.getByRole('button', { name: 'Fill down' }).click();
  await cell('D1').click();
  await expect(cell('A3')).toHaveValue('1');
  await expect(cell('B3')).toHaveValue('2');
});
