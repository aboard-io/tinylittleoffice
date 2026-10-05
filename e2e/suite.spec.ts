import { test, expect, type Page } from '@playwright/test';

const SHOTS = process.env.SHOTS; // directory for screenshots, optional

async function shot(page: Page, name: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
}

/** Reload the page at its current URL: the URL is the document, so this is the persistence test. */
async function reopen(page: Page) {
  const url = page.url();
  await page.goto('about:blank');
  await page.goto(url);
}

test('launcher lists the five apps', async ({ page }) => {
  await page.goto('/');
  const launcher = page.locator('to-app .launcher a');
  await expect(launcher).toHaveCount(5);
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
  await cell('C3').click(); // blur so computed values show
  await expect(cell('A3')).toHaveValue('84');
  await expect(cell('B1')).toHaveValue('#DIV/0');
  await expect(cell('C2')).toHaveValue('42');
  expect(page.url()).toMatch(/#\/sheet\/[zr][A-Za-z0-9_-]+$/);
  await expect(page.locator('.status .count')).toContainText('URL chars');

  await reopen(page);
  await expect(cell('A3')).toHaveValue('84');
  await expect(cell('C1')).toHaveValue('Total');
  await cell('A3').focus();
  await expect(cell('A3')).toHaveValue('=SUM(A1:A2)*2');
  // Enter moves down a row.
  await page.keyboard.press('Enter');
  await expect(cell('A4')).toBeFocused();
  await shot(page, 'sheet');
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
  await expect(page.locator('to-write .foot')).toContainText('7 words');
  expect(page.url()).toMatch(/#\/write\/[zr]/);

  await reopen(page);
  const html = await editor.innerHTML();
  expect(html).toMatch(/<h1>Memo<\/h1>/);
  expect(html).toMatch(/Plain then <b>bold<\/b> text\./);
  expect(html).toMatch(/<ul><li>first<\/li><li>second<\/li><\/ul>/);
  await shot(page, 'write');
});

test('deck: slides, icons and presenting', async ({ page }) => {
  await page.goto('/#/deck');
  await page.getByRole('textbox', { name: 'Headline' }).fill('Launch plan');
  await page.getByRole('textbox', { name: 'Bullets' }).fill('Build it\nShip it\nTell people');
  await page.getByRole('button', { name: 'Slide icon' }).click();
  await page.getByRole('button', { name: 'rocket', exact: true }).click();
  await page.getByRole('button', { name: 'Slide', exact: true }).click();
  await page.getByRole('textbox', { name: 'Headline' }).fill('Second');
  await expect(page.locator('.hint', { hasText: '2 / 10 slides' })).toBeVisible();

  await reopen(page);
  const thumbs = page.locator('.rail .thumb');
  await expect(thumbs).toHaveCount(2);
  await expect(thumbs.nth(0)).toContainText('Launch plan');
  await thumbs.nth(0).click();
  await expect(page.getByRole('textbox', { name: 'Bullets' })).toHaveValue('Build it\nShip it\nTell people');
  await expect(page.locator('.slide .pick svg')).toBeVisible();
  await shot(page, 'deck');

  await page.getByRole('button', { name: 'Present' }).click();
  const show = page.getByRole('dialog', { name: 'Presentation' });
  await expect(show.locator('h1')).toHaveText('Launch plan');
  await expect(show.locator('li')).toHaveCount(3);
  await shot(page, 'deck-present');
  await page.keyboard.press('ArrowRight');
  await expect(show.locator('h1')).toHaveText('Second');
  await page.keyboard.press('Escape');
  await expect(show).toHaveCount(0);

  // Hard cap of ten slides.
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
  await page.mouse.click(p.x, p.y); // click drops a default-sized shape
  await page.getByRole('textbox', { name: 'Label' }).fill('End');
  await page.getByRole('combobox', { name: 'Fill' }).selectOption('2');

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
  await expect(canvas.locator('rect[fill="var(--ink)"], ellipse[fill="var(--ink)"]')).toHaveCount(1);
  await shot(page, 'draw');

  // Select, nudge, delete.
  await canvas.locator('g.shape').nth(0).click();
  await page.keyboard.press('Delete');
  await expect(canvas.locator('g.shape')).toHaveCount(2);
});

test('meter flags documents that outgrow the URL', async ({ page }) => {
  await page.goto('/#/write');
  const editor = page.getByRole('textbox', { name: 'Document' });
  await editor.click();
  const status = page.locator('.status');
  await expect(status).not.toHaveClass(/over/);
  // Random-ish text compresses poorly; this comfortably exceeds 2 KB.
  let junk = '';
  let seed = 12345;
  for (let i = 0; i < 2600; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    junk += String.fromCharCode(33 + (seed % 90));
  }
  await page.evaluate((t) => {
    const ed = document.querySelector('to-app')!.shadowRoot!.querySelector('to-write .page') as HTMLElement;
    ed.textContent = t;
    ed.dispatchEvent(new Event('input', { bubbles: true }));
  }, junk);
  await expect(status).toHaveClass(/over/);
  expect(page.url().length).toBeGreaterThan(2048);
});

test('back and forward move between documents', async ({ page }) => {
  await page.goto('/#/sheet');
  await page.getByRole('textbox', { name: 'A1', exact: true }).fill('hello');
  await page.getByRole('link', { name: 'Write' }).click();
  await expect(page.getByRole('textbox', { name: 'Document' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('textbox', { name: 'A1', exact: true })).toHaveValue('hello');
});
