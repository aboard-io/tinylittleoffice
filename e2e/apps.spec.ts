import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { shot, reopen, navTo, pickOption } from './helpers';

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
  await expect.poll(() => page.url()).toMatch(/#\/v2\/todo\/[WYZR]/);

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
  // Return adds the next task right below, ready to type; it starts where this one ends.
  await page.getByRole('textbox', { name: 'Task 1', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(bars).toHaveCount(3);
  await expect(page.getByRole('textbox', { name: 'Task 2', exact: true })).toBeFocused();
  await expect(page.getByLabel('Start of task 2')).toHaveValue('2027-03-06');
  await expect(page.getByRole('textbox', { name: 'Task 3', exact: true })).toHaveValue('Build');
  await page.getByRole('button', { name: 'Delete task' }).click();
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

  // A task can be part of the one above: Tab indents it, and the one above becomes a bracket around its parts.
  await page.getByRole('textbox', { name: 'Task 2', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('.gantt-rows tbody tr').nth(0)).toHaveClass(/parent/);
  await expect(page.locator('.gantt-chart .bar.parent')).toHaveCount(1);
  await reopen(page);
  await expect(page.locator('.gantt-chart .bar.parent')).toHaveCount(1);
  await page.getByRole('textbox', { name: 'Task 2', exact: true }).focus();
  await page.getByRole('button', { name: 'Bring out' }).click();
  await expect(page.locator('.gantt-chart .bar.parent')).toHaveCount(0);
  await page.getByRole('button', { name: 'Indent under the task above' }).click();
  await expect(page.locator('.gantt-chart .bar.parent')).toHaveCount(1);
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
  // Hours by default (a driving estimate); miles or kilometres on request, remembered in the link.
  await expect(page.locator('.to-toolbar .to-hint')).toContainText(/3 stops · \d+ (h|min)/);
  await expect(stops.nth(1).locator('.leg')).toHaveText(/≈ \d+ (h|min).* drive/);
  await pickOption(page, 'sl-select.trip-units', 'm');
  await expect(stops.nth(1).locator('.leg')).toHaveText(/^[\d.,]+ (mi|ft)$/);
  await pickOption(page, 'sl-select.trip-units', 'k');
  await expect(page.locator('.to-toolbar .to-hint')).toContainText(/3 stops · [\d.,]+ k?m/);

  await reopen(page);
  await expect(stops).toHaveCount(3);
  await expect(page.getByLabel('Name of stop 2')).toHaveValue('Second stop');
  await expect(page.getByLabel('Note for stop 1')).toHaveValue('Pastel de nata first');
  await expect(map.locator('.trip-pin')).toHaveCount(3);
  await expect(page).toHaveTitle('Lisbon to Second stop · TinyLittleOffice');
  await shot(page, 'trip');

  await page.getByRole('button', { name: 'Move stop 3 earlier' }).click();
  await expect(page.getByLabel('Name of stop 3')).toHaveValue('Second stop');
  await page.getByRole('button', { name: 'Delete stop 1' }).click();
  await expect(stops).toHaveCount(2);
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
  await expect(page).toHaveTitle('Quarterly memo · TinyLittleOffice');

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
  const rooms = page.locator('#doc-dialog .to-rooms tbody tr');
  await expect(rooms).toHaveCount(10);
  await expect(page.locator('#doc-dialog .to-rooms thead th')).toHaveText(['Where', 'Limit', 'This link', 'Left', 'Note']);
  await expect(rooms.filter({ hasText: 'NTAG215' })).toContainText('504');
  await expect(rooms.filter({ hasText: 'Bluesky' })).toContainText('any length');
  await expect(rooms.filter({ hasText: 'Mastodon' })).toContainText('any length');
  await expect(rooms.filter({ hasText: 'Text message' })).toContainText(/\d/);
  await page.getByRole('button', { name: 'Done' }).click();

  // Share: compose boxes open with the link in them; the picture is a download.
  await page.getByRole('button', { name: 'Share' }).click();
  const [popup] = await Promise.all([page.waitForEvent('popup'), page.getByRole('menuitem', { name: 'Bluesky' }).click()]);
  expect(decodeURIComponent(popup.url())).toContain('Quarterly memo ' + page.url().replace('/#/', '/write/#/'));
  await popup.close();
  await page.getByRole('button', { name: 'Share' }).click();
  const [png] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: 'Save a picture' }).click()]);
  expect(png.suggestedFilename()).toBe('quarterly-memo.png');
});

