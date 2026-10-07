import { test, expect } from '@playwright/test';
import { shot, reopen, navTo, pickOption } from './helpers';

test('launcher lists every app', async ({ page }) => {
  await page.goto('/');
  const launcher = page.locator('.to-launcher a');
  await expect(launcher).toHaveCount(48);
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
  expect(page.url()).toMatch(/#\/v2\/sheet\/[WYZR][A-Za-z0-9_-]+$/);

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
  await expect(page.getByRole('menuitem')).toHaveCount(32);
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

  // Arrow keys point at cells the same way: up from D3 is D2, then the pointer keeps moving.
  await cell('D3').click();
  await page.keyboard.type('=A1+');
  await page.keyboard.press('ArrowUp');
  await expect(cell('D3')).toBeFocused();
  await expect(cell('D3')).toHaveValue('=A1+D2');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(cell('D3')).toHaveValue('=A1+B2');
  await page.keyboard.type('*2');
  // With the formula complete, the arrows move between cells again.
  await page.keyboard.press('ArrowDown');
  await expect(cell('D4')).toBeFocused();
  await expect(cell('D3')).toHaveValue('650');

  // Enough for a small model: conditions and the time value of money.
  await cell('E1').fill('=IF(B1>40, NPV(0.1, A1:A2), 0)');
  await cell('E2').fill('=ROUND(PMT(0.05/12, 60, 20000), 2)');
  await cell('F1').click();
  await expect(cell('E1')).toHaveValue('35.53719008');
  await expect(cell('E2')).toHaveValue('-377.42');
});

test('sheet: blocks of cells are selected, copied, cut, cleared and filled', async ({ page, isMobile }) => {
  await page.goto('/#/sheet');
  const cell = (ref: string) => page.getByRole('textbox', { name: ref, exact: true });
  const ref = page.getByLabel('Selected cells');
  for (const [at, v] of [['A1', '1'], ['A2', '2'], ['B1', '10'], ['B2', '20'], ['C1', '=A1+B1']]) await cell(at).fill(v);

  // Shift+arrows stretch a block from the cell you are in.
  await cell('C1').focus();
  await page.keyboard.press('Shift+ArrowDown');
  await expect(ref).toHaveText('C1:C2');
  await expect(page.locator('table.sheet td.in')).toHaveCount(2);
  await page.keyboard.press('Escape');
  await expect(ref).toHaveText('C1');

  // Copy a cell, select a block, paste: every copy points at its own neighbours.
  // (Focus rather than a tap: a tap can land the caret inside the formula, where the next tap would add to it.)
  await cell('C1').focus();
  await page.keyboard.press('Control+c');
  await cell('C2').focus();
  await page.keyboard.press('Shift+ArrowDown');
  await page.keyboard.press('Control+v');
  await cell('F1').click();
  await expect(cell('C2')).toHaveValue('22');
  await cell('C3').click();
  await expect(cell('C3')).toHaveValue('=A3+B3');

  // Cut a block and paste it elsewhere: it moves, and the old cells are empty.
  await cell('A1').click();
  await page.keyboard.press('Shift+ArrowDown');
  await page.keyboard.press('Shift+ArrowRight');
  await expect(ref).toHaveText('A1:B2');
  await page.keyboard.press('Control+x');
  await expect(cell('B2')).toHaveValue('');
  await cell('D5').click();
  await page.keyboard.press('Control+v');
  await expect(ref).toHaveText('D5:E6');
  await cell('F1').click();
  await expect(cell('E6')).toHaveValue('20');
  await expect(cell('D5')).toHaveValue('1');

  // Rows copied from another program arrive as cells.
  await page.evaluate(() => navigator.clipboard.writeText('North\t100\nSouth\t250\n'));
  await cell('A10').click();
  await page.keyboard.press('Control+v');
  await cell('F1').click();
  await expect(cell('A11')).toHaveValue('South');
  await expect(cell('B11')).toHaveValue('250');

  // Delete clears a whole block.
  await cell('A10').click();
  await page.keyboard.press('Shift+ArrowDown');
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('Delete');
  await expect(cell('B11')).toHaveValue('');
  await expect(cell('A10')).toHaveValue('');

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

test('sheet: charts suggest themselves and travel with the sheet', async ({ page }) => {
  await page.goto('/#/sheet');
  const cell = (ref: string) => page.getByRole('textbox', { name: ref, exact: true });
  for (const [ref, v] of [['A1', 'Item'], ['B1', 'Cost'], ['A2', 'Rent'], ['B2', '1200'], ['A3', 'Food'], ['B3', '600'], ['A4', 'Fun'], ['B4', '200']]) await cell(ref).fill(v);
  await cell('C1').click();
  await expect(page.locator('.sheet-chart')).toHaveCount(0);
  const pick = page.locator('sl-select.sheet-chart-pick');
  await pick.click();
  // Three parts of a whole: a pie is suggested.
  await expect(pick.locator('sl-option[value="pie"]')).toContainText('suggested');
  await pick.locator('sl-option[value="pie"]').click();
  const chart = page.locator('.sheet-chart svg');
  // Three slices (each with a white edge); the second and third also wear a pattern, for eyes that do not see the colours.
  await expect(chart.locator('svg > path[stroke="#fff"], path[stroke-width="2"]')).toHaveCount(3);
  await expect(chart.locator('path[fill^="url(#p"]')).toHaveCount(2);
  await expect(chart).toContainText('Rent');
  await expect(chart).toContainText('60%');
  await reopen(page);
  // Three slices (each with a white edge); the second and third also wear a pattern, for eyes that do not see the colours.
  await expect(chart.locator('svg > path[stroke="#fff"], path[stroke-width="2"]')).toHaveCount(3);
  await expect(chart.locator('path[fill^="url(#p"]')).toHaveCount(2);
  await pickOption(page, 'sl-select.sheet-chart-pick', 'bar');
  await expect(chart.locator('rect[rx="2"]')).toHaveCount(3);
  await shot(page, 'chart');
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
  expect(page.url()).toMatch(/#\/v2\/write\/[WYZR]/);

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
  const headline = page.getByRole('textbox', { name: 'Headline' });
  const bullets = page.getByRole('textbox', { name: 'Bullets' });
  const show = page.getByRole('dialog', { name: 'Presentation' });
  const slide = show.locator('.frame > svg');
  // A new deck opens on a title slide: big centred title, subtitle, no bullets.
  await expect(page.locator('.deck-slide.lay-t')).toBeVisible();
  await headline.fill('Spring launch');
  await bullets.fill('What we are shipping');
  // The toolbar's Icon button opens the same picker as the box on the slide.
  await page.getByRole('button', { name: 'Icon', exact: true }).click();
  await expect(page.locator('#icon-picker')).toHaveAttribute('open');
  const library = page.getByRole('group', { name: 'Icon library' });
  await library.getByRole('button', { name: 'star', exact: true }).click();
  await expect(page.locator('.deck-slide .pick svg')).toBeVisible();
  await shot(page, 'deck-title');

  // A second slide with bullets; the slide's own words recommend icons.
  await page.getByRole('button', { name: 'Slide', exact: true }).click();
  await expect(page.locator('.deck-slide.lay-b')).toBeVisible();
  await headline.fill('Launch plan');
  await bullets.fill('Build it\nShip it\nTell people');
  await expect(page.getByRole('button', { name: 'Use rocket icon' })).toBeVisible();
  await page.getByRole('button', { name: 'Slide icon' }).click();
  await expect(page.getByRole('group', { name: 'Suggested', exact: true }).getByRole('button', { name: 'rocket', exact: true })).toBeVisible();
  const search = page.locator('#icon-picker sl-input input');
  await search.fill('zzz');
  await expect(page.locator('.deck-picker-none')).toBeVisible();
  await search.fill('rock');
  await library.getByRole('button', { name: 'rocket', exact: true }).click();
  await expect(page.locator('#icon-picker')).not.toHaveAttribute('open');
  await expect(page.locator('.deck-suggest')).toHaveCount(0);
  await expect(page.locator('.to-toolbar .to-hint').last()).toHaveText('2 slides');

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

  await reopen(page);
  const thumbs = page.locator('.deck-rail .deck-thumb');
  await expect(thumbs).toHaveCount(2);
  await expect(thumbs.nth(1)).toContainText('Launch plan');
  await thumbs.nth(1).click();
  await expect(bullets.locator('p')).toHaveText(['Build it', 'Ship it', 'Tell people']);
  await shot(page, 'deck');

  // Presenting: the title slide appears whole; the next builds a bullet per step.
  await thumbs.nth(0).click();
  await page.getByRole('button', { name: 'Present' }).click();
  await expect(slide).toContainText('Spring launch');
  await expect(slide).toContainText('What we are shipping');
  await page.keyboard.press('ArrowRight');
  await expect(slide).toContainText('Launch plan');
  await expect(slide).not.toContainText('Build it');
  await page.keyboard.press('ArrowRight');
  await expect(slide).toContainText('Build it');
  await expect(slide).not.toContainText('Ship it');
  await page.keyboard.press('ArrowLeft');
  await expect(slide).not.toContainText('Build it');
  // A fast double click shows the whole slide at once.
  await show.dblclick({ position: { x: 300, y: 300 } });
  await expect(slide).toContainText('Tell people');
  await shot(page, 'deck-show');
  // Once everything is out, the next step is the closing QR code of the deck; the one after leaves the show.
  await page.keyboard.press('ArrowRight');
  await expect(slide.locator('path[shape-rendering="crispEdges"]')).toHaveCount(1);
  await page.keyboard.press('ArrowRight');
  await expect(show).toHaveCount(0);

  // No cap on slides: the link's length is the only limit.
  const before = await thumbs.count();
  for (let i = 0; i < 12; i++) await page.getByRole('button', { name: 'Slide', exact: true }).click();
  await expect(thumbs).toHaveCount(before + 12);
  await expect(page.getByRole('button', { name: 'Slide', exact: true })).toBeEnabled();
});

test('deck: layouts, a transition, and other documents on a slide', async ({ page }) => {
  const { encodeEnvelope } = await import('../src/lib/envelope.ts');
  const draw = 'draw/' + encodeEnvelope({ created: null, body: 'r,2,1,12,6,1,One\ne,20,10,10,8,0,Two\na,14,4,8,8,0' });
  const sheet = 'sheet/' + encodeEnvelope({ created: null, body: 'Item\tCost\nRent\t1200\nFood\t600' });
  const body = ['!fade', '::2\nTwo columns\nleft\n|\nright', ':star:i\nBig icon\nwhy', `Drawing\nfirst\n@@${draw}`, `Table\n@@${sheet}`].join('\n\n');
  await page.goto('/#/v2/deck/' + encodeEnvelope({ created: null, body }));
  const thumbs = page.locator('.deck-rail .deck-thumb');
  await expect(thumbs).toHaveCount(4);
  await expect(page.locator('sl-select.deck-transition')).toHaveJSProperty('value', 'fade');

  // Two columns: each is its own list.
  await expect(page.locator('.deck-slide.lay-2')).toBeVisible();
  await page.getByRole('textbox', { name: 'Right column' }).fill('right\nand more');
  // Big icon: bullets on the left, the icon large on the right.
  await thumbs.nth(1).click();
  await expect(page.locator('.deck-slide.lay-i .big svg')).toBeVisible();
  // Layout is a choice per slide.
  // Slide type says what this slide is, and adds a slide of whatever is chosen: the slide you are on is left alone.
  const kind = page.locator('.deck-kind');
  await expect(kind).toContainText('Big icon');
  // A combobox: type a few letters of a layout or a document, and a slide of it is added.
  const add = page.getByRole('combobox', { name: 'Add a slide' });
  // A tap drops the whole list down, in the menu's groups, to scroll; typing narrows it.
  await add.click();
  const list = page.locator('.deck-add [role="listbox"]');
  await expect(list).toBeVisible();
  const options = await list.getByRole('option').allTextContents();
  for (const name of ['Bullets slide', 'Title slide', 'Two columns slide', 'Big icon slide', 'Motion', 'Drawing', 'Table', 'Chart', 'Map', 'Org chart', 'Poll']) expect(options).toContain(name);
  await expect(list.locator('li.group').first()).toHaveText('Layouts');
  await add.fill('two col');
  await expect(list.getByRole('option')).toHaveCount(1);
  await add.press('Enter');
  await expect(thumbs).toHaveCount(5);
  await expect(page.locator('.deck-slide.lay-2')).toBeVisible();
  await expect(kind).toContainText('Two columns');
  await expect(page.getByRole('textbox', { name: 'Headline' })).toBeFocused();
  // Return in the headline goes on to the bullets.
  await page.keyboard.type('Added');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('textbox', { name: 'Bullets' })).toBeFocused();
  await thumbs.nth(1).click();
  await expect(page.locator('.deck-slide.lay-i .big svg')).toBeVisible();

  // A slide can show another document; choosing one adds a slide for it and opens it for editing.
  const drawing = page.locator('.deck-rail .deck-thumb', { hasText: 'One' });
  await drawing.click();
  await expect(page.locator('.deck-slide to-embed')).toHaveCount(1);
  await expect(kind).toContainText('Drawing');
  await add.fill('Chart');
  await add.press('Enter');
  const sub = page.locator('sl-dialog.to-sub');
  await expect(sub).toHaveAttribute('open');
  await sub.getByRole('textbox', { name: 'A1', exact: true }).fill('Q1');
  await sub.getByRole('textbox', { name: 'B1', exact: true }).fill('10');
  await sub.getByRole('textbox', { name: 'A2', exact: true }).fill('Q2');
  await sub.getByRole('textbox', { name: 'B2', exact: true }).fill('30');
  await sub.getByRole('button', { name: 'Done' }).click();
  await expect(sub).toHaveCount(0);
  await expect(thumbs).toHaveCount(6);
  await expect(page.locator('.deck-slide to-embed svg[role="img"] rect[rx="2"]')).toHaveCount(2);
  await expect(kind).toContainText('Table');
  // The drawing's slide is as it was.
  await expect(drawing).toHaveCount(1);
  await reopen(page);
  await expect(thumbs).toHaveCount(6);
  await shot(page, 'deck-sub');
  await drawing.click();

  // What is inserted has the slide to itself: no headline, no bullets beside it.
  await expect(page.locator('.deck-slide.has-sub input.title')).toHaveCount(0);
  const full = await page.locator('.deck-slide to-embed').evaluate((el) => el.getBoundingClientRect().width / el.parentElement!.getBoundingClientRect().width);
  expect(full).toBeGreaterThan(0.9);

  // Presenting it: the whole slide is the document, and it appears a piece per click.
  await page.goto('about:blank');
  await page.goto('/#/v2/deck/' + encodeEnvelope({ created: null, body }));
  await thumbs.nth(2).click();
  await page.getByRole('button', { name: 'Present' }).click();
  const slide = page.locator('.deck-show .frame > svg');
  await expect(page.locator('.deck-show .frame')).toHaveClass(/tr-fade/);
  await expect(slide.locator('rect, ellipse, line')).toHaveCount(0);
  await expect(slide).not.toContainText('Drawing');
  await expect(slide).not.toContainText('first');
  await page.keyboard.press('ArrowRight');
  await expect(slide).toContainText('One');
  await expect(slide).not.toContainText('Two');
  // It fills the slide.
  const share = await slide.locator('svg').first().evaluate((el) => Number(el.getAttribute('height')) / 600);
  expect(share).toBeGreaterThan(0.85);
  await page.keyboard.press('ArrowRight');
  await expect(slide).toContainText('Two');
  await expect(slide.locator('line')).toHaveCount(0);
  await page.keyboard.press('End');
  await expect(slide.locator('line')).toHaveCount(1);
  await shot(page, 'deck-takeover');
  // A table fills in a cell per click, across each row and down.
  await page.keyboard.press('ArrowRight');
  await expect(slide.locator('rect')).toHaveCount(6);
  await expect(slide).not.toContainText('Item');
  for (const [now, next] of [['Item', 'Cost'], ['Cost', 'Rent'], ['Rent', '1200'], ['1200', 'Food'], ['Food', '600']]) {
    await page.keyboard.press('ArrowRight');
    await expect(slide).toContainText(now);
    await expect(slide).not.toContainText(next);
  }
  await page.keyboard.press('ArrowRight');
  await expect(slide).toContainText('600');
  await page.keyboard.press('Escape');
});

test('deck: a motion slide is made and changed from the slide itself', async ({ page }) => {
  await page.goto('/#/deck');
  await page.getByRole('combobox', { name: 'Add a slide' }).fill('motion');
  await page.getByRole('combobox', { name: 'Add a slide' }).press('Enter');
  const sub = page.locator('sl-dialog.to-sub');
  await expect(sub).toHaveAttribute('open');
  await sub.getByRole('button', { name: 'Text', exact: true }).click();
  await sub.getByRole('textbox', { name: 'Text' }).fill('Lift off');
  await sub.getByRole('button', { name: 'Done' }).click();
  const embed = page.locator('.deck-slide to-embed');
  await expect(embed.locator('svg[role="img"]')).toContainText('Lift off');
  // Tapping the picture opens it again; so does Edit. Its bar sits inside the slide.
  await expect(embed).toContainText('Tap to edit');
  const inside = await embed.evaluate((el) => el.getBoundingClientRect().bottom <= el.closest('.deck-slide')!.getBoundingClientRect().bottom + 1);
  expect(inside).toBe(true);
  await embed.locator('svg[role="img"]').click();
  await expect(sub.locator('g.item')).toHaveCount(1);
  await sub.getByRole('button', { name: 'Icon', exact: true }).click();
  await page.locator('#anim-icons').getByRole('button', { name: 'rocket', exact: true }).click();
  await expect(sub.locator('g.item')).toHaveCount(2);
  await expect(page.locator('#anim-icons')).toBeHidden();
  // Give the rocket somewhere to go, so it moves when the deck is shown.
  await sub.getByRole('slider', { name: 'Time' }).fill('15');
  const stage = sub.getByRole('application', { name: 'Stage' });
  const box = (await stage.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.2, { steps: 4 });
  await page.mouse.up();
  await sub.getByRole('button', { name: 'Done' }).click();
  await expect(sub).toHaveCount(0);
  await expect(embed.locator('svg[role="img"] animateTransform').first()).toBeAttached();
  await reopen(page);
  // (It was added as a slide of its own, after the first.)
  await page.locator('.deck-rail .deck-thumb').nth(1).click();
  await embed.getByRole('button', { name: 'Edit' }).click();
  await expect(sub.locator('g.item')).toHaveCount(2);
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
  await expect(canvas.locator('rect[stroke="#0072b2"]')).toHaveCount(1);
  await reopen(page);
  await expect(canvas.locator('rect[stroke="#0072b2"]')).toHaveCount(1);
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

test('sheet: columns have types, and dates do arithmetic', async ({ page }) => {
  await page.goto('/#/sheet');
  const cell = (ref: string) => page.getByRole('textbox', { name: ref, exact: true });
  const setType = async (col: string, type: string) => {
    await page.getByRole('button', { name: new RegExp(`^Column ${col}:`) }).click();
    await page.getByRole('menuitemcheckbox', { name: new RegExp(`^${type}`) }).click();
    await expect(page.getByRole('menuitemcheckbox', { name: new RegExp(`^${type}`) })).toBeHidden();
  };
  await setType('A', 'Date');
  await setType('B', 'Date');
  await setType('D', 'Money');
  await setType('E', 'Link');
  await setType('F', 'Checkbox');
  await expect(page.getByRole('button', { name: /^Column A: Date/ })).toContainText('Date');

  await cell('A1').fill('2027-01-31');
  await cell('B1').fill('3/1/2027');
  await cell('C1').fill('=B1-A1');
  await cell('A2').fill('=A1+30');
  await cell('B2').fill('=EDATE(A1, 1)');
  await cell('D1').fill('1200.5');
  await cell('E1').fill('https://example.com/report');
  await cell('F1').click();
  await page.keyboard.press('Space');
  await cell('C3').click();
  // A date less a date is days; a date plus days is a date.
  await expect(cell('C1')).toHaveValue('29');
  await expect(cell('B1')).toHaveValue('2027-03-01');
  await expect(cell('A2')).toHaveValue('2027-03-02');
  await expect(cell('B2')).toHaveValue('2027-02-28');
  await expect(cell('D1')).toHaveValue('$1,200.50');
  await expect(cell('F1')).toHaveValue('☑');
  // A link opens from its cell.
  await expect(page.getByRole('link', { name: 'Open https://example.com/report' })).toHaveAttribute('href', 'https://example.com/report');

  await reopen(page);
  await expect(cell('C1')).toHaveValue('29');
  await expect(cell('D1')).toHaveValue('$1,200.50');
  await expect(page.getByRole('button', { name: /^Column E: Link/ })).toBeVisible();
  await shot(page, 'sheet-types');
  // Rich text shows its emphasis when you are not typing in it.
  await setType('C', 'Rich text');
  await cell('C2').fill('Very *important* thing');
  await cell('C3').click();
  await expect(page.locator('table.sheet td .rich .b')).toHaveText('important');
});

test('sheet: on a touch screen the corner handle stretches the block any way, and buttons fill it', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'touch only');
  await page.goto('/#/sheet');
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
