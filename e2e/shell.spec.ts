import { test, expect } from '@playwright/test';
import { shot, reopen, navTo, SHOTS } from './helpers';

test('navigation works on every screen size', async ({ page }) => {
  await page.goto('/');
  await navTo(page, 'Deck');
  await expect(page).toHaveURL(/#\/v2\/deck$/);
  await expect(page.locator('.to-panel-head h1')).toHaveText(/Deck/);
  await navTo(page, 'Calendar');
  await expect(page.locator('.to-panel-head h1')).toHaveText(/Calendar/);
  // No horizontal overflow at this viewport.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await shot(page, 'nav');
});

test('the hamburger holds every app and the theme', async ({ page }) => {
  await page.goto('/#/sheet');
  await expect(page.locator('.to-here')).toHaveText('Sheet');
  await page.locator('.to-burger').click();
  const drawer = page.locator('#nav-drawer');
  await expect(drawer).toHaveAttribute('open');
  await expect(drawer.locator('.to-drawer-nav a')).toHaveCount(24);
  // Grouped, with the kinds of drawing listed under Draw.
  await expect(drawer.locator('.to-drawer-nav h2')).toHaveText(['Documents', 'Visualization', 'Time management', 'Publish and sell']);
  await expect(drawer.locator('.to-drawer-nav a.sub')).toHaveText(['Org chart', 'Mind map', 'Swimlanes', 'Venn', 'Network', 'Database', 'Sticky notes']);
  await expect(drawer.locator('a[aria-current="page"]')).toContainText('Sheet');
  await expect(drawer.locator('.to-theme')).toContainText('Theme');
  await shot(page, 'drawer');
  await page.keyboard.press('Escape');
  await expect(drawer).not.toHaveAttribute('open');
});

test('meter counts down and copies the link', async ({ page }) => {
  await page.goto('/#/sheet');
  const meter = page.locator('.to-meter');
  const ring = meter.locator('sl-progress-ring');
  await expect(ring).toHaveAttribute('value', '0');
  await page.getByRole('textbox', { name: 'A1', exact: true }).fill('The quick brown fox');
  await expect(ring).not.toHaveAttribute('value', '0');
  await expect(meter.locator('.text')).toHaveText(/\d[\d,]* left/, { visible: false });
  const before = page.url();
  await meter.getByRole('button', { name: 'Copy link' }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  // The copied link goes through the app's own page, so it previews as a sheet.
  expect(copied).toBe(before.replace('/#/', '/sheet/#/'));
});

test('documents record their creation time', async ({ page }) => {
  await page.goto('/#/write');
  await expect(page.locator('.to-panel-head .meta')).toHaveText('');
  const editor = page.getByRole('textbox', { name: 'Document' });
  await editor.click();
  await page.keyboard.type('hello');
  await expect(page.locator('.to-panel-head .meta')).toContainText(/\d{4}/);
  const url = page.url();
  expect(url).toMatch(/#\/v2\/write\/[YZR]/);
  // Creation time is in the link and survives a reload.
  const created = await page.locator('.to-panel-head .meta').textContent();
  await reopen(page);
  await expect(page.locator('.to-panel-head .meta')).toHaveText(created!.trim());
  // A new document starts over.
  await page.getByRole('link', { name: 'New Write' }).click();
  await expect(page.locator('.to-panel-head .meta')).toHaveText('');
});

test('signing a document and detecting changes', async ({ page }) => {
  await page.goto('/#/sheet');
  await page.getByRole('textbox', { name: 'A1', exact: true }).fill('42');
  await page.locator('.to-meter sl-progress-ring').click();
  const dialog = page.locator('#doc-dialog');
  await expect(dialog).toHaveAttribute('open');
  await expect(dialog).toContainText('Unsigned');
  await expect(dialog.locator('dd code')).toHaveCount(0);
  await page.getByRole('button', { name: 'Sign', exact: true }).click();
  await expect(dialog).toContainText('Valid');
  await expect(dialog).toContainText('this browser');
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
  const tampered = signedUrl.replace(/#\/v2\/sheet\/([YZ])(.)/, (_m, f: string, c: string) => `#/v2/sheet/${f}${c === 'A' ? 'B' : 'A'}`);
  await page.goto(tampered);
  const head = page.locator('.to-panel-head');
  await expect(head).not.toContainText(/\bsigned\b(?! mismatch)/);
});

test('signing keys can be exported and imported', async ({ page, context }) => {
  await page.goto('/#/sheet');
  await page.locator('.to-meter sl-progress-ring').click();
  await page.getByRole('button', { name: 'Export' }).click();
  const dialog = page.locator('#doc-dialog');
  const key = await dialog.locator('textarea').inputValue();
  expect(JSON.parse(key)).toHaveProperty('priv');
  const fp = (await dialog.locator('dd code').first().textContent())!;

  // A second, independent origin storage: clear it and import.
  await context.clearCookies();
  await page.evaluate(() => localStorage.clear());
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
  await page.goto('/#/sheet');
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
  expect(lockedUrl).toMatch(/#\/v2\/sheet\/E[A-Za-z0-9_-]+$/);
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
  await expect.poll(() => page.url()).toMatch(/#\/v2\/sheet\/E/);
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
  await expect.poll(() => page.url()).toMatch(/#\/v2\/sheet\/[YZR]/);
  const plainAgain = page.url();
  await page.goto('about:blank');
  await page.goto(plainAgain);
  await expect(prompt).not.toHaveAttribute('open');
  await expect(a1).toHaveValue('payroll 2026');
});

test('links carry a format version, and links from before versions still open', async ({ page }) => {
  await page.goto('/#/write');
  await expect(page.locator('.to-drawer-nav a', { hasText: 'Deck' })).toHaveAttribute('href', '#/v2/deck');
  await page.getByRole('textbox', { name: 'Document' }).click();
  await page.keyboard.type('Old link');
  await expect.poll(() => page.url()).toMatch(/#\/v2\/write\/[YZR]/);
  const legacy = page.url().replace('#/v2/', '#/');
  await page.goto('about:blank');
  await page.goto(legacy);
  await expect(page.getByRole('textbox', { name: 'Document' })).toHaveText('Old link');
  await page.getByRole('textbox', { name: 'Document' }).click();
  await page.keyboard.type('!');
  await expect.poll(() => page.url()).toMatch(/#\/v2\/write\/[YZR]/);
  // A link from a future version says so.
  await page.goto(page.url().replace('#/v2/', '#/v7/'));
  await expect(page.locator('.to-panel-head')).toContainText('newer TinyOffice (v7)');
});

test('password and signature live in the privacy menu', async ({ page }) => {
  await page.goto('/#/sheet');
  await page.getByRole('textbox', { name: 'A1', exact: true }).fill('1');
  const dialog = page.locator('#doc-dialog');
  await page.getByRole('button', { name: 'Privacy' }).click();
  await page.getByRole('menuitem', { name: /Password/ }).click();
  await expect(dialog).toHaveAttribute('open');
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(dialog).not.toHaveAttribute('open');
  await page.getByRole('button', { name: 'Privacy' }).click();
  await page.getByRole('menuitem', { name: /Signature/ }).click();
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
    ['deck', 'pdf', ':rocket:t\nLaunch plan\nSpring\n\nAgenda\none\ntwo', 'launch-plan.pdf', (b) => { expect(b.subarray(0, 8).toString()).toBe('%PDF-1.4'); expect(b.toString('latin1').match(/\/Type \/Page /g)).toHaveLength(2); }],
    ['gantt', 'pdf', '1jk,5,1e,Design\n>1jk,2,2s,Sketch', 'gantt.pdf', (b) => expect(b.subarray(0, 5).toString()).toBe('%PDF-')],
    ['board', 'png', '#To do\nWrite the brief\n#Done', 'board.png', (b) => expect(b.subarray(1, 4).toString()).toBe('PNG')],
    ['trip', 'png', '3xa8g,-fuyo,Lisbon\n40000,0,B', 'lisbon-to-b.png', (b) => expect(b.subarray(1, 4).toString()).toBe('PNG')],
    ['todo', 'html', '- one\nx two', 'todo.html', (b) => { expect(b.toString()).toContain('<input type="checkbox" disabled checked> two'); expect(b.toString()).toContain('<meta property="og:image" content="http://localhost:4173/og/todo.png">'); }],
  ];
  for (const [app, ext, body, name, check] of docs) {
    await page.goto('about:blank');
    const [download] = await Promise.all([page.waitForEvent('download'), page.goto(`/#/v2/${app}.${ext}/${encodeEnvelope({ created, body })}`)]);
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
  const [fromMenu] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: /Markdown/ }).click()]);
  expect(fromMenu.suggestedFilename()).toBe('todo.md');
  // An extension the app does not have is reported, not downloaded.
  await page.goto(`/#/v2/cal.pptx/${encodeEnvelope({ created, body: 'd2,2,Offsite' })}`);
  await expect(page.locator('.to-toast')).toContainText('No .pptx view here');
});

test('download views wait for the password', async ({ page }) => {
  test.slow();
  await page.goto('/#/sheet');
  await page.getByRole('textbox', { name: 'A1', exact: true }).fill('secret');
  await page.getByRole('button', { name: 'Privacy' }).click();
  await page.getByRole('menuitem', { name: /Password/ }).click();
  await page.getByRole('textbox', { name: 'New password' }).fill('pw');
  await page.getByRole('button', { name: 'Lock', exact: true }).click();
  await expect.poll(() => page.url()).toMatch(/#\/v2\/sheet\/E/);
  const url = page.url().replace('/sheet/', '/sheet.csv/');
  await page.goto('about:blank');
  await page.goto(url);
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('pw');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Open' }).click()]);
  expect(download.suggestedFilename()).toBe('sheet.csv');
});

test('each app has a page of its own, with its own preview card', async ({ page, request }) => {
  const html = await (await request.get('/deck/')).text();
  expect(html).toContain('<title>Deck · TinyOffice</title>');
  expect(html).toMatch(/<meta property="og:image" content="https:\/\/[^"]+\/og\/deck\.png"/);
  expect(html).toMatch(/<link rel="canonical" href="https:\/\/[^"]+\/deck\/"/);
  expect((await request.get('/og/deck.png')).status()).toBe(200);
  // The page opens a new deck, and documents work there as anywhere.
  await page.goto('/deck/');
  await expect(page.locator('.to-panel-head h1')).toHaveText(/Deck/);
  await page.getByRole('textbox', { name: 'Headline' }).fill('From the deck page');
  await expect.poll(() => page.url()).toMatch(/\/deck\/#\/v2\/deck\/[YZR]/);
  await reopen(page);
  await expect(page.getByRole('textbox', { name: 'Headline' })).toHaveValue('From the deck page');
});

test('keyboard shortcuts are listed, and work everywhere', async ({ page }) => {
  await page.goto('/#/todo');
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
  await page.goto('/#/todo');
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
  await page.goto('/#/sheet');
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
  await page.goto('/#/write');
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
  await page.goto('/#/deck');
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
  for (const [app, body, sel, n] of [['draw', 'r,2,1,12,6,1,Box', 'g.shape', 1], ['board', '#To do\nA\nB\n#Done', '.board-card', 2], ['gantt', '1jk,5,1e,Design\n1jp,2,0,Build', '.gantt-chart .bar', 2], ['anim', '9\ntHello\t0,a,a,a', '.anim-stage g.item', 1]] as const) {
    const { encodeEnvelope } = await import('../src/lib/envelope.ts');
    await page.goto('about:blank');
    await page.goto(`/#/v2/${app}/${encodeEnvelope({ created: null, body })}`);
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
  await page.goto('/#/v2/write/' + encodeEnvelope({ created: null, body: `Intro\n@@${draw}` }));
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
  await page.goto('/#/deck');
  await page.getByRole('textbox', { name: 'Headline' }).fill('Spring launch');
  await page.getByRole('button', { name: 'Slide', exact: true }).click();
  await page.getByRole('textbox', { name: 'Headline' }).fill('Plan');
  await page.getByRole('textbox', { name: 'Bullets' }).fill('Build it\nShip it');
  await expect.poll(() => page.url()).toMatch(/#\/v2\/deck\/[YZR]/);
  const editing = page.url();

  // The link that is copied and shared is the one that presents.
  await page.locator('.to-meter').getByRole('button', { name: 'Copy link' }).click();
  const shared = await page.evaluate(() => navigator.clipboard.readText());
  expect(shared).toBe(editing.replace('/#/v2/deck/', '/deck/#/v2/deck.show/'));
  // The editing link is there for collaborators.
  await page.getByRole('button', { name: 'Share' }).click();
  await page.getByRole('menuitem', { name: 'Copy link (opens for editing)' }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(editing.replace('/#/v2/deck/', '/deck/#/v2/deck/'));

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
  // The end of the deck is not the end of the show: they stay on the last slide.
  await page.keyboard.press('ArrowRight');
  await expect(slide).toContainText('Ship it');
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
