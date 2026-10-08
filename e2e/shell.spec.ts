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
