import { test, expect } from '@playwright/test';
import { shot, reopen, navTo, SHOTS, copyLink, privacy } from './helpers';

// Stays: PDF and PNG are drawn through a canvas, which happy-dom lacks (the other formats are in test/dom/shell.test.ts).
test('download views: drawn files, a PDF and a picture, come from the link itself', async ({ page }, testInfo) => {
  await page.route('https://tile.openstreetmap.org/**', (route) => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') }));
  const { encodeEnvelope } = await import('../src/lib/envelope.ts');
  const created = Date.UTC(2026, 0, 2, 3, 4);
  const docs: [string, string, string, string, (bytes: Buffer) => void][] = [
    // Every app can also be a PDF and a picture.
    ['deck', 'pdf', ':rocket:t\nLaunch plan\nSpring\n\nAgenda\none\ntwo', 'launch-plan.pdf', (b) => { expect(b.subarray(0, 8).toString()).toBe('%PDF-1.4'); expect(b.toString('latin1').match(/\/Type \/Page /g)).toHaveLength(3); }],
    ['gantt', 'pdf', '1jk,5,1e,Design\n>1jk,2,2s,Sketch', 'gantt.pdf', (b) => expect(b.subarray(0, 5).toString()).toBe('%PDF-')],
    ['board', 'png', '#To do\nWrite the brief\n#Done', 'board.png', (b) => expect(b.subarray(1, 4).toString()).toBe('PNG')],
    ['trip', 'png', '3xa8g,-fuyo,Lisbon\n40000,0,B', 'lisbon-to-b.png', (b) => expect(b.subarray(1, 4).toString()).toBe('PNG')],
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
});

// Stays: the app's page and its preview card are made by the build and served (the page at work is in test/dom/shell-share.test.ts).
test('each app has a page of its own, with its own preview card', async ({ request }) => {
  const html = await (await request.get('/deck/')).text();
  expect(html).toContain('<title>Deck · TinyLittleOffice</title>');
  expect(html).toMatch(/<meta property="og:image" content="https:\/\/[^"]+\/og\/deck\.png"/);
  expect(html).toMatch(/<link rel="canonical" href="https:\/\/[^"]+\/deck\/"/);
  expect((await request.get('/og/deck.png')).status()).toBe(200);
});

// Stays: the PDF is drawn page by page through a canvas, which happy-dom lacks (the rest is in test/dom/shell.test.ts).
test('Ctrl+P downloads the document as a PDF', async ({ page }) => {
  await page.goto('/#/v0/todo');
  await page.getByRole('textbox', { name: 'New task' }).fill('Ship it');
  await page.keyboard.press('Enter');
  const [pdf] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Control+p')]);
  expect(pdf.suggestedFilename()).toBe('todo.pdf');
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
