import { test, expect } from '@playwright/test';
import { shot, reopen, navTo, SHOTS, copyLink, privacy } from './helpers';

test('navigation works on every screen size', async ({ page }) => {
  await page.goto('/');
  await navTo(page, 'Deck');
  await expect(page).toHaveURL(/#\/v0\/deck$/);
  await expect(page.locator('.to-panel h1')).toHaveText(/Deck/);
  await navTo(page, 'Calendar');
  await expect(page.locator('.to-panel h1')).toHaveText(/Calendar/);
  // No horizontal overflow at this viewport.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await shot(page, 'nav');
});

test('the hamburger holds every app and the theme', async ({ page }) => {
  await page.goto('/#/v0/sheet');
  await expect(page.locator('.to-here')).toHaveText('Sheet');
  await page.locator('.to-burger').click();
  const drawer = page.locator('#nav-drawer');
  await expect(drawer).toHaveAttribute('open');
  // (The three plans are templates in Write now: their links open, but they are not listed.)
  await expect(drawer.locator('.to-drawer-nav a')).toHaveCount(51);
  // Grouped, with the kinds of drawing listed under Draw.
  await expect(drawer.locator('.to-drawer-nav h2')).toHaveText(['Plan', 'Create', 'Collaborate', 'Play', 'Design', 'Print', 'Track']);
  // Sheet, Write and Deck stand on their own at the top; the clusters fold, and stay as left.
  await expect(drawer.locator('.to-drawer-nav > a')).toHaveText([/^Home$/, /^Drive\s*\d*$/, /^Sheet$/, /^Write$/, /^Outline$/, /^Deck$/]);
  await expect(drawer.locator('details.to-cluster[open] h2')).toHaveText(['Plan', 'Create', 'Collaborate', 'Play', 'Design', 'Print', 'Track']);
  await drawer.locator('details.to-cluster', { hasText: 'Play' }).locator('summary').click();
  await expect(drawer.locator('details.to-cluster', { hasText: 'Play' })).not.toHaveAttribute('open');
  await expect(drawer.locator('.to-drawer-nav a.sub')).toHaveText(['Org chart', 'Mind map', 'Swimlanes', 'Venn', 'Network', 'Floor plan', 'Seating chart', 'Family tree', 'Timeline', 'Booklet', 'Brochure', 'Comic', 'Résumé', 'Name badges']);
  await expect(drawer.locator('a[aria-current="page"]')).toContainText('Sheet');
  await expect(drawer.locator('.to-theme')).toContainText('Theme');
  await shot(page, 'drawer');
  await page.keyboard.press('Escape');
  await expect(drawer).not.toHaveAttribute('open');
});

test('meter counts down and copies the link', async ({ page }) => {
  await page.goto('/#/v0/sheet');
  const meter = page.locator('.to-meter');
  const ring = meter.locator('sl-progress-ring');
  await expect(ring).toHaveAttribute('value', '0');
  await page.getByRole('textbox', { name: 'A1', exact: true }).fill('The quick brown fox');
  await expect(ring).not.toHaveAttribute('value', '0');
  await expect(meter.locator('.text')).toHaveText(/\d[\d,]* left/, { visible: false });
  const before = page.url();
  await copyLink(page);
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  // The copied link goes through the app's own page, so it previews as a sheet.
  expect(copied).toBe(before.replace('/#/', '/sheet/#/'));
});

test('documents record their creation time', async ({ page }) => {
  // (The tags are read, not seen: on a phone they are hidden to leave the title its room.)
  await page.goto('/#/v0/write');
  await page.addStyleTag({ content: '.to-panel-head .meta { display: inline !important }' });
  await expect(page.locator('.to-panel-head .meta')).toHaveText('');
  const editor = page.getByRole('textbox', { name: 'Document' });
  await editor.click();
  await page.keyboard.type('hello');
  await expect(page.locator('.to-panel-head .meta')).toContainText(/\d{4}/);
  const url = page.url();
  expect(url).toMatch(/#\/v0\/write\/[WYZR]/);
  // Creation time is in the link and survives a reload.
  const created = await page.locator('.to-panel-head .meta').textContent();
  await reopen(page);
  await page.addStyleTag({ content: '.to-panel-head .meta { display: inline !important }' });
  await expect(page.locator('.to-panel-head .meta')).toHaveText(created!.trim());
  // A new document starts over.
  await page.goto('/#/v0/write');
  await page.addStyleTag({ content: '.to-panel-head .meta { display: inline !important }' });
  await expect(page.locator('.to-panel-head .meta')).toHaveText('');
});

test('signing a document and detecting changes', async ({ page }) => {
  await page.goto('/#/v0/sheet');
  await page.getByRole('textbox', { name: 'A1', exact: true }).fill('42');
  await page.locator('.to-meter sl-progress-ring').click();
  const dialog = page.locator('#doc-dialog');
  await expect(dialog).toHaveAttribute('open');
  await expect(dialog).toContainText('Unsigned');
  await expect(dialog.locator('dd code')).toHaveCount(0);
  await page.getByRole('button', { name: 'Sign', exact: true }).click();
  await expect(dialog).toContainText('Valid');
  await expect(dialog).toContainText(/this (browser|device)/);
  const fp = (await dialog.locator('dd code').first().textContent())!;
  expect(fp).toMatch(/^[0-9a-f]{5}-[0-9a-f]{5}$/);
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.locator('.to-panel-head')).toContainText('signed');
  const signedUrl = page.url();

  // The signature verifies in a fresh load, then breaks on edit.
  await reopen(page);
  await expect(page.locator('.to-panel-head sl-tag')).toContainText('signed');
  await page.getByRole('textbox', { name: 'A2', exact: true }).fill('43');
  await expect(page.locator('.to-panel-head')).toContainText('signature mismatch');
  await page.locator('.to-meter sl-progress-ring').click();
  await expect(dialog).toContainText('Mismatch');
  await page.getByRole('button', { name: 'Re-sign' }).click();
  await expect(dialog).toContainText('Valid');
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(dialog).toContainText('Unsigned');
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.locator('.to-panel-head sl-tag')).toHaveCount(0);
  await shot(page, 'signed');

  // A tampered link reads as a mismatch, not as valid.
  const tampered = signedUrl.replace(/#\/v0\/sheet\/([YZ])(.)/, (_m, f: string, c: string) => `#/v0/sheet/${f}${c === 'A' ? 'B' : 'A'}`);
  await page.goto(tampered);
  const head = page.locator('.to-panel-head');
  await expect(head).not.toContainText(/\bsigned\b(?! mismatch)/);
});

test('signing keys can be exported and imported', async ({ page, context }) => {
  await page.goto('/#/v0/sheet');
  await page.locator('.to-meter sl-progress-ring').click();
  await page.getByRole('button', { name: 'Export' }).click();
  const dialog = page.locator('#doc-dialog');
  const key = await dialog.locator('textarea').inputValue();
  expect(JSON.parse(key)).toHaveProperty('priv');
  const fp = (await dialog.locator('dd code').first().textContent())!;

  // A second, independent origin storage: clear it and import.
  await context.clearCookies();
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('tinyoffice.keep', '1'); });
  await page.reload();
  await page.locator('.to-meter sl-progress-ring').click();
  await expect(dialog.locator('dd code')).toHaveCount(0);
  await page.getByRole('button', { name: 'Import' }).click();
  await dialog.locator('textarea').fill(key);
  await page.getByRole('button', { name: 'Use key' }).click();
  await expect(dialog.locator('dd code').first()).toHaveText(fp);
});

