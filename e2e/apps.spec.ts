import { test, expect, type Page } from '@playwright/test';
import { shot, reopen, navTo } from './helpers';

test('todo: add, tick, star, date, filter and clear', async ({ page }) => {
  await page.goto('/#/todo');
  const add = page.getByRole('textbox', { name: 'New task' });
  for (const t of ['Book flights', 'Renew passport', 'Pack']) {
    await add.fill(t);
    await page.keyboard.press('Enter');
  }
  const rows = page.locator('.todo-list li');
  await expect(rows).toHaveCount(3);
  await rows.nth(0).locator('sl-checkbox').click();
  await rows.nth(1).getByRole('button', { name: 'Star' }).click();
  await rows.nth(1).getByLabel('Due date').fill('2027-03-01');
  await rows.nth(2).getByRole('button', { name: 'Move up' }).click();
  await expect(page.locator('.to-toolbar .to-hint')).toHaveText('1 / 3');
  await expect.poll(() => page.url()).toMatch(/#\/v2\/todo\/[YZR]/);

  await reopen(page);
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toHaveClass(/done/);
  await expect(page.getByRole('textbox', { name: 'Task 2' })).toHaveValue('Pack');
  await expect(rows.nth(2).getByLabel('Due date')).toHaveValue('2027-03-01');
  await expect(rows.nth(2).getByRole('button', { name: 'Star' })).toHaveAttribute('aria-pressed', 'true');
  await shot(page, 'todo');

  await page.locator('sl-select[label="Show"]').click();
  await page.locator('sl-select[label="Show"] sl-option[value="done"]').click();
  await expect(rows).toHaveCount(1);
  await page.getByRole('button', { name: 'Clear done' }).click();
  await expect(rows).toHaveCount(0);
  await expect(page.locator('.to-toolbar .to-hint')).toHaveText('0 / 2');
});

test('board: stages, cards, limits and moving work along', async ({ page, isMobile }) => {
  await page.goto('/#/board');
  const cols = page.locator('.board-col');
  await expect(cols).toHaveCount(3);
  const addTo = (name: string) => page.getByRole('textbox', { name: `Add a card to ${name}` });
  await addTo('To do').fill('Write the brief');
  await page.keyboard.press('Enter');
  await addTo('To do').fill('Design the page');
  await page.keyboard.press('Enter');
  await expect(cols.nth(0).locator('.board-card')).toHaveCount(2);

  // The arrows move a card to the next stage.
  await cols.nth(0).locator('.board-card').nth(0).getByRole('button', { name: 'Move to next stage' }).click();
  await expect(cols.nth(1).locator('.board-card textarea')).toHaveValue('Write the brief');

  // Stages can be renamed, added and given a limit.
  await cols.nth(1).getByRole('textbox', { name: 'Stage name' }).fill('In progress');
  await page.getByRole('button', { name: 'Stage', exact: true }).click();
  await expect(cols).toHaveCount(4);
  await page.keyboard.type('Review');
  await page.getByRole('button', { name: 'Stage options: To do' }).click();
  await page.getByRole('menuitemcheckbox', { name: '1', exact: true }).click();
  await addTo('To do').fill('One too many');
  await page.keyboard.press('Enter');
  await expect(cols.nth(0)).toHaveClass(/full/);
  await expect(cols.nth(0).locator('.count')).toHaveText('2 / 1');

  await reopen(page);
  await expect(cols).toHaveCount(4);
  await expect(cols.nth(1).getByRole('textbox', { name: 'Stage name' })).toHaveValue('In progress');
  await expect(cols.nth(3).getByRole('textbox', { name: 'Stage name' })).toHaveValue('Review');
  await expect(cols.nth(1).locator('.board-card')).toHaveCount(1);
  await expect(cols.nth(0)).toHaveClass(/full/);
  await shot(page, 'board');

  // Drag and drop between stages (a mouse thing; on touch screens the arrows do it).
  if (isMobile) return;
  await cols.nth(0).locator('.board-card').nth(0).dragTo(cols.nth(2));
  await expect(cols.nth(2).locator('.board-card textarea')).toHaveValue('Design the page');
  await expect(cols.nth(0)).not.toHaveClass(/full/);
});

test('gantt: tasks, dates and dragging bars', async ({ page }) => {
  await page.goto('/#/gantt');
  await page.getByRole('button', { name: 'Task', exact: true }).click();
  await page.keyboard.type('Design');
  await page.getByLabel('Start of task 1').fill('2027-03-01');
  await page.getByLabel('Days for task 1').fill('5');
  await page.getByLabel('Days for task 1').press('Tab');
  await page.getByRole('button', { name: 'Task', exact: true }).click();
  await page.keyboard.type('Build');
  // A new task starts where the last one ends.
  await expect(page.getByLabel('Start of task 2')).toHaveValue('2027-03-06');
  await page.getByLabel('Percent done for task 1').fill('50');
  await page.getByLabel('Percent done for task 1').press('Tab');
  const bars = page.locator('.gantt-chart .bar');
  await expect(bars).toHaveCount(2);
  await expect(page.locator('.gantt-chart .done')).toHaveCount(1);

  await reopen(page);
  await expect(bars).toHaveCount(2);
  await expect(page.getByRole('textbox', { name: 'Task 1', exact: true })).toHaveValue('Design');
  await expect(page.getByLabel('Days for task 1')).toHaveValue('5');

  // Drag the second bar two days later, then make it two days longer.
  const track = bars.nth(1).locator('.track');
  await track.scrollIntoViewIfNeeded();
  let box = (await track.boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 20 + 48, box.y + box.height / 2, { steps: 4 });
  await page.mouse.up();
  await expect(page.getByLabel('Start of task 2')).toHaveValue('2027-03-08');
  box = (await bars.nth(1).locator('.grip').boundingBox())!;
  await page.mouse.move(box.x + 6, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 6 + 48, box.y + box.height / 2, { steps: 4 });
  await page.mouse.up();
  await expect(page.getByLabel('Days for task 2')).toHaveValue('5');
  await shot(page, 'gantt');
});

/** Keep the map test off the network: blank tiles and a canned place search. */
async function offlineMap(page: Page) {
  const tile = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  await page.route('https://tile.openstreetmap.org/**', (route) => route.fulfill({ contentType: 'image/png', body: tile }));
  await page.route('https://nominatim.openstreetmap.org/**', (route) =>
    route.fulfill({ json: [{ name: 'Lisbon', display_name: 'Lisbon, Portugal', lat: '38.7077507', lon: '-9.1365919' }] }),
  );
}

test('trip: a route on the map with notes', async ({ page }) => {
  await offlineMap(page);
  await page.goto('/#/trip');
  const map = page.getByRole('application', { name: 'Map' });
  await expect(map.locator('.leaflet-tile-pane')).toBeAttached();
  const stops = page.locator('.trip-stops li:not(.to-empty)');

  // Search adds a named stop.
  await page.getByRole('searchbox', { name: 'Find a place' }).fill('Lisbon');
  await page.keyboard.press('Enter');
  await page.getByRole('list', { name: 'Places found' }).getByRole('button', { name: /Lisbon/ }).click();
  await expect(stops).toHaveCount(1);
  await expect(page.getByLabel('Name of stop 1')).toHaveValue('Lisbon');
  await page.getByLabel('Note for stop 1').fill('Pastel de nata first');

  // Tapping the map adds the next ones.
  const box = (await map.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.3);
  await expect(stops).toHaveCount(2);
  await page.keyboard.type('Second stop');
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.7);
  await expect(stops).toHaveCount(3);
  await expect(map.locator('.trip-pin')).toHaveCount(3);
  await expect(page.locator('.to-toolbar .to-hint')).toContainText(/3 stops · [\d.,]+ k?m/);
  await expect(stops.nth(1).locator('.leg')).toHaveText(/[\d.,]+ k?m/);

  await reopen(page);
  await expect(stops).toHaveCount(3);
  await expect(page.getByLabel('Name of stop 2')).toHaveValue('Second stop');
  await expect(page.getByLabel('Note for stop 1')).toHaveValue('Pastel de nata first');
  await expect(map.locator('.trip-pin')).toHaveCount(3);
  await expect(page).toHaveTitle('Lisbon to Second stop · TinyOffice');
  await shot(page, 'trip');

  await page.getByRole('button', { name: 'Move stop 3 earlier' }).click();
  await expect(page.getByLabel('Name of stop 3')).toHaveValue('Second stop');
  await page.getByRole('button', { name: 'Delete stop 1' }).click();
  await expect(stops).toHaveCount(2);
});