test('every app is reachable and none overflows the page', async ({ page }) => {
  await offlineMap(page);
  await page.goto('/');
  for (const name of ['Todo', 'Board', 'Gantt', 'Trip', 'Motion']) {
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

test('write: other documents sit in the text as one thing each', async ({ page }) => {
  const { encodeEnvelope } = await import('../src/lib/envelope.ts');
  const deckDoc = encodeEnvelope({ created: null, body: '::t\nSpring launch\nWhat ships\n\nAgenda\none' });
  const deck = `http://localhost:4173/deck/#/v2/deck/${deckDoc}`;
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

  const embeds = editor.locator('to-embed');
  await expect(embeds).toHaveCount(2);
  await expect(embeds.nth(0)).toContainText('Spring launch');
  await expect(embeds.nth(0)).toContainText('Deck');
  // In the editor it is something to change, not a link that leaves the page.
  await expect(embeds.nth(0).locator('a')).toHaveCount(0);
  await expect(embeds.nth(1).locator('svg[role="img"]')).toContainText('Box');
  await expect(editor).toContainText('https://example.com/ is not ours');
  // They are not text: nothing can be typed into one, and the words around it are untouched.
  expect(await embeds.nth(0).evaluate((el: HTMLElement) => el.isContentEditable)).toBe(false);
  await expect(page.locator('.write-foot')).toContainText('7 words');

  await reopen(page);
  await expect(embeds).toHaveCount(2);
  await expect(editor).toContainText('See the deck:');
  await shot(page, 'embed');

  // The web page and rich text downloads carry the link and the picture.
  const fs = await import('node:fs');
  await page.getByRole('button', { name: 'Download' }).click();
  const [htmlFile] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: /Web page/ }).click()]);
  const html = fs.readFileSync(await htmlFile.path(), 'utf8');
  expect(html).toContain(`#/v2/deck/${deckDoc}">Spring launch</a>`);
  expect(html).toContain('>Box</text>');
  await expect(page.getByRole('menuitem', { name: /Web page/ })).toBeHidden();
  await page.getByRole('button', { name: 'Download' }).click();
  const [rtfFile] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: /Rich Text/ }).click()]);
  expect(fs.readFileSync(await rtfFile.path(), 'utf8')).toContain(`HYPERLINK "http://localhost:4173/#/v2/deck/${deckDoc}"`);

  // Getting rid of one: its own Remove button, or one key when it has the focus.
  await embeds.nth(1).getByRole('button', { name: /Remove/ }).click();
  await expect(embeds).toHaveCount(1);
  await embeds.nth(0).focus();
  await page.keyboard.press('Backspace');
  await expect(embeds).toHaveCount(0);
  await expect(editor).toContainText('See the deck:');
  await expect(editor).toContainText('https://example.com/ is not ours');

  // Insert makes a new one from a menu and opens it for editing.
  await editor.click();
  await page.getByRole('button', { name: 'Insert' }).click();
  await page.getByRole('menuitem', { name: 'Drawing' }).click();
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

test('write: a pasted web address is a link you can click', async ({ page }) => {
  await page.goto('/#/write');
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
  const link = editor.locator('a');
  await expect(link).toHaveText('https://example.com/report?year=2026');
  await expect(link).toHaveAttribute('href', 'https://example.com/report?year=2026');
  // It is highlighted, and a click opens it in a new tab.
  expect(await link.evaluate((el) => getComputedStyle(el).textDecorationLine)).toBe('underline');
  const [popup] = await Promise.all([page.waitForEvent('popup'), link.click()]);
  expect(popup.url()).toBe('https://example.com/report?year=2026');
  await popup.close();
  // It is still a link when the document is opened again, and in the web page download.
  await reopen(page);
  await expect(link).toHaveAttribute('href', 'https://example.com/report?year=2026');
  await expect(editor).toContainText('and say what you think.');
  await page.getByRole('button', { name: 'Download' }).click();
  const [file] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: /Web page/ }).click()]);
  expect((await import('node:fs')).readFileSync(await file.path(), 'utf8')).toContain('<a href="https://example.com/report?year=2026">');
  // An address typed by hand becomes a link once you leave the text.
  await editor.click();
  await page.keyboard.press('Control+End');
  await page.keyboard.type(' Also http://example.org/x ok');
  await page.getByRole('button', { name: 'Download' }).focus();
  await expect(link).toHaveCount(2);
});

