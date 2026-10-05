import { test, expect } from '@playwright/test';
import { shot, reopen, navTo, pickOption } from './helpers';

test('launcher lists every app', async ({ page }) => {
  await page.goto('/');
  const launcher = page.locator('.to-launcher a');
  await expect(launcher).toHaveCount(11);
  await expect(launcher.nth(0)).toContainText('Sheet');
  await shot(page, 'home');
});

test('sheet: formulas compute and persist in the URL', async ({ page }) => {
  await page.goto('/#/sheet');
  const cell = (ref: string) => page.getByRole('textbox', { name: ref, exact: true });
  await cell('A1').fill('10');
  await cell('A2').fill('32');
  await cell('A3').fill('=SUM(A1:A2)*2');
  await cell('B1').fill('=A3/0');
  await cell('C1').fill('Total');
  await cell('C2').fill('=ROUND(AVG(A1:A3),1)');
  await cell('C3').click();
  await expect(cell('A3')).toHaveValue('84');
  await expect(cell('B1')).toHaveValue('#DIV/0');
  await expect(cell('C2')).toHaveValue('42');
  expect(page.url()).toMatch(/#\/v2\/sheet\/[YZR][A-Za-z0-9_-]+$/);

  await reopen(page);
  await expect(cell('A3')).toHaveValue('84');
  await expect(cell('C1')).toHaveValue('Total');
  await cell('A3').focus();
  await expect(cell('A3')).toHaveValue('=SUM(A1:A2)*2');
  await expect(page.getByRole('textbox', { name: 'Formula' })).toHaveValue('=SUM(A1:A2)*2');
  await page.keyboard.press('Enter');
  await expect(cell('A4')).toBeFocused();
  // Editing in the formula bar writes to the selected cell.
  await page.getByRole('textbox', { name: 'Formula' }).fill('=A1*3');
  await cell('B4').click();
  await expect(cell('A4')).toHaveValue('30');
  await shot(page, 'sheet');
});

test('sheet: tapping cells builds a formula, and every function is one tap away', async ({ page }) => {
  await page.goto('/#/sheet');
  const cell = (ref: string) => page.getByRole('textbox', { name: ref, exact: true });
  await cell('A1').fill('10');
  await cell('A2').fill('32');
  await cell('B1').click();
  await page.keyboard.type('=SUM(');
  await cell('A2').click();
  await expect(cell('B1')).toBeFocused();
  await expect(cell('B1')).toHaveValue('=SUM(A2');
  // A second tap corrects the first rather than piling up references.
  await cell('A1').click();
  await expect(cell('B1')).toHaveValue('=SUM(A1');
  await page.keyboard.type(':');
  await cell('A2').click();
  await page.keyboard.type(')');
  await expect(cell('B1')).toHaveValue('=SUM(A1:A2)');
  // Once the formula is complete a tap just moves on.
  await cell('C1').click();
  await expect(cell('C1')).toBeFocused();
  await expect(cell('B1')).toHaveValue('42');

  // The function menu starts a formula; taps fill in its arguments.
  await page.getByRole('button', { name: 'Functions' }).click();
  await expect(page.getByRole('menuitem')).toHaveCount(10);
  await page.getByRole('menuitem', { name: /^MAX/ }).click();
  await expect(cell('C1')).toBeFocused();
  await expect(cell('C1')).toHaveValue('=MAX(');
  await cell('A1').click();
  await page.keyboard.type(',');
  await cell('A2').click();
  await page.keyboard.type(')');
  await page.keyboard.press('Enter');
  await expect(cell('C1')).toHaveValue('32');

  // Tapping also works from the formula bar.
  await cell('B2').click();
  const bar = page.getByRole('textbox', { name: 'Formula' });
  await bar.click();
  await page.keyboard.type('=A1*');
  await cell('A2').click();
  await expect(bar).toHaveValue('=A1*A2');
  await page.keyboard.press('Enter');
  await expect(cell('B2')).toHaveValue('320');
});

test('sheet: columns squeeze to fit or widen to show everything', async ({ page }) => {
  await page.goto('/#/sheet');
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

test('write: rich text survives the round trip', async ({ page }) => {
  await page.goto('/#/write');
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
  expect(page.url()).toMatch(/#\/v2\/write\/[YZR]/);

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

test('deck: slides, icons and presenting', async ({ page }) => {
  await page.goto('/#/deck');
  // A new deck opens on a title slide: big centred title, subtitle, no bullets.
  const titleToggle = page.locator('sl-button', { hasText: 'Title slide' });
  await expect(titleToggle).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('textbox', { name: 'Headline' }).fill('Spring launch');
  await page.getByRole('textbox', { name: 'Bullets' }).fill('What we are shipping');
  await expect(page.locator('.deck-slide.cover .mirror div.on')).toHaveCount(1);
  await page.getByRole('button', { name: 'Present' }).click();
  await expect(page.locator('.deck-show .frame.cover h1')).toHaveText('Spring launch');
  await expect(page.locator('.deck-show .sub')).toHaveText('What we are shipping');
  await expect(page.locator('.deck-show li')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await shot(page, 'deck-title');
  // The toolbar's Icon button opens the same picker as the box on the slide.
  await page.getByRole('button', { name: 'Icon', exact: true }).click();
  await expect(page.locator('#icon-picker')).toHaveAttribute('open');
  await page.getByRole('listbox', { name: 'Icon library' }).getByRole('button', { name: 'star', exact: true }).click();
  await expect(page.locator('.deck-slide .pick svg')).toBeVisible();
  await reopen(page);
  await expect(titleToggle).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('textbox', { name: 'Headline' })).toHaveValue('Spring launch');

  await page.goto('about:blank');
  await page.goto('/#/deck');
  await titleToggle.click();
  await expect(titleToggle).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('textbox', { name: 'Headline' }).fill('Launch plan');
  await page.getByRole('textbox', { name: 'Bullets' }).fill('Build it\nShip it\nTell people');
  // The slide's own words recommend icons, both on the slide and in the picker.
  await expect(page.getByRole('button', { name: 'Use rocket icon' })).toBeVisible();
  await page.getByRole('button', { name: 'Slide icon' }).click();
  const library = page.getByRole('listbox', { name: 'Icon library' });
  await expect(page.getByRole('group', { name: 'Suggested', exact: true }).getByRole('button', { name: 'rocket', exact: true })).toBeVisible();
  const search = page.locator('#icon-picker sl-input input');
  await search.fill('zzz');
  await expect(page.locator('.deck-picker-none')).toBeVisible();
  await search.fill('money');
  await expect(library.getByRole('button', { name: 'dollar', exact: true })).toBeVisible();
  await expect(library.getByRole('button', { name: 'rocket', exact: true })).toHaveCount(0);
  await search.fill('rock');
  await library.getByRole('button', { name: 'rocket', exact: true }).click();
  await expect(page.locator('#icon-picker')).not.toHaveAttribute('open');
  await expect(page.locator('.deck-suggest')).toHaveCount(0);
  await page.getByRole('button', { name: 'Slide', exact: true }).click();
  await page.getByRole('textbox', { name: 'Headline' }).fill('Second');
  await expect(page.locator('.to-toolbar .to-hint')).toHaveText('2 / 10');

  await reopen(page);
  const thumbs = page.locator('.deck-rail .deck-thumb');
  await expect(thumbs).toHaveCount(2);
  await expect(thumbs.nth(0)).toContainText('Launch plan');
  await thumbs.nth(0).click();
  await expect(page.getByRole('textbox', { name: 'Bullets' })).toHaveValue('Build it\nShip it\nTell people');
  await expect(page.locator('.deck-slide .pick svg')).toBeVisible();
  // Each dot sits on the first line of its bullet, at any font size, even when a bullet wraps.
  const bullets = page.getByRole('textbox', { name: 'Bullets' });
  await bullets.fill('Build it\n' + 'A long bullet that wraps on to more lines than one. '.repeat(4).trim() + '\nTell people');
  const geometry = await page.locator('.deck-slide .bullets').evaluate((el) => {
    const ta = el.querySelector('textarea')!;
    const mirror = el.querySelector('.mirror')!;
    const a = getComputedStyle(ta);
    const b = getComputedStyle(mirror);
    return {
      sameFont: a.fontSize === b.fontSize && a.lineHeight === b.lineHeight && a.fontFamily === b.fontFamily,
      sameBox: Math.abs(ta.getBoundingClientRect().height - mirror.getBoundingClientRect().height) < 1 && Math.abs(ta.getBoundingClientRect().top - mirror.getBoundingClientRect().top) < 1,
      fits: ta.scrollHeight <= ta.clientHeight + 1,
      dots: mirror.querySelectorAll('div.on').length,
      wrapped: mirror.children[1].getBoundingClientRect().height > mirror.children[0].getBoundingClientRect().height * 1.5,
    };
  });
  expect(geometry).toEqual({ sameFont: true, sameBox: true, fits: true, dots: 3, wrapped: true });
  await shot(page, 'deck');
  await bullets.fill('Build it\nShip it\nTell people');

  await page.getByRole('button', { name: 'Present' }).click();
  const show = page.getByRole('dialog', { name: 'Presentation' });
  await expect(show.locator('h1')).toHaveText('Launch plan');
  await expect(show.locator('li')).toHaveCount(3);
  await page.keyboard.press('ArrowRight');
  await expect(show.locator('h1')).toHaveText('Second');
  await page.keyboard.press('Escape');
  await expect(show).toHaveCount(0);

  for (let i = 0; i < 10; i++) {
    const btn = page.getByRole('button', { name: 'Slide', exact: true });
    if (await btn.isDisabled()) break;
    await btn.click();
  }
  await expect(thumbs).toHaveCount(10);
  await expect(page.getByRole('button', { name: 'Slide', exact: true })).toBeDisabled();
});

test('draw: shapes with labels persist', async ({ page }) => {
  await page.goto('/#/draw');
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
  await expect(canvas.locator('rect[stroke="#2563eb"]')).toHaveCount(1);
  await reopen(page);
  await expect(canvas.locator('rect[stroke="#2563eb"]')).toHaveCount(1);
  const sizes = await canvas.locator('text').evaluateAll((els) => els.map((el) => getComputedStyle(el).fontSize));
  expect(sizes).toEqual(['30px', '14px']);
  await canvas.locator('g.shape').nth(0).click();
  await expect(page.getByRole('radio', { name: 'Blue' })).toHaveAttribute('aria-checked', 'true');
  await shot(page, 'draw');

  await canvas.locator('g.shape').nth(0).click();
  await page.keyboard.press('Delete');
  await expect(canvas.locator('g.shape')).toHaveCount(2);
  // Keyboard tool switching and duplicate.
  await canvas.locator('g.shape').nth(0).click();
  await page.keyboard.press('Control+d');
  await expect(canvas.locator('g.shape')).toHaveCount(3);
});

test('meter flags documents that outgrow the URL', async ({ page }) => {
  await page.goto('/#/write');
  await page.getByRole('textbox', { name: 'Document' }).click();
  const meter = page.locator('.to-meter');
  await expect(meter).not.toHaveClass(/over/);
  let junk = '';
  let seed = 12345;
  for (let i = 0; i < 2600; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    junk += String.fromCharCode(33 + (seed % 90));
  }
  await page.evaluate((t) => {
    const ed = document.querySelector('.write-page') as HTMLElement;
    ed.textContent = t;
    ed.dispatchEvent(new Event('input', { bubbles: true }));
  }, junk);
  await expect(meter).toHaveClass(/over/);
  await expect(page.locator('.to-panel-head')).toContainText('over limit');
  expect(page.url().length).toBeGreaterThan(2048);
});

test('back and forward move between documents', async ({ page }) => {
  await page.goto('/#/sheet');
  await page.getByRole('textbox', { name: 'A1', exact: true }).fill('hello');
  await navTo(page, 'Write');
  await expect(page.getByRole('textbox', { name: 'Document' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('textbox', { name: 'A1', exact: true })).toHaveValue('hello');
});