test('tune: notes on the piano roll, tempo and playback', async ({ page }) => {
  await page.goto('/#/tune');
  const roll = page.getByRole('application', { name: 'Piano roll' });
  await roll.scrollIntoViewIfNeeded();
  const box = (await roll.boundingBox())!;
  // Cells are 24 by 16 after a 44px strip of note names; the top row is B4.
  const cell = (step: number, row: number) => ({ x: box.x + 44 + step * 24 + 12, y: box.y + row * 16 + 8 });
  const notes = roll.locator('.note');
  let p = cell(0, 11);
  await page.mouse.click(p.x, p.y);
  p = cell(2, 9);
  await page.mouse.click(p.x, p.y);
  // Drag to the right for a longer note.
  p = cell(4, 7);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(cell(7, 7).x, p.y, { steps: 4 });
  await page.mouse.up();
  await expect(notes).toHaveCount(3);
  await expect(roll.locator('.note[data-note="4,16,4"]')).toHaveCount(1);
  await expect(roll.locator('.note[data-note="0,12,1"]')).toHaveCount(1);

  await page.getByRole('spinbutton', { name: 'Tempo' }).fill('90');
  await page.getByRole('spinbutton', { name: 'Tempo' }).press('Tab');
  await reopen(page);
  await expect(notes).toHaveCount(3);
  await expect(page.getByRole('spinbutton', { name: 'Tempo' })).toHaveValue('90');
  await shot(page, 'tune');

  // Tapping a note removes it.
  p = cell(2, 9);
  await page.mouse.click(p.x, p.y);
  await expect(notes).toHaveCount(2);

  await page.getByRole('button', { name: 'Play' }).click();
  await expect(roll.locator('.head')).toBeVisible();
  await page.getByRole('button', { name: 'Stop' }).click();
  await expect(roll.locator('.head')).toHaveCount(0);
});