test('password-locked documents', async ({ page }) => {
  test.slow(); // PBKDF2 at 600k iterations, several times
  await page.goto('/#/v0/sheet');
  const a1 = page.getByRole('textbox', { name: 'A1', exact: true });
  await a1.fill('payroll 2026');
  const plainUrl = page.url();
  await page.locator('.to-meter sl-progress-ring').click();
  const dialog = page.locator('#doc-dialog');
  await page.getByLabel('New password').fill('hunter2 is weak');
  await page.getByRole('button', { name: 'Lock' }).click();
  await expect(dialog).toContainText('Locked');
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.locator('.to-panel-head')).toContainText('locked');
  const lockedUrl = page.url();
  expect(lockedUrl).toMatch(/#\/v0\/sheet\/E[A-Za-z0-9_-]+$/);
  expect(lockedUrl).not.toBe(plainUrl);

  // Reopening asks for the password; the content is not shown until it is right.
  await page.goto('about:blank');
  await page.goto(lockedUrl);
  const prompt = page.locator('#pw-dialog');
  await expect(prompt).toHaveAttribute('open');
  await expect(a1).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('wrong');
  await page.getByRole('button', { name: 'Open' }).click();
  await expect(prompt).toContainText('Wrong password');
  await expect(prompt).toHaveAttribute('open');
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('hunter2 is weak');
  await page.keyboard.press('Enter');
  await expect(prompt).not.toHaveAttribute('open');
  await expect(a1).toHaveValue('payroll 2026');
  await expect(page.locator('.to-panel-head')).toContainText('locked');

  // Edits stay encrypted, and the password can be removed.
  const beforeEdit = page.url();
  await page.getByRole('textbox', { name: 'A2', exact: true }).fill('bonus');
  // Sealing is asynchronous: wait for the link to change, not just to look sealed.
  await expect.poll(() => page.url()).not.toBe(beforeEdit);
  await expect.poll(() => page.url()).toMatch(/#\/v0\/sheet\/E/);
  const url2 = page.url();
  await page.goto('about:blank');
  await page.goto(url2);
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('hunter2 is weak');
  await page.getByRole('button', { name: 'Open' }).click();
  await expect(page.getByRole('textbox', { name: 'A2', exact: true })).toHaveValue('bonus');
  await page.locator('.to-meter sl-progress-ring').click();
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(dialog).not.toContainText('Locked');
  await page.getByRole('button', { name: 'Done' }).click();
  await expect.poll(() => page.url()).toMatch(/#\/v0\/sheet\/[WYZR]/);
  const plainAgain = page.url();
  await page.goto('about:blank');
  await page.goto(plainAgain);
  await expect(prompt).not.toHaveAttribute('open');
  await expect(a1).toHaveValue('payroll 2026');
});

test('links carry the format version, v0, and nothing else opens', async ({ page }) => {
  await page.goto('/#/v0/write');
  await expect(page.locator('.to-drawer-nav a', { hasText: 'Deck' })).toHaveAttribute('href', '#/v0/deck');
  await page.getByRole('textbox', { name: 'Document' }).click();
  await page.keyboard.type('A link');
  await expect.poll(() => page.url()).toMatch(/#\/v0\/write\/[WYZR]/);
  // Without its version it is not a document's link.
  await page.goto(page.url().replace('#/v0/', '#/'));
  await expect(page.locator('to-write')).toHaveCount(0);
  // A link from a future version says so.
  await page.goto(page.url().replace('#/v0/', '#/v7/'));
  await expect(page.locator('.to-panel-head')).toContainText('newer TinyLittleOffice (v7)');
});

test('password and signature live in the privacy menu', async ({ page }) => {
  await page.goto('/#/v0/sheet');
  await page.getByRole('textbox', { name: 'A1', exact: true }).fill('1');
  const dialog = page.locator('#doc-dialog');
  await privacy(page, /Password/);
  await expect(dialog).toHaveAttribute('open');
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(dialog).not.toHaveAttribute('open');
  await privacy(page, /Signature/);
  await expect(dialog).toHaveAttribute('open');
  await dialog.getByRole('button', { name: 'Sign', exact: true }).click();
  await expect(page.locator('.to-panel-head')).toContainText('signed');
});

test('download views: the link itself hands over a file', async ({ page }, testInfo) => {
  await page.route('https://tile.openstreetmap.org/**', (route) => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') }));
  const { encodeEnvelope } = await import('../src/lib/envelope.ts');
  const created = Date.UTC(2026, 0, 2, 3, 4);
  const docs: [string, string, string, string, (bytes: Buffer) => void][] = [
    ['deck', 'pptx', ':rocket\nLaunch plan\nBuild it\nShip it\n\n:users\nTeam\nEveryone', 'launch-plan.pptx', (b) => expect(b.subarray(0, 2).toString()).toBe('PK')],
    ['deck', 'ppt', 'Alias', 'alias.pptx', (b) => expect(b.subarray(0, 2).toString()).toBe('PK')],
    ['sheet', 'xlsx', '10\tTotal\n32\n=SUM(A1:A2)*2\t=AVG(A1:A2)', 'sheet.xlsx', (b) => expect(b.subarray(0, 2).toString()).toBe('PK')],
    ['sheet', 'csv', '10\tTotal\n32\n=SUM(A1:A2)*2', 'sheet.csv', (b) => expect(b.toString()).toBe('\ufeff10,Total\r\n32,\r\n84,\r\n')],
    ['write', 'rtf', '# Memo\nSome *bold* text\n- one\n- two', 'memo.rtf', (b) => expect(b.toString()).toContain('{\\b bold}')],
    ['write', 'html', '# Memo\nSome *bold* text', 'memo.html', (b) => { expect(b.toString()).toContain('<strong>bold</strong>'); expect(b.toString()).toContain('<meta property="og:title" content="Memo">'); }],
    ['draw', 'svg', 'r,2,1,12,6,1,Box\na,14,4,8,0,0', 'draw.svg', (b) => expect(b.toString()).toContain('>Box</text>')],
    ['cal', 'ics', '@America/New_York\nd2,2,Offsite\ntgo,2i,Call', 'cal.ics', (b) => expect(b.toString()).toContain('SUMMARY:Offsite')],
    // Every app can also be a PDF, a picture and a web page.
    ['deck', 'pdf', ':rocket:t\nLaunch plan\nSpring\n\nAgenda\none\ntwo', 'launch-plan.pdf', (b) => { expect(b.subarray(0, 8).toString()).toBe('%PDF-1.4'); expect(b.toString('latin1').match(/\/Type \/Page /g)).toHaveLength(3); }],
    ['gantt', 'pdf', '1jk,5,1e,Design\n>1jk,2,2s,Sketch', 'gantt.pdf', (b) => expect(b.subarray(0, 5).toString()).toBe('%PDF-')],
    ['board', 'png', '#To do\nWrite the brief\n#Done', 'board.png', (b) => expect(b.subarray(1, 4).toString()).toBe('PNG')],
    ['trip', 'png', '3xa8g,-fuyo,Lisbon\n40000,0,B', 'lisbon-to-b.png', (b) => expect(b.subarray(1, 4).toString()).toBe('PNG')],
    ['todo', 'html', '- one\nx two', 'todo.html', (b) => { expect(b.toString()).toContain('<input type="checkbox" disabled checked> two'); expect(b.toString()).toMatch(/<meta property="og:image" content="http:\/\/localhost:\d+\/og\/todo\.png">/); }],
  ];
  for (const [app, ext, body, name, check] of docs) {
    await page.goto('about:blank');
    const [download] = await Promise.all([page.waitForEvent('download'), page.goto(`/#/v0/${app}.${ext}/${encodeEnvelope({ created, body })}`)]);
    expect(download.suggestedFilename()).toBe(name);
    const path = testInfo.outputPath(`${ext}-${name}`);
    await download.saveAs(path);
    const bytes = (await import('node:fs')).readFileSync(path);
    expect(bytes.length).toBeGreaterThan(20);
    check(bytes);
    if (SHOTS) (await import('node:fs')).copyFileSync(path, `${SHOTS}/${testInfo.project.name}-${name}`);
    await expect(page.locator('.to-toast')).toContainText(`Downloaded ${name}`);
  }
  // The document is still there to edit, and the menu offers the same files.
  await expect(page.locator('to-todo')).toBeVisible();
  await page.getByRole('button', { name: 'Download' }).click();
  const [fromMenu] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: /^Markdown/ }).click()]);
  expect(fromMenu.suggestedFilename()).toBe('todo.md');
  // An extension the app does not have is reported, not downloaded.
  await page.goto(`/#/v0/cal.pptx/${encodeEnvelope({ created, body: 'd2,2,Offsite' })}`);
  await expect(page.locator('.to-toast')).toContainText('No .pptx view here');
});