test('write: list items nest with Tab', async ({ page }) => {
  await page.goto('/#/write');
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

test('trip on a slide: the map goes from stop to stop', async ({ page }) => {
  await offlineMap(page);
  const { encodeEnvelope } = await import('../src/lib/envelope.ts');
  const trip = 'trip/' + encodeEnvelope({ created: null, body: '3xa8g,-fuyo,Lisbon\tStart here\n40000,0,Second' });
  await page.goto('/#/v2/deck/' + encodeEnvelope({ created: null, body: `Where we are going\n@@${trip}` }));
  await page.getByRole('button', { name: 'Present' }).click();
  const map = page.locator('.deck-show to-trip[present]');
  await expect(map.locator('.trip-pin')).toHaveCount(2);
  await expect(map.locator('.leaflet-popup')).toHaveCount(0);
  await page.keyboard.press('ArrowRight');
  await expect(map.locator('.leaflet-popup', { hasText: '1. Lisbon' })).toContainText('Start here');
  await page.keyboard.press('ArrowRight');
  await expect(map.locator('.leaflet-popup', { hasText: '2. Second' })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.deck-show')).toHaveCount(0);
});

test('accessibility: no app has violations a machine can find', async ({ page }) => {
  test.slow();
  await offlineMap(page);
  const { encodeEnvelope } = await import('../src/lib/envelope.ts');
  const docs: Record<string, string> = {
    sheet: '!bar\nItem\tCost\nRent\t1200\nFood\t600',
    write: '# Memo\nSome *bold* text\n- one\n-- nested\n@@draw/',
    deck: ':rocket:t\nSpring launch\nWhat ships\n\n::2\nAgenda\none\n|\ntwo',
    draw: 'r,2,1,12,6,1b3,Box\na,14,4,8,0,0',
    cal: 'd2,2,Offsite',
    todo: '- one\nx!@1jk two',
    board: '#To do\nx\ny\n#Done|1',
    gantt: '1jk,5,1e,Design\n>1jk,2,2s,Sketch',
    trip: '3xa8g,-fuyo,Lisbon\tnote\n40000,0,B',
    anim: '9\nirocket\t0,a,14,a;8,1y,a,p\ntLift off\t4,14,p,a',
    org: 'Ada | CEO\n  Ben | Engineering\n  Eve | Design',
    mind: 'Launch\n  Product\n    Pricing\n  Marketing',
    lanes: 'Customer: Orders\nSales: In stock?\nWarehouse: Packs',
    venn: 'Fast: a\nCheap: b\nFast & Cheap: c',
    net: 'Web > API: calls\nAPI - Cache',
    db: 'teams: id, name\n1, Platform\n\npeople: id, name, team_id > teams\n1, Ann, 1\n\n? select name from people',
    sticky: 'Ship the beta\ngreen: Thank the testers',
    faq: '# Help\nHow do I share?\n  Copy the link.\nIs it stored?\n  No.',
    site: '# Harbor Coffee\nRoasted on the quay.\n> Menu | #menu\n- :coffee Daily | Fresh\n## Menu\nEspresso and buns.',
    store: '# Shop\nBeans.\nHouse blend | 12.50 | Good\nMug | 9 | Tin',
    invoice: 'From: Harbor\nTo: Acme\nNumber: 7\nTax: 8%\nDesign, 2, 150',
    contract: '# Deal\nSam walks the dog.',
    zine: ':star\nMy zine\nIssue one\n\nInside\nSome words for page two.',
    booklet: 'A book\nby me\n\nOne\nwords',
    programme: 'Tonight\n\nFirst half\nsongs',
    brochure: 'Visit\n\nWhy\nbecause',
    comic: 'Biscuit\n\n \n:dog Walk? | Monday',
    planner: 'My week\n\nMonday\nGym',
    poster: ':music\nOpen mic\nFriday 8pm',
    certificate: ':award\nCertificate\nSam',
    menu: '# Cafe\n## Coffee\nEspresso | 3.00 | Dark',
    resume: '# Ada\n## Experience\n- Wrote a program',
    badges: 'Ada | Eng\nGrace | Compilers',
    recipes: 'Buns\nflour\n1. Bake',
    flow: '# Model\nvisitors = 100 (0 to 500)\nrate = 10% (0 to 50)\nVisitors > Signups = visitors * rate\nVisitors > Gone = visitors - visitors * rate',
    pixel: 'ab.c\n.dd',
    pattern: 'aaa\nb.b',
    floor: 'Hall: 4 x 2 at 0,0\nBath: 2 x 2 at 4,0',
    seating: 'Top: Sam, Paul, Ada',
    family: 'Rose + Albert\n  Helen',
    timeline: '1969: First message\n1989: The web',
    wordsearch: '# Coffee\nespresso\nfilter',
    adventure: '# Story\n## start\nA door.\n> Open it | in\n## in\nA room.',
    hunt: '# Hunt\nKettle colour? | red\nDone!',
    trivia: '# Quiz\n## One\nCapital of Portugal? | Lisbon',
    madlibs: '# Story\nMy [adjective] boss rode a [animal].',
    spinner: '# Lunch?\nAda\nGrace\nAlan',
    flashcards: '# Words\nbom dia | good morning',
    poll: '# Where?\n- Pizza\n- Tacos\nSam: Tacos',
    santa: '# Santa\nAda\nGrace\nAlan',
    card: '# Happy birthday!\nPaul: Many happy returns.',
    capsule: '# Later\nopen: 2020-01-01\nHello again.',
    split: '# Trip\nPaul: 60, dinner\nSam: 20, taxi',
    habits: '# March\nWalk\nRead',
    countdown: '# Launch\n2031-03-01',
    bio: '# Ada\nNotes.\nSite | https://example.com',
    checklist: '# Packing\n## Kit\nMap\nFlask',
    log: '# Log\n1 March, Run, 5 km',
    reading: '# Read\nPiranesi | Susanna Clarke | 4 | Tides.',
    chords: '# Song\n[C]Row your [G]boat',
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
    await page.goto(`/#/v2/${app}/${encodeEnvelope({ created: 1, body })}`);
    await expect(page.locator(`to-${app}`)).toBeVisible();
    await page.waitForTimeout(150);
    await check(app);
  }
  // And in the dark.
  await page.evaluate(() => localStorage.setItem('to-theme', 'dark'));
  await page.goto('about:blank');
  await page.goto(`/#/v2/todo/${encodeEnvelope({ created: 1, body: docs.todo })}`);
  await expect(page.locator('html')).toHaveClass(/sl-theme-dark/);
  await check('dark todo');
  expect(found).toEqual([]);
});

// Run twice: as the phone or desktop is, and at 320px, which is what a laptop shows zoomed to 400%.
for (const narrow of [false, true]) test(`nothing is cut off at the right edge${narrow ? ', zoomed to 400%' : ', on any screen'}`, async ({ page, isMobile }) => {
  test.slow();
  if (narrow && isMobile) test.skip();
  if (narrow) await page.setViewportSize({ width: 320, height: 640 });
  await offlineMap(page);
  const { encodeEnvelope } = await import('../src/lib/envelope.ts');
  const docs: Record<string, string> = {
    sheet: '!bar|td$\nItem\tWhen\tCost\nRent\t2027-03-01\t1200',
    write: '# Memo\nSome *bold* text\n- one\n-- nested',
    deck: ':rocket\nLaunch plan\nBuild it\nShip it',
    draw: 'r,2,1,12,6,1b3,Box',
    cal: 'd2,2,Offsite',
    todo: '- one\nx!@1jk two',
    board: '#To do\nx\ny\n#Done|1',
    gantt: '1jk,5,1e,Design\n>1jk,2,2s,Sketch',
    trip: '3xa8g,-fuyo,Lisbon\tnote\n40000,0,B',
    anim: '9\nirocket\t0,a,14,a;8,1y,a,p',
    org: 'Ada | CEO\n  Ben | Engineering\n  Eve | Design',
    mind: 'Launch\n  Product\n    Pricing\n  Marketing',
    lanes: 'Customer: Orders\nSales: In stock?\nWarehouse: Packs',
    venn: 'Fast: a\nCheap: b\nFast & Cheap: c',
    net: 'Web > API: calls\nAPI - Cache',
    db: 'teams: id, name\n1, Platform\n\npeople: id, name, team_id > teams\n1, Ann, 1\n\n? select name from people',
    sticky: 'Ship the beta\ngreen: Thank the testers',
    faq: '# Help\nHow do I share?\n  Copy the link.\nIs it stored?\n  No.',
    site: '# Harbor Coffee\nRoasted on the quay.\n> Menu | #menu\n- :coffee Daily | Fresh\n## Menu\nEspresso and buns.',
    store: '# Shop\nBeans.\nHouse blend | 12.50 | Good\nMug | 9 | Tin',
    invoice: 'From: Harbor\nTo: Acme\nNumber: 7\nTax: 8%\nDesign, 2, 150',
    contract: '# Deal\nSam walks the dog.',
    zine: ':star\nMy zine\nIssue one\n\nInside\nSome words for page two.',
    booklet: 'A book\nby me\n\nOne\nwords',
    programme: 'Tonight\n\nFirst half\nsongs',
    brochure: 'Visit\n\nWhy\nbecause',
    comic: 'Biscuit\n\n \n:dog Walk? | Monday',
    planner: 'My week\n\nMonday\nGym',
    poster: ':music\nOpen mic\nFriday 8pm',
    certificate: ':award\nCertificate\nSam',
    menu: '# Cafe\n## Coffee\nEspresso | 3.00 | Dark',
    resume: '# Ada\n## Experience\n- Wrote a program',
    badges: 'Ada | Eng\nGrace | Compilers',
    recipes: 'Buns\nflour\n1. Bake',
    flow: '# Model\nvisitors = 100 (0 to 500)\nrate = 10% (0 to 50)\nVisitors > Signups = visitors * rate\nVisitors > Gone = visitors - visitors * rate',
    pixel: 'ab.c\n.dd',
    pattern: 'aaa\nb.b',
    floor: 'Hall: 4 x 2 at 0,0\nBath: 2 x 2 at 4,0',
    seating: 'Top: Sam, Paul, Ada',
    family: 'Rose + Albert\n  Helen',
    timeline: '1969: First message\n1989: The web',
    wordsearch: '# Coffee\nespresso\nfilter',
    adventure: '# Story\n## start\nA door.\n> Open it | in\n## in\nA room.',
    hunt: '# Hunt\nKettle colour? | red\nDone!',
    trivia: '# Quiz\n## One\nCapital of Portugal? | Lisbon',
    madlibs: '# Story\nMy [adjective] boss rode a [animal].',
    spinner: '# Lunch?\nAda\nGrace\nAlan',
    flashcards: '# Words\nbom dia | good morning',
    poll: '# Where?\n- Pizza\n- Tacos\nSam: Tacos',
    santa: '# Santa\nAda\nGrace\nAlan',
    card: '# Happy birthday!\nPaul: Many happy returns.',
    capsule: '# Later\nopen: 2020-01-01\nHello again.',
    split: '# Trip\nPaul: 60, dinner\nSam: 20, taxi',
    habits: '# March\nWalk\nRead',
    countdown: '# Launch\n2031-03-01',
    bio: '# Ada\nNotes.\nSite | https://example.com',
    checklist: '# Packing\n## Kit\nMap\nFlask',
    log: '# Log\n1 March, Run, 5 km',
    reading: '# Read\nPiranesi | Susanna Clarke | 4 | Tides.',
    chords: '# Song\n[C]Row your [G]boat',
    qr: 'https://tinylittleoffice.com/',
  };
  const found: string[] = [];
  for (const [app, body] of Object.entries(docs)) {
    await page.goto('about:blank');
    await page.goto(`/#/v2/${app}/${encodeEnvelope({ created: 1, title: 'A fairly long title for this document', body })}`);
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