test('motion: things travel between the moments you set', async ({ page }) => {
  await page.goto('/#/anim');
  await page.getByRole('button', { name: 'Icon', exact: true }).click();
  await page.locator('#anim-icons sl-input input').fill('rock');
  await page.getByRole('listbox', { name: 'Icon library' }).getByRole('button', { name: 'rocket', exact: true }).click();
  await page.getByRole('button', { name: 'Text', exact: true }).click();
  await page.getByRole('textbox', { name: 'Text' }).fill('Lift off');
  const stage = page.getByRole('application', { name: 'Stage' });
  const items = stage.locator('g.item');
  await expect(items).toHaveCount(2);
  const pos = (i: number) => items.nth(i).evaluate((g) => g.getAttribute('transform')!);
  expect(await pos(0)).toBe('translate(320 200) scale(1)');

  // At the last moment, drag the rocket up and to the right.
  const time = page.getByRole('slider', { name: 'Time' });
  await time.fill('15');
  const box = (await stage.boundingBox())!;
  const k = box.width / 640;
  // The text sits on top of the rocket, so move it out of the way first.
  await page.mouse.move(box.x + 320 * k, box.y + 200 * k);
  await page.mouse.down();
  await page.mouse.move(box.x + 320 * k, box.y + 320 * k, { steps: 4 });
  await page.mouse.up();
  await page.mouse.move(box.x + 320 * k, box.y + 200 * k);
  await page.mouse.down();
  await page.mouse.move(box.x + 560 * k, box.y + 80 * k, { steps: 4 });
  await page.mouse.up();
  expect(await pos(0)).toBe('translate(560 80) scale(1)');
  expect(await pos(1)).toBe('translate(320 320) scale(1)');
  await expect(page.locator('.anim-rows li').nth(0).locator('.key')).toHaveCount(2);

  // Halfway through, it is halfway there.
  await time.fill('0');
  expect(await pos(0)).toBe('translate(320 200) scale(1)');
  await reopen(page);
  await expect(items).toHaveCount(2);
  await page.getByRole('slider', { name: 'Time' }).fill('15');
  expect(await pos(0)).toBe('translate(560 80) scale(1)');
  await shot(page, 'anim');

  await page.getByRole('button', { name: 'Play' }).click();
  await expect.poll(() => pos(0)).not.toBe('translate(560 80) scale(1)');
  await page.getByRole('button', { name: 'Stop' }).click();
});