test('download views wait for the password', async ({ page }) => {
  test.slow();
  await page.goto('/#/v0/sheet');
  await page.getByRole('textbox', { name: 'A1', exact: true }).fill('secret');
  await privacy(page, /Password/);
  await page.getByRole('textbox', { name: 'New password' }).fill('pw');
  await page.getByRole('button', { name: 'Lock', exact: true }).click();
  await expect.poll(() => page.url()).toMatch(/#\/v0\/sheet\/E/);
  const url = page.url().replace('/sheet/', '/sheet.csv/');
  await page.goto('about:blank');
  await page.goto(url);
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('pw');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Open' }).click()]);
  expect(download.suggestedFilename()).toBe('sheet.csv');
});

test('each app has a page of its own, with its own preview card', async ({ page, request }) => {
  const html = await (await request.get('/deck/')).text();
  expect(html).toContain('<title>Deck · TinyLittleOffice</title>');
  expect(html).toMatch(/<meta property="og:image" content="https:\/\/[^"]+\/og\/deck\.png"/);
  expect(html).toMatch(/<link rel="canonical" href="https:\/\/[^"]+\/deck\/"/);
  expect((await request.get('/og/deck.png')).status()).toBe(200);
  // The page opens a new deck, and documents work there as anywhere.
  await page.goto('/deck/');
  await expect(page.locator('.to-panel h1')).toHaveText(/Deck/);
  await page.getByRole('textbox', { name: 'Headline' }).fill('From the deck page');
  await expect.poll(() => page.url()).toMatch(/\/deck\/#\/v0\/deck\/[WYZR]/);
  await reopen(page);
  await expect(page.getByRole('textbox', { name: 'Headline' })).toHaveText('From the deck page');
});

test('keyboard shortcuts are listed, and work everywhere', async ({ page }) => {
  await page.goto('/#/v0/todo');
  await page.getByRole('textbox', { name: 'New task' }).fill('Ship it');
  await page.keyboard.press('Enter');
  // The menu has the list; so does Ctrl+/.
  await page.locator('.to-burger').click();
  await page.locator('#nav-drawer .to-keys').click();
  const keys = page.locator('#keys-dialog');
  await expect(keys).toHaveAttribute('open');
  await expect(keys).toContainText('Everywhere');
  await expect(keys).toContainText('In Todo');
  await expect(keys.locator('kbd').first()).toBeVisible();
  await keys.getByRole('button', { name: 'Done' }).click();
  await expect(keys).not.toHaveAttribute('open');
  await page.keyboard.press('Control+/');
  await expect(keys).toHaveAttribute('open');
  await page.keyboard.press('Escape');
  await expect(keys).not.toHaveAttribute('open');
  // Ctrl+P is a PDF; Ctrl+S the app's first format.
  const [pdf] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Control+p')]);
  expect(pdf.suggestedFilename()).toBe('todo.pdf');
  const [md] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Control+s')]);
  expect(md.suggestedFilename()).toBe('todo.md');
  await page.keyboard.press('Control+k');
  await expect(page.locator('#nav-drawer')).toHaveAttribute('open');
});

test('undo and redo work in every app', async ({ page }) => {
  test.slow();
  const undo = page.getByRole('button', { name: 'Undo' });
  const redo = page.getByRole('button', { name: 'Redo' });
  // Changes a moment apart are separate steps; a burst of typing is one.
  const pause = () => page.waitForTimeout(800);

  // Todo: with the keyboard.
  await page.goto('/#/v0/todo');
  await expect(undo).toBeDisabled();
  const add = page.getByRole('textbox', { name: 'New task' });
  const rows = page.locator('.todo-list li');
  for (const t of ['One', 'Two']) {
    await add.fill(t);
    await page.keyboard.press('Enter');
    await pause();
  }
  await rows.nth(0).locator('sl-checkbox').click();
  await expect(rows.nth(0)).toHaveClass(/done/);
  await page.keyboard.press('Control+z');
  await expect(rows.nth(0)).not.toHaveClass(/done/);
  await page.keyboard.press('Control+z');
  await expect(rows).toHaveCount(1);
  await page.keyboard.press('Control+Shift+z');
  await expect(rows).toHaveCount(2);
  await page.keyboard.press('Control+y');
  await expect(rows.nth(0)).toHaveClass(/done/);
  await expect(redo).toBeDisabled();
  // The link follows: what is undone is gone from it too.
  await undo.click();
  await undo.click();
  await expect(rows).toHaveCount(1);
  await reopen(page);
  await expect(rows).toHaveCount(1);
  // A reopened link is a fresh start.
  await expect(undo).toBeDisabled();

  // Sheet: with the buttons.
  await page.goto('/#/v0/sheet');
  const cell = (ref: string) => page.getByRole('textbox', { name: ref, exact: true });
  await cell('A1').fill('10');
  await pause();
  await cell('A2').fill('=A1*2');
  await pause();
  await cell('B1').click();
  await expect(cell('A2')).toHaveValue('20');
  await undo.click();
  await expect(cell('A2')).toHaveValue('');
  await expect(cell('A1')).toHaveValue('10');
  await redo.click();
  await expect(cell('A2')).toHaveValue('20');

  // Write: typing in one go is one step.
  await page.goto('/#/v0/write');
  const editor = page.getByRole('textbox', { name: 'Document' });
  await editor.click();
  await page.keyboard.type('First thought.');
  await pause();
  await page.keyboard.type(' Second thought.');
  await expect(editor).toHaveText('First thought. Second thought.');
  await page.keyboard.press('Control+z');
  await expect(editor).toHaveText('First thought.');
  await page.keyboard.press('Control+Shift+z');
  await expect(editor).toHaveText('First thought. Second thought.');

  // Deck: slides come back.
  await page.goto('/#/v0/deck');
  await page.getByRole('textbox', { name: 'Headline' }).fill('Title');
  await pause();
  await page.getByRole('button', { name: 'Slide', exact: true }).click();
  await page.getByRole('textbox', { name: 'Headline' }).fill('Second');
  await pause();
  await page.getByRole('button', { name: 'Delete slide' }).click();
  const thumbs = page.locator('.deck-rail .deck-thumb');
  await expect(thumbs).toHaveCount(1);
  await page.keyboard.press('Control+z');
  await expect(thumbs).toHaveCount(2);

  // Draw, Board, Gantt, Calendar, Trip and Motion take the same undo, since it is the shell's.
  for (const [app, body, sel, n] of [['draw', 'r,2,1,12,6,1,Box', 'g.shape', 1], ['board', '#To do\nA\nB\n#Done', '.board-card', 2], ['gantt', '1jk,5,1e,Design\n1jp,2,0,Build', '.gantt-chart .bar', 2], ['anim', '!o,8\nt,4,4,10,3,0,Hello', '.motion-stage g.hit', 1]] as const) {
    const { encodeEnvelope } = await import('../src/lib/envelope.ts');
    await page.goto('about:blank');
    await page.goto(`/#/v0/${app}/${encodeEnvelope({ created: null, body })}`);
    await expect(page.locator(sel)).toHaveCount(n);
    await page.locator(sel).first().click();
    await page.getByRole('button', { name: app === 'board' ? 'Delete card' : app === 'gantt' ? 'Delete task' : 'Delete', exact: true }).first().click();
    await expect(page.locator(sel)).toHaveCount(n - 1);
    await undo.click();
    await expect(page.locator(sel), app).toHaveCount(n);
  }
});

test('undo inside a document that is inside another', async ({ page }) => {
  const { encodeEnvelope } = await import('../src/lib/envelope.ts');
  const draw = 'draw/' + encodeEnvelope({ created: null, body: 'r,2,1,12,6,1,One\ne,20,10,10,8,0,Two' });
  await page.goto('/#/v0/write/' + encodeEnvelope({ created: null, body: `Intro\n@@${draw}` }));
  const embed = page.locator('to-embed');
  await embed.getByRole('button', { name: 'Edit' }).click();
  const sub = page.locator('sl-dialog.to-sub');
  await expect(sub.locator('g.shape')).toHaveCount(2);
  await sub.locator('g.shape').first().click();
  await page.keyboard.press('Delete');
  await expect(sub.locator('g.shape')).toHaveCount(1);
  // Undo here undoes the drawing, not the text around it.
  await page.keyboard.press('Control+z');
  await expect(sub.locator('g.shape')).toHaveCount(2);
  await page.keyboard.press('Control+Shift+z');
  await expect(sub.locator('g.shape')).toHaveCount(1);
  await sub.getByRole('button', { name: 'Done' }).click();
  await expect(embed.locator('svg[role="img"] ellipse')).toHaveCount(1);
  await expect(embed.locator('svg[role="img"] rect')).toHaveCount(0);
  // Back in the text, undo puts the drawing back as it was.
  await page.keyboard.press('Control+z');
  await expect(embed.locator('svg[role="img"] rect')).toHaveCount(1);
  await expect(page.getByRole('textbox', { name: 'Document' })).toContainText('Intro');
});

test('a shared deck opens presenting, with a way back to editing', async ({ page }) => {
  await page.goto('/#/v0/deck');
  await page.getByRole('textbox', { name: 'Headline' }).fill('Spring launch');
  await page.getByRole('button', { name: 'Slide', exact: true }).click();
  await page.getByRole('textbox', { name: 'Headline' }).fill('Plan');
  await page.getByRole('textbox', { name: 'Bullets' }).fill('Build it\nShip it');
  await expect.poll(() => page.url()).toMatch(/#\/v0\/deck\/[WYZR]/);
  const editing = page.url();

  // The link that is copied is the plain one: it opens as the deck to read, never presenting unless asked.
  await copyLink(page);
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(editing.replace('/#/v0/deck/', '/deck/#/v0/deck/'));
  // A link that opens presenting is in Share, for when that is what is wanted.
  await page.getByRole('button', { name: 'Share' }).click();
  await page.getByRole('menuitem', { name: 'Copy link (opens presenting)' }).click();
  const shared = await page.evaluate(() => navigator.clipboard.readText());
  expect(shared).toBe(editing.replace('/#/v0/deck/', '/deck/#/v0/deck.show/'));

  // Someone opening the shared link lands in the presentation.
  await page.goto('about:blank');
  await page.goto(shared);
  const show = page.getByRole('dialog', { name: 'Presentation' });
  const slide = show.locator('.frame > svg');
  await expect(slide).toContainText('Spring launch');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(slide).toContainText('Ship it');
  // The deck ends with a QR code of itself, titled; and the end of the deck is not the end of the show.
  await page.keyboard.press('ArrowRight');
  await expect(slide.locator('path[shape-rendering="crispEdges"]')).toHaveCount(1);
  await expect(slide).toContainText('Spring launch');
  await page.keyboard.press('ArrowRight');
  await expect(slide.locator('path[shape-rendering="crispEdges"]')).toHaveCount(1);
  await shot(page, 'deck-shared');

  // "Edit this deck" is the way to the editor, and from then on the link is an editing link.
  await show.getByRole('button', { name: 'Edit this deck' }).click();
  await expect(show).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Headline' })).toBeVisible();
  expect(page.url()).not.toContain('deck.show');
  await reopen(page);
  await expect(show).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Headline' })).toBeVisible();
  // Presenting from the editor still ends by returning to it.
  await page.getByRole('button', { name: 'Present' }).click();
  await expect(show.getByRole('button', { name: 'Exit' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(show).toHaveCount(0);

  // Escape works for a visitor too.
  await page.goto('about:blank');
  await page.goto(shared);
  await expect(slide).toContainText('Spring launch');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('textbox', { name: 'Headline' })).toBeVisible();
});

test('Markdown and CSV come in as well as out', async ({ page }) => {
  await page.goto('/#/v0/todo');
  await page.getByRole('button', { name: 'Download' }).click();
  await page.getByRole('menuitem', { name: /Import Markdown/ }).click();
  const dialog = page.locator('#import-dialog');
  await expect(dialog).toHaveAttribute('open');
  await dialog.locator('textarea').fill('# Chores\n\n- [x] Sweep\n- [ ] **Shop**\n- [ ] Call mum');
  await dialog.getByRole('button', { name: 'Import' }).click();
  await expect(page.locator('.to-toast')).toContainText('Imported');
  await expect(page.locator('to-todo')).toContainText('Sweep');
  await expect(page.locator('to-todo')).toContainText('Call mum');
  await expect(page.getByRole('checkbox', { name: /Sweep/ })).toBeChecked();
  // A sheet reads a table; a deck reads headings.
  await page.goto('/#/v0/sheet');
  await page.getByRole('button', { name: 'Download' }).click();
  await page.getByRole('menuitem', { name: /Import Markdown/ }).click();
  await dialog.locator('textarea').fill('| Item | Cost |\n|---|---|\n| Rent | 1200 |');
  await dialog.getByRole('button', { name: 'Import' }).click();
  await expect(page.getByRole('textbox', { name: 'A1', exact: true })).toHaveValue('Item');
  await expect(page.getByRole('textbox', { name: 'B2', exact: true })).toHaveValue('1200');
  await page.goto('/#/v0/deck');
  await page.getByRole('button', { name: 'Download' }).click();
  await page.getByRole('menuitem', { name: /Import Markdown/ }).click();
  await dialog.locator('textarea').fill('# Launch\n\n## Agenda\n\n- one\n- two\n\n## Thanks');
  await dialog.getByRole('button', { name: 'Import' }).click();
  await expect(page.locator('to-deck')).toContainText('Agenda');
  await expect(page.locator('.deck-rail .deck-thumb')).toHaveCount(3);
  // CSV is a table too.
  await page.goto('/#/v0/sheet');
  await page.getByRole('button', { name: 'Download' }).click();
  await page.getByRole('menuitem', { name: /Import Markdown/ }).click();
  await dialog.locator('textarea').fill('Item,Cost\nRent,"1,200"\nFood,600');
  await dialog.getByRole('button', { name: 'Import' }).click();
  await expect(page.getByRole('textbox', { name: 'A3', exact: true })).toHaveValue('Food');
  await expect(page.getByRole('textbox', { name: 'B2', exact: true })).toHaveValue('1,200');
});

test('two links compare side by side, with what changed', async ({ page }) => {
  const { encodeEnvelope } = await import('../src/lib/envelope.ts');
  const created = Date.UTC(2026, 9, 6);
  const a = `/#/v0/todo/${encodeEnvelope({ created, title: 'Chores', by: 'me', body: '- Sweep\n- Shop' }, 'todo')}`;
  const b = `/#/v0/todo/${encodeEnvelope({ created, title: 'Chores', by: 'chores-agent', body: 'x Sweep\n- Shop\n- Call mum' }, 'todo')}`;
  const side = (h: string) => h.replace(/^\/#\/v0\/todo\//, '');
  await page.goto(`/#/compare/todo/${side(a)}/todo/${side(b)}`);
  const cmp = page.locator('to-compare');
  await expect(cmp.locator('h1')).toContainText('Compare');
  await expect(cmp.locator('.cmp-meta').nth(1)).toContainText('by chores-agent');
  await expect(cmp.locator('.cmp-diff .add')).toHaveCount(2);
  await expect(cmp.locator('.cmp-diff .del')).toHaveCount(1);
  await expect(cmp.locator('.cmp-diff')).toContainText('+ - [x] Sweep');
  await expect(cmp.locator('.cmp-diff')).toContainText('+ - [ ] Call mum');
  await expect(cmp.locator('iframe')).toHaveCount(2);
  await cmp.getByRole('button', { name: 'Swap' }).click();
  await expect(cmp.locator('.cmp-diff .add')).toHaveCount(1);
  // The second link is pasted on the page; the first comes from Share.
  await page.goto(a);
  await page.getByRole('button', { name: 'Share' }).click();
  await page.getByRole('menuitem', { name: /Compare with/ }).click();
  // (Whatever link the clipboard held may already be the second side; the pasted one replaces it.)
  await expect(page).toHaveURL(/#\/compare\/todo\//);
  await page.getByRole('textbox', { name: 'The second link' }).fill(`http://localhost${b}`);
  await page.getByRole('textbox', { name: 'The second link' }).press('Enter');
  await expect(cmp.locator('.cmp-diff .add')).toHaveCount(2);
});

test('a shorter link that expires, with the key kept out of the server', async ({ page }) => {
  await page.goto('/#/v0/sheet');
  await page.getByRole('textbox', { name: 'A1', exact: true }).fill('Secret plan');
  await expect.poll(() => page.url()).toMatch(/#\/v0\/sheet\/[WYZR]/);
  // A stand-in for tinier, remembering what it was sent.
  let sent: { c: string; iv: string; ttl: number } | null = null;
  await page.route('https://tinier.tinylittleoffice.com/api', async (route) => {
    sent = route.request().postDataJSON();
    await route.fulfill({ status: 201, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ id: 'abc2345', exp: Date.now() + sent!.ttl * 1000 }) });
  });
  await page.getByRole('button', { name: 'Share' }).click();
  await page.getByRole('menuitem', { name: /Shorter link/ }).click();
  const dialog = page.locator('#short-dialog');
  await expect(dialog).toHaveAttribute('open');
  await dialog.getByRole('radio', { name: 'A day' }).click();
  await dialog.getByRole('button', { name: 'Make the short link' }).click();
  await expect(dialog.locator('code')).toHaveText(/^https:\/\/tinier\.tinylittleoffice\.com\/abc2345#[A-Za-z0-9_-]{22}$/);
  await expect(dialog).toContainText('Expires');
  expect(sent!.ttl).toBe(86400);
  // Nothing of the document went to the server: not its words, not its link.
  expect(JSON.stringify(sent)).not.toContain('Secret');
  expect(JSON.stringify(sent)).not.toContain(page.url().split('/').pop()!);
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/^https:\/\/tinier\.tinylittleoffice\.com\/abc2345#/);
});