test('shell: themes, page titles, share and room per service', async ({ page, isMobile }) => {
  await page.goto('/#/write');
  await page.getByRole('textbox', { name: 'Document' }).click();
  await page.keyboard.type('Quarterly memo');
  await expect(page).toHaveTitle('Quarterly memo · TinyOffice');

  // Theme: device, then light, then dark; the choice is remembered.
  const html = page.locator('html');
  const theme = page.locator('#nav-drawer .to-theme');
  await page.locator('.to-burger').click();
  await theme.click();
  await expect(theme).toContainText('Light');
  await expect(html).not.toHaveClass(/sl-theme-dark/);
  await theme.click();
  await expect(theme).toContainText('Dark');
  await expect(html).toHaveClass(/sl-theme-dark/);
  await reopen(page);
  await expect(html).toHaveClass(/sl-theme-dark/);
  await shot(page, 'dark');
  await page.locator('.to-burger').click();
  await theme.click();
  await expect(theme).toContainText('Match the device');
  await page.keyboard.press('Escape');
  await expect(page.locator('#nav-drawer')).not.toHaveAttribute('open');

  // Room for the link, service by service: on hover, and in the document dialog.
  if (!isMobile) {
    await page.locator('.to-meter sl-progress-ring').hover();
    await expect(page.locator('.to-meter-rooms')).toContainText('Bluesky');
  }
  await page.locator('.to-meter sl-progress-ring').click();
  const rooms = page.locator('.to-rooms tr');
  await expect(rooms).toHaveCount(8);
  await expect(rooms.filter({ hasText: 'Bluesky' })).toContainText(/\d+ left/);
  await expect(rooms.filter({ hasText: 'Mastodon' })).toContainText('477 left');
  await expect(rooms.filter({ hasText: 'Text message' })).toContainText(/\d+ (left|over)/);
  await page.getByRole('button', { name: 'Done' }).click();

  // Share: compose boxes open with the link in them; the picture is a download.
  await page.getByRole('button', { name: 'Share' }).click();
  const [popup] = await Promise.all([page.waitForEvent('popup'), page.getByRole('menuitem', { name: 'Bluesky' }).click()]);
  expect(decodeURIComponent(popup.url())).toContain('Quarterly memo ' + page.url());
  await popup.close();
  await page.getByRole('button', { name: 'Share' }).click();
  const [png] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: 'Save a picture' }).click()]);
  expect(png.suggestedFilename()).toBe('quarterly-memo.png');
});

test('every app is reachable and none overflows the page', async ({ page }) => {
  await offlineMap(page);
  await page.goto('/');
  for (const name of ['Todo', 'Board', 'Gantt', 'Trip', 'Tune', 'Motion']) {
    await navTo(page, name);
    await expect(page.locator('.to-panel-head h1')).toHaveText(new RegExp(name));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, name).toBeLessThanOrEqual(0);
  }
});

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

test('write: a pasted TinyOffice link becomes a preview that exports', async ({ page }) => {
  const { encodeEnvelope } = await import('../src/lib/envelope.ts');
  const deck = `http://localhost:4173/#/v2/deck/${encodeEnvelope({ created: null, body: '::t\nSpring launch\nWhat ships\n\nAgenda\none' })}`;
  const drawing = `http://localhost:4173/#/v2/draw/${encodeEnvelope({ created: null, body: 'r,2,1,12,6,1,Box' })}`;
  await page.goto('/#/write');
  const editor = page.getByRole('textbox', { name: 'Document' });
  const paste = (text: string) =>
    editor.evaluate((el, t) => {
      const data = new DataTransfer();
      data.setData('text/plain', t);
      el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
    }, text);
  await editor.click();
  await page.keyboard.type('See the deck:');
  await page.keyboard.press('Enter');
  await paste(deck);
  await paste(drawing);
  // Ordinary text and other links still paste as text.
  await paste('https://example.com/ is not ours');

  const cards = editor.locator('figure.write-embed');
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toContainText('Spring launch');
  await expect(cards.nth(0)).toContainText('Deck');
  await expect(cards.nth(0)).toContainText('Agenda');
  await expect(cards.nth(1).locator('img')).toBeVisible();
  await expect(editor).toContainText('https://example.com/ is not ours');

  await reopen(page);
  await expect(cards).toHaveCount(2);
  await expect(editor).toContainText('See the deck:');
  await shot(page, 'embed');

  // The web page and rich text downloads carry the link and the preview.
  const fs = await import('node:fs');
  await page.getByRole('button', { name: 'Download' }).click();
  const [htmlFile] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: /Web page/ }).click()]);
  const html = fs.readFileSync(await htmlFile.path(), 'utf8');
  expect(html).toContain(`<a href="${deck}">Spring launch</a>`);
  expect(html).toContain('<img src="data:image/svg+xml');
  await expect(page.getByRole('menuitem', { name: /Web page/ })).toBeHidden();
  await page.getByRole('button', { name: 'Download' }).click();
  const [rtfFile] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: /Rich Text/ }).click()]);
  expect(fs.readFileSync(await rtfFile.path(), 'utf8')).toContain(`HYPERLINK "${deck}"`);

  // Clicking the preview opens the document it points at.
  await cards.nth(0).click();
  await expect(page.locator('.to-panel-head h1')).toHaveText(/Deck/);
  await expect(page.getByRole('textbox', { name: 'Headline' })).toHaveValue('Spring launch');
});
