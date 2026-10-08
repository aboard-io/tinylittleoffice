import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { shot, reopen, pickOption } from './helpers';

test('a document has a title of its own', async ({ page }) => {
  await page.goto('/#/v0/sheet');
  const title = page.getByRole('textbox', { name: 'Title' });
  // Until it is given one, it says what it is.
  await expect(title).toHaveAttribute('placeholder', 'Untitled Sheet');
  await expect(page).toHaveTitle('Untitled Sheet · TinyLittleOffice');
  await title.fill('Q3 budget');
  await expect(page).toHaveTitle('Q3 budget · TinyLittleOffice');
  await expect.poll(() => page.url()).toMatch(/#\/v0\/sheet\/[WYZR]/);
  await reopen(page);
  await expect(title).toHaveValue('Q3 budget');
  // Downloads are named after it.
  const [file] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Control+s')]);
  expect(file.suggestedFilename()).toBe('q3-budget.xlsx');
  // A deck with no name of its own goes by its first headline.
  await page.goto('/#/v0/deck');
  await page.getByRole('textbox', { name: 'Headline' }).fill('Spring launch');
  await expect(page.getByRole('textbox', { name: 'Title' })).toHaveAttribute('placeholder', 'Spring launch');
  await page.getByRole('textbox', { name: 'Title' }).fill('Board deck');
  await expect(page).toHaveTitle('Board deck · TinyLittleOffice');
});

test('every example in the skill opens as written', async ({ page }) => {
  test.slow();
  await page.route('https://tile.openstreetmap.org/**', (route) => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') }));
  const skill = readFileSync(new URL('../skill/tinyoffice/SKILL.md', import.meta.url), 'utf8');
  const links = [...skill.matchAll(/^\s*https:\/\/tinylittleoffice\.com\/(\w+)\/#(\S+)$/gm)];
  expect(links.length).toBeGreaterThanOrEqual(25);
  for (const [, app, params] of links) {
    await page.goto('about:blank');
    await page.goto(`/${app}/#${params}`);
    await expect(page.locator(`to-${app}`), app).toBeVisible();
    // The plain link has become the compact one, on the app's own page.
    await expect.poll(() => page.url(), app).toMatch(new RegExp(`/${app}/#/v0/${app}/[WYZR][A-Za-z0-9_-]+$`));
    const want = new URLSearchParams(params).get('title')!;
    await expect(page.getByRole('textbox', { name: 'Title' }), app).toHaveValue(want);
    // And it drew something: the picture every other view is made from is not empty.
    const [png] = await Promise.all([page.waitForEvent('download'), page.goto(page.url().replace(`/v0/${app}/`, `/v0/${app}.png/`))]);
    expect(png.suggestedFilename(), app).toMatch(/\.png$/);
    const bytes = readFileSync(await png.path());
    expect(bytes.length, `${app} picture`).toBeGreaterThan(3000);
  }
  // What a few of them say.
  const open = async (app: string) => {
    const [, , params] = links.find((l) => l[1] === app)!;
    await page.goto('about:blank');
    await page.goto(`/${app}/#${params}`);
  };
  await open('sheet');
  await expect(page.locator('.sheet-chart svg rect[rx="2"]')).toHaveCount(3);
  await open('gantt');
  await expect(page.getByLabel('Start of task 1')).toHaveValue('2027-03-01');
  await expect(page.locator('.gantt-chart .bar.parent')).toHaveCount(1);
  await open('cal');
  await expect(page.locator('.cal-agenda li')).toHaveCount(3);
  await open('todo');
  await expect(page.locator('.todo-list li')).toHaveCount(3);
  await expect(page.locator('.todo-list li').nth(0).getByLabel('Due date')).toHaveValue('2027-03-01');
  await open('trip');
  await expect(page.getByLabel('Name of stop 3')).toHaveValue('Porto');
  await expect(page.getByLabel('Note for stop 1')).toHaveValue('Pastel de nata first');
  await open('db');
  await expect(page.locator('.diagram-aside table tbody tr')).toHaveCount(2);
  await expect(page.locator('.diagram-aside')).toContainText('Platform');
  // From the front page, with the app named as a parameter.
  await page.goto('about:blank');
  await page.goto('/#app=org&title=Team&doc=Ada%0A++Ben');
  await expect(page.locator('to-org svg text')).toHaveText(['Ada', 'Ben']);
  // After "?" the document would reach the server, so that form is not understood.
  await page.goto('about:blank');
  await page.goto('/?app=org&doc=Ada');
  await expect(page.locator('to-org')).toHaveCount(0);
  await expect(page.locator('.to-launcher').first()).toBeVisible();
  // The guide itself is served where programs look for it.
  const guide = await (await page.request.get('/llms.txt')).text();
  expect(guide).toContain('# TinyLittleOffice links');
  expect((await page.request.get('/tinyoffice.js')).status()).toBe(200);
});

test('a document can be shown inside another page', async ({ page }) => {
  await page.goto('/deck/#title=Launch+plan&doc=%3Arocket%3At%0ALaunch+plan%0ASpring%0A%0AGoals%0AShip+it');
  await expect(page.locator('to-deck')).toBeVisible();
  // The embed code has the manners of a good embed.
  await page.getByRole('button', { name: 'Share' }).click();
  await page.getByRole('menuitem', { name: 'Copy embed code' }).click();
  const code = await page.evaluate(() => navigator.clipboard.readText());
  expect(code).toMatch(/^<iframe src="http:\/\/localhost:4173\/deck\/#\/v0\/deck\.embed\/[^"]+" title="Launch plan" loading="lazy" referrerpolicy="no-referrer" allowfullscreen style="width:100%;max-width:960px;aspect-ratio:960\/644;[^"]*"><\/iframe>$/);
  // In a page of its own, as the frame will show it: the document, and a way to the editor.
  const src = /src="([^"]+)"/.exec(code)![1];
  await page.setContent(`<h1>Someone else's page</h1>${code.replace('localhost:4173', 'localhost:4173')}`);
  const frame = page.frameLocator('iframe');
  await expect(frame.locator('.to-embedded .pic svg')).toContainText('Launch plan');
  await expect(frame.locator('.to-header')).toHaveCount(0);
  await expect(frame.getByRole('link', { name: 'Open in TinyLittleOffice' })).toHaveAttribute('target', '_blank');
  // More than one page: step through.
  await frame.getByRole('button', { name: 'Next page' }).click();
  await expect(frame.locator('.to-embedded .pic svg')).toContainText('Goals');
  await page.goto('about:blank');
  await page.goto(src);
  await expect(page.locator('.to-embedded .pic svg')).toContainText('Launch plan');
  await shot(page, 'embedded');
});

test('diagram apps: write an outline, get a picture, use it anywhere', async ({ page }) => {
  await page.goto('/#/v0/org');
  const text = page.getByRole('textbox', { name: 'Org chart, as text' });
  await expect(page.locator('to-org .to-empty')).toBeVisible();
  await text.click();
  await page.keyboard.type('Ada | CEO');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Ben | Engineering');
  // Tab puts Ben under Ada.
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Eve | Design');
  await expect(text).toHaveValue('Ada | CEO\n  Ben | Engineering\n  Eve | Design');
  const pic = page.locator('to-org .pic svg');
  await expect(pic.locator('rect')).toHaveCount(3);
  await expect(pic.locator('line')).toHaveCount(2);
  await expect(pic).toContainText('Engineering');
  await reopen(page);
  await expect(pic.locator('rect')).toHaveCount(3);
  await shot(page, 'org');
  // It opens in Draw, where the shapes can be moved by hand.
  await page.getByRole('button', { name: 'Open in Draw' }).click();
  await expect(page.locator('to-draw g.shape')).toHaveCount(5);
  await page.goBack();
  await expect(pic.locator('rect')).toHaveCount(3);

  // The example button fills an empty one in; each app draws its own.
  for (const [app, sel, n] of [['mind', 'rect', 9], ['lanes', 'polygon', 1], ['venn', 'ellipse', 3], ['net', 'line', 5]] as const) {
    await page.goto(`/#/${app}`);
    await page.getByRole('button', { name: 'Start from an example' }).click();
    // (A line has a wide transparent twin, to be tapped: only the drawn ones are counted.)
    await expect(page.locator(`to-${app} .pic svg ${sel}:not([stroke="transparent"])`), app).toHaveCount(n);
    await shot(page, app);
  }
  // The database answers its queries under its schema.
  await page.goto('/#/v0/db');
  await page.getByRole('button', { name: 'Start from an example' }).click();
  await expect(page.locator('.diagram-aside tbody tr')).toHaveCount(2);
  await expect(page.locator('.diagram-aside tbody tr').first()).toHaveText('Platform2');
  await shot(page, 'db');

  // On a slide: chosen from Slide type, it has the slide and builds a shape per click.
  await page.goto('/#/v0/deck');
  await page.getByRole('combobox', { name: 'Add a slide' }).fill('mind');
  await page.getByRole('combobox', { name: 'Add a slide' }).press('Enter');
  const sub = page.locator('sl-dialog.to-sub');
  await sub.getByRole('textbox', { name: 'Mind map, as text' }).fill('Launch\n  Product\n  Marketing');
  await sub.getByRole('button', { name: 'Done' }).click();
  await expect(page.locator('.deck-slide to-embed svg[role="img"] rect')).toHaveCount(3);
  await page.getByRole('button', { name: 'Present' }).click();
  const slide = page.locator('.deck-show .frame > svg');
  await expect(slide.locator('rect')).toHaveCount(0);
  // A thing, the next thing, then the line between them.
  await page.keyboard.press('ArrowRight');
  await expect(slide).toContainText('Launch');
  await expect(slide).not.toContainText('Product');
  await page.keyboard.press('ArrowRight');
  await expect(slide).toContainText('Product');
  await expect(slide.locator('line')).toHaveCount(0);
  await page.keyboard.press('ArrowRight');
  await expect(slide.locator('line')).toHaveCount(1);
  await expect(slide).not.toContainText('Marketing');
  await page.keyboard.press('End');
  await expect(slide).toContainText('Marketing');
});

test('draw: shapes can be joined, and the join follows them', async ({ page, isMobile }) => {
  const { encodeEnvelope } = await import('../src/lib/envelope.ts');
  await page.goto('/#/v0/draw/' + encodeEnvelope({ created: null, body: 'o,4,6,16,8,1b,Web\nc,40,20,14,10,0,Data' }));
  const canvas = page.getByRole('img', { name: 'Drawing canvas' });
  await expect(canvas.locator('g.shape')).toHaveCount(2);
  const centre = async (i: number) => {
    const b = (await canvas.locator('g.shape').nth(i).boundingBox())!;
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  };
  // The join tool: press on one shape, let go on the other.
  await page.getByRole('button', { name: 'Join two shapes' }).click();
  const a = await centre(0);
  const b = await centre(1);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 5 });
  await page.mouse.up();
  await expect(canvas.locator('g.shape')).toHaveCount(3);
  const line = canvas.locator('g.shape').nth(2).locator('line[marker-end]');
  await expect(line).toHaveCount(1);
  const before = await line.getAttribute('x2');
  await page.getByRole('textbox', { name: 'Label' }).fill('reads');
  await expect(canvas).toContainText('reads');
  // Move the cylinder: the join goes with it.
  if (!isMobile) {
    await page.mouse.move(b.x, b.y);
    await page.mouse.down();
    await page.mouse.move(b.x + 80, b.y - 40, { steps: 5 });
    await page.mouse.up();
    await expect.poll(() => line.getAttribute('x2')).not.toBe(before);
  }
  await reopen(page);
  await expect(canvas.locator('g.shape')).toHaveCount(3);
  await expect(canvas).toContainText('reads');
  // More shapes are a menu away.
  await page.getByRole('button', { name: 'Shapes', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Hexagon' }).click();
  const box = (await canvas.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.2, box.y + box.height * 0.8);
  await expect(canvas.locator('g.shape')).toHaveCount(4);
  await shot(page, 'draw-join');
  // Delete a joined shape and its join goes too.
  await canvas.locator('g.shape').nth(0).click();
  await page.keyboard.press('Delete');
  await expect(canvas.locator('g.shape')).toHaveCount(2);
  await expect(canvas.locator('line[marker-end]')).toHaveCount(0);
});

test('deck: any Lucide icon, in one colour for the whole deck', async ({ page }) => {
  await page.goto('/#/v0/deck');
  await page.getByRole('textbox', { name: 'Headline' }).fill('Open to all');
  await page.getByRole('button', { name: 'Icon', exact: true }).click();
  const picker = page.locator('#icon-picker');
  await expect(picker).toContainText(/to find any of 1,\d{3} icons/);
  // An icon that was never in the starter set.
  await picker.locator('sl-input input').fill('accessib');
  await page.getByRole('group', { name: 'Icon library' }).getByRole('button', { name: 'accessibility', exact: true }).click();
  await expect(page.locator('.deck-slide .pick svg')).toBeVisible();
  // One colour for every icon in the deck.
  await page.getByRole('button', { name: 'Icon', exact: true }).click();
  await page.getByRole('radio', { name: 'Red' }).click();
  await picker.getByRole('button', { name: 'Close' }).click();
  const thumb = page.locator('.deck-rail .deck-thumb').first();
  await expect(thumb.locator('g[stroke="#b3261e"]')).toHaveCount(1);
  await reopen(page);
  await expect(thumb.locator('g[stroke="#b3261e"]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Present' }).click();
  await expect(page.locator('.deck-show .frame > svg g[stroke="#b3261e"] path').first()).toBeAttached();
});

test('everything is set in IBM Plex', async ({ page }) => {
  await page.goto('/#/v0/write');
  await page.evaluate(() => document.fonts.ready);
  const fonts = await page.evaluate(() => ({
    body: getComputedStyle(document.body).fontFamily,
    loaded: document.fonts.check("16px 'IBM Plex Sans'") && document.fonts.check("700 16px 'IBM Plex Sans'"),
  }));
  expect(fonts.body).toMatch(/^"?IBM Plex Sans/);
  expect(fonts.loaded).toBe(true);
  await page.goto('/#/v0/sheet');
  await expect(page.getByRole('textbox', { name: 'A1', exact: true })).toHaveCSS('font-family', /IBM Plex Mono/);
});

test('previews are the real thing: a month, a map, a list that fills in', async ({ page }) => {
  await page.route('https://tile.openstreetmap.org/**', (route) => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') }));
  const { encodeEnvelope } = await import('../src/lib/envelope.ts');
  const ref = (app: string, body: string) => `${app}/${encodeEnvelope({ created: null, body })}`;
  const cal = ref('cal', 'd2,2.g,Offsite\ndb,1,Launch\n#g=Sam');
  const trip = ref('trip', '3xa8g,-fuyo,Lisbon\tStart here\n3zkdp,-ep8q,Coimbra');
  const todo = ref('todo', '- Book flights\nx Renew passport\n- Pack');
  // In a text they show whole: the calendar as a month, the trip on its map, every task.
  await page.goto('/#/v0/write/' + encodeEnvelope({ created: null, body: `Plans\n@@${cal}\n@@${trip}\n@@${todo}` }));
  const embeds = page.locator('to-embed');
  await expect(embeds).toHaveCount(3);
  await expect(embeds.nth(0).locator('svg[role="img"]')).toContainText('January 2020');
  await expect(embeds.nth(0).locator('svg[role="img"]')).toContainText('Offsite');
  await expect(embeds.nth(0).locator('svg[role="img"]')).toContainText('Sam');
  expect(await embeds.nth(1).locator('svg[role="img"] image').count()).toBeGreaterThan(3);
  await expect(embeds.nth(1).locator('svg[role="img"]')).toContainText('Coimbra');
  await expect(embeds.nth(1).locator('svg[role="img"]')).toContainText('OpenStreetMap');
  await expect(embeds.nth(2).locator('svg[role="img"]')).toContainText('Pack');
  await shot(page, 'previews');

  // On slides each arrives a piece at a time.
  await page.goto('about:blank');
  await page.goto('/#/v0/deck/' + encodeEnvelope({ created: null, body: `A\n@@${todo}\n\nB\n@@${cal}` }));
  await page.getByRole('button', { name: 'Present' }).click();
  const slide = page.locator('.deck-show .frame > svg');
  await expect(slide).not.toContainText('Book flights');
  await page.keyboard.press('ArrowRight');
  await expect(slide).toContainText('Book flights');
  await expect(slide).not.toContainText('Renew passport');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(slide).toContainText('Pack');
  // Then the calendar: the month is there, and what happens in it arrives.
  await page.keyboard.press('ArrowRight');
  await expect(slide).toContainText('January 2020');
  await expect(slide).not.toContainText('Offsite');
  await page.keyboard.press('ArrowRight');
  await expect(slide).toContainText('Offsite');
  await expect(slide).not.toContainText('Launch');
});

test('calendar: colours, and what they stand for', async ({ page }) => {
  const { encodeEnvelope } = await import('../src/lib/envelope.ts');
  await page.goto('/#/v0/cal/' + encodeEnvelope({ created: null, body: 'd2,2,Offsite' }));
  // Someone else adds their dates in their own colour, and says whose it is.
  await page.getByRole('radiogroup', { name: 'Colour for new spans' }).getByRole('radio', { name: 'Green' }).click();
  await page.getByRole('textbox', { name: 'What this colour stands for' }).fill('Sam');
  await page.getByRole('textbox', { name: 'What this colour stands for' }).press('Tab');
  await page.getByRole('gridcell', { name: '2020-01-10' }).click();
  await page.locator('#label input').fill('Dentist');
  await page.keyboard.press('Enter');
  const chip = page.getByRole('gridcell', { name: '2020-01-10' }).locator('.cal-chip');
  await expect(chip).toHaveClass(/tint/);
  await expect(page.locator('.cal-legend .key')).toHaveText('Sam');
  await reopen(page);
  await expect(chip).toHaveClass(/tint/);
  await expect(page.locator('.cal-legend .key')).toHaveText('Sam');
  // The first span keeps its own colour.
  await expect(page.getByRole('gridcell', { name: '2020-01-03' }).locator('.cal-chip')).not.toHaveClass(/tint/);
  // A span's colour can be changed where it is edited.
  await chip.click();
  await page.getByRole('radiogroup', { name: 'Colour of this span' }).getByRole('radio', { name: 'Red' }).click();
  await expect(chip).toHaveAttribute('style', /b3261e/);
  await shot(page, 'cal-colours');
});

test('draw: zoom, and icons', async ({ page }) => {
  const { encodeEnvelope } = await import('../src/lib/envelope.ts');
  await page.goto('/#/v0/draw/' + encodeEnvelope({ created: null, body: 'o,4,6,16,8,1b,Web' }));
  const canvas = page.getByRole('img', { name: 'Drawing canvas' });
  const width = () => canvas.evaluate((el) => el.getBoundingClientRect().width);
  const fit = await width();
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await page.getByRole('button', { name: 'Zoom in' }).click();
  expect(await width()).toBeCloseTo(fit * 1.5, -1);
  await expect(page.getByRole('button', { name: /^Zoom: 150%/ })).toBeVisible();
  // Shapes are still where the pointer says they are.
  await canvas.locator('g.shape').first().click();
  await expect(page.getByRole('textbox', { name: 'Label' })).toHaveValue('Web');
  await page.getByRole('button', { name: /^Zoom: 150%/ }).click();
  expect(await width()).toBeCloseTo(fit, -1);
  await page.getByRole('button', { name: 'Zoom out' }).click();
  expect(await width()).toBeCloseTo(fit * 0.75, -1);
  await page.getByRole('button', { name: /^Zoom: 75%/ }).click();

  // An icon in front of the selected shape's label.
  await canvas.locator('g.shape').first().click();
  await page.getByRole('button', { name: 'Icon', exact: true }).click();
  await page.locator('sl-dialog.to-icons sl-input input').fill('globe');
  await page.locator('sl-dialog.to-icons').getByRole('button', { name: 'globe', exact: true }).click();
  await expect(canvas.locator('g.shape').first().locator('g[stroke-linecap="round"]')).toHaveCount(1);
  await expect(canvas).toContainText('Web');
  // And one on its own: pick it, then click where it goes.
  await page.keyboard.press('Escape');
  await canvas.click({ position: { x: 5, y: 5 } });
  await page.getByRole('button', { name: 'Icon', exact: true }).click();
  await page.locator('sl-dialog.to-icons sl-input input').fill('accessib');
  await page.locator('sl-dialog.to-icons').getByRole('button', { name: 'accessibility', exact: true }).click();
  await expect(page.locator('sl-dialog.to-icons')).toHaveCount(0);
  const box = (await canvas.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.6);
  await expect(canvas.locator('g.shape')).toHaveCount(2);
  await reopen(page);
  await expect(canvas.locator('g.shape')).toHaveCount(2);
  await expect(canvas.locator('g[stroke-linecap="round"]')).toHaveCount(2);
  await shot(page, 'draw-icons');
  // The diagram apps take icons too: one click puts ":name" on the line.
  await page.goto('/#/v0/org');
  const text = page.getByRole('textbox', { name: 'Org chart, as text' });
  await text.fill('Ada | CEO');
  await page.getByRole('button', { name: 'Icon', exact: true }).click();
  await page.locator('sl-dialog.to-icons sl-input input').fill('crown');
  await page.locator('sl-dialog.to-icons').getByRole('button', { name: 'crown', exact: true }).click();
  await expect(text).toHaveValue(':crown Ada | CEO');
  await expect(page.locator('to-org .pic svg g[stroke-linecap="round"]')).toHaveCount(1);
});

test('page apps: a site, a store with a cart, an invoice', async ({ page }) => {
  // What downloads is the page itself, whole.
  await page.goto('/#/v0/site');
  await page.getByRole('button', { name: 'Start from an example' }).click();
  await page.getByRole('button', { name: 'Download' }).click();
  const [file] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: /Web page/ }).click()]);
  const html = readFileSync(await file.path(), 'utf8');
  expect(file.suggestedFilename()).toBe('harbor-coffee.html');
  expect(html).toContain('<h1>Harbor Coffee</h1>');

  // A site.
  await page.goto('/#/v0/site');
  await page.getByRole('button', { name: 'Start from an example' }).click();
  const site = page.frameLocator('to-site iframe');
  await expect(site.getByRole('heading', { level: 1 })).toHaveText('Harbor Coffee');
  await expect(site.locator('ul.cards li')).toHaveCount(6);
  await expect(site.locator('header a')).toHaveText(['Home', 'Menu', 'Find us']);
  await shot(page, 'site');

  // A store: things go in the cart, and the total adds up.
  await page.goto('/#/v0/store');
  await page.getByRole('button', { name: 'Start from an example' }).click();
  const store = page.frameLocator('to-store iframe');
  await expect(store.getByRole('button', { name: /^Add .* to the cart$/ })).toHaveCount(4);
  await expect(store.getByRole('button', { name: 'Send order by email' })).toBeDisabled();
  await store.getByRole('button', { name: 'Add House blend, 250g to the cart' }).click();
  await store.getByRole('button', { name: 'Add House blend, 250g to the cart' }).click();
  await store.getByRole('button', { name: 'Add Tin mug to the cart' }).click();
  await expect(store.locator('#count')).toHaveText('3');
  await expect(store.locator('#total')).toHaveText('$34.00');
  await store.getByRole('button', { name: 'One fewer House blend, 250g' }).click();
  await expect(store.locator('#total')).toHaveText('$21.50');
  await expect(store.getByRole('button', { name: 'Send order by email' })).toBeEnabled();
  await shot(page, 'store');

  // An invoice: the sums are done, and the PDF is the invoice.
  await page.goto('/#/v0/invoice');
  await page.getByRole('button', { name: 'Start from an example' }).click();
  await expect(page.frameLocator('to-invoice iframe').locator('tfoot tr').last()).toContainText('$5,486.40');
  await expect(page).toHaveTitle('Invoice 0042 · TinyLittleOffice');
  const [pdf] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Control+p')]);
  expect(pdf.suggestedFilename()).toBe('invoice-0042.pdf');
  expect(readFileSync(await pdf.path()).subarray(0, 5).toString()).toBe('%PDF-');
  await shot(page, 'invoice');
});

test('contract: two people, two browsers, two signatures', async ({ page, browser }) => {
  await page.goto('/#/v0/contract');
  await page.getByRole('textbox', { name: 'Contract, as text' }).fill('# Dog-walking agreement\nSam walks Biscuit every weekday.');
  const signatures = (p: typeof page) => p.locator('.contract-sign li:not(.none)');
  await page.getByRole('textbox', { name: 'Your name' }).fill('Paul');
  await page.getByRole('button', { name: 'Sign', exact: true }).click();
  await expect(signatures(page)).toHaveCount(1);
  await expect(signatures(page).first()).toContainText('Signed these exact words');
  await expect.poll(() => page.url()).toMatch(/#\/v0\/contract\/[WYZR]/);
  const sent = page.url();

  // The other party, in a browser of their own (so a key of their own), opens what was sent.
  const other = await (await browser.newContext()).newPage();
  await other.goto(sent);
  await expect(signatures(other)).toHaveCount(1);
  await expect(signatures(other).first()).toContainText('Paul');
  await expect(signatures(other).first()).toHaveClass(/ok/);
  await other.getByRole('textbox', { name: 'Your name' }).fill('Sam');
  await other.getByRole('button', { name: 'Sign', exact: true }).click();
  await expect(signatures(other)).toHaveCount(2);
  await expect(other.locator('.contract-sign li.ok')).toHaveCount(2);
  const both = other.url();
  // Two different keys signed.
  const marks = await other.locator('.contract-sign li code').allTextContents();
  expect(new Set(marks).size).toBe(2);

  // Back with the first party: both signatures hold; change a word and neither does.
  await page.goto('about:blank');
  await page.goto(both);
  await expect(page.locator('.contract-sign li.ok')).toHaveCount(2);
  await expect(page.frameLocator('to-contract iframe').locator('.signed div')).toHaveCount(2);
  await shot(page, 'contract');
  await page.getByRole('textbox', { name: 'Contract, as text' }).fill('# Dog-walking agreement\nSam walks Biscuit every weekend.');
  await expect(page.locator('.contract-sign li.bad')).toHaveCount(2);
  await expect(page.locator('.contract-sign li.bad').first()).toContainText('have changed since');
  await other.close();
});

test('room for a link says when length does not matter', async ({ page }) => {
  await page.goto('/#/v0/write');
  await page.getByRole('textbox', { name: 'Document' }).click();
  await page.keyboard.type('Some words. '.repeat(20));
  await page.locator('.to-meter sl-progress-ring').click();
  const rooms = page.locator('#doc-dialog .to-rooms tbody tr');
  // Bluesky shows a short form of any link, so the document can grow without using up a post.
  await expect(rooms.filter({ hasText: 'Bluesky' })).toContainText('any length');
  await expect(rooms.filter({ hasText: 'Discord' })).toContainText(/\d/);
});

test('zine: eight pages, a sheet to print either way, and a page to tap through', async ({ page }) => {
  await page.goto('/#/v0/zine');
  await expect(page.locator('.deck-thumb')).toHaveCount(8);
  // The page is typed on as a slide is, in its own shape: a cover, centred.
  await expect(page.locator('.deck-slide.print.cover')).toBeVisible();
  await page.getByRole('textbox', { name: 'Headline' }).fill('Small Joys');
  await page.getByRole('textbox', { name: 'Headline' }).press('Enter');
  await expect(page.getByRole('textbox', { name: 'Words' })).toBeFocused();
  await page.keyboard.type('Issue one');
  await page.getByRole('button', { name: 'Page 2' }).click();
  await page.getByRole('textbox', { name: 'Headline' }).fill('Coffee');
  // However much is written, it stays on its page: the type shrinks.
  // (The rail draws the page as it will print. The last text on it is its number; the one before it is the last line of the words.)
  const size = () => page.locator('.deck-thumb[aria-current="true"] > svg').evaluate((svg) => parseFloat(getComputedStyle([...svg.querySelectorAll('text')].at(-2)!).fontSize));
  await expect(page.locator('.deck-slide.print.prose')).toBeVisible();
  await page.getByRole('textbox', { name: 'Words' }).fill('Short.');
  const big = await size();
  await page.getByRole('textbox', { name: 'Words' }).fill('The first cup of the day, before anyone else is up. '.repeat(14));
  expect(await size()).toBeLessThan(big);
  // (Measured at the page's own size: on a phone the rail draws it so small that the rounding of three-pixel type decides.)
  const fits = await page.locator('.deck-thumb[aria-current="true"] > svg').evaluate((svg) => {
    const [, , w, h] = svg.getAttribute('viewBox')!.split(' ').map(Number);
    Object.assign((svg as SVGSVGElement).style, { width: `${w}px`, height: `${h}px` });
    const box = svg.getBoundingClientRect();
    return [...svg.querySelectorAll('text')].every((t) => t.getBoundingClientRect().bottom <= box.bottom + 1 && t.getBoundingClientRect().right <= box.right + 1);
  });
  expect(fits).toBe(true);
  // A page can hold another document.
  await page.getByRole('button', { name: 'Page 3' }).click();
  await page.getByRole('combobox', { name: 'Insert' }).fill('poll');
  await page.getByRole('combobox', { name: 'Insert' }).press('Enter');
  const sub = page.locator('sl-dialog.to-sub');
  await sub.getByRole('textbox', { name: 'Poll, as text' }).fill('# Rain on the roof?\n- Fresh bread\n- Soup');
  await sub.getByRole('button', { name: 'Done' }).click();
  await expect(page.locator('.deck-thumb[aria-current="true"] > svg')).toContainText('Fresh bread');
  await expect(page.locator('.deck-slide to-embed')).toHaveCount(1);
  // Pages move as slides do.
  await page.getByRole('button', { name: 'Move page up' }).click();
  await expect(page.locator('.deck-thumb').nth(1)).toContainText('Fresh bread');
  await page.getByRole('button', { name: 'Move page down' }).click();
  await expect(page.locator('.deck-thumb').nth(1)).toContainText('Coffee');
  await reopen(page);
  await expect(page.locator('.deck-thumb').first()).toContainText('Small Joys');
  await expect(page).toHaveTitle('Small Joys · TinyLittleOffice');
  await shot(page, 'zine');

  // One-sided: one sheet, eight pages, the top row upside down.
  await page.getByRole('button', { name: 'See the sheet to print' }).click();
  await expect(page.locator('.zine-sheet')).toHaveCount(1);
  await expect(page.locator('.zine-sheet svg g[transform^="rotate(180"]')).toHaveCount(4);
  await shot(page, 'zine-sheet');
  const [one] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Control+p')]);
  expect(one.suggestedFilename()).toBe('small-joys.pdf');
  const pdf1 = readFileSync(await one.path()).toString('latin1');
  // Letter paper, on its side: 11 by 8.5 inches.
  expect(pdf1).toContain('/MediaBox [0 0 792 612]');
  expect(pdf1.match(/\/Type \/Page\b/g)!.length).toBe(1);
  // Two-sided: two sides, upright.
  await pickOption(page, 'sl-select.zine-sides', 'two');
  await expect(page.locator('.zine-sheet')).toHaveCount(2);
  await expect(page.locator('.zine-sheet svg g[transform^="rotate(180"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Download' }).click();
  const [two] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: /^PDF/ }).click()]);
  const pdf2 = readFileSync(await two.path()).toString('latin1');
  expect(pdf2).toContain('/MediaBox [0 0 612 792]');
  expect(pdf2.match(/\/Type \/Page\b/g)!.length).toBe(2);
  await reopen(page);
  await expect(page.locator('sl-select.zine-sides')).toHaveJSProperty('value', 'two');

  // The web page is the zine to read: tap to turn.
  await page.getByRole('button', { name: 'Download' }).click();
  const [file] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: /Web page/ }).click()]);
  const html = readFileSync(await file.path(), 'utf8');
  await page.setContent(html);
  await expect(page.locator('section.on')).toHaveAttribute('aria-label', 'Front cover');
  await expect(page.locator('#where')).toHaveText('1 / 8');
  const wide = page.viewportSize()!.width;
  await page.locator('#pages').click({ position: { x: wide * 0.8, y: 200 } });
  await expect(page.locator('section.on')).toContainText('Coffee');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('section.on')).toContainText('Fresh bread');
  await page.locator('#pages').click({ position: { x: 20, y: 200 } });
  await expect(page.locator('#where')).toHaveText('2 / 8');
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('button', { name: 'Back' })).toBeDisabled();
});

test('paper that folds: a booklet grows, a brochure prints in order', async ({ page }) => {
  await page.goto('/#/v0/booklet');
  await expect(page.locator('.deck-thumb')).toHaveCount(8);
  await page.getByRole('textbox', { name: 'Headline' }).fill('Field Notes');
  await page.getByRole('button', { name: 'Four more pages' }).click();
  await expect(page.locator('.deck-thumb')).toHaveCount(12);
  await page.getByRole('button', { name: 'Page 11' }).click();
  await page.getByRole('textbox', { name: 'Headline' }).fill('Nearly the end');
  await reopen(page);
  await expect(page.locator('.deck-thumb')).toHaveCount(12);
  // Pages with something on them are not taken away.
  await expect(page.getByRole('button', { name: 'Four fewer pages' })).toBeDisabled();
  await page.getByRole('button', { name: 'See the sheet to print' }).click();
  // Three sheets, both sides of each.
  await expect(page.locator('.zine-sheet')).toHaveCount(6);
  await expect(page.locator('.zine-sheet').first()).toContainText('Field Notes');
  await shot(page, 'booklet');
  await page.getByRole('button', { name: 'Download' }).click();
  const [file] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: /^PDF/ }).click()]);
  const pdf = readFileSync(await file.path()).toString('latin1');
  expect(pdf).toContain('/MediaBox [0 0 792 612]');
  expect(pdf.match(/\/Type \/Page\b/g)!.length).toBe(6);

  await page.goto('/#/v0/brochure');
  await expect(page.locator('.deck-thumb')).toHaveCount(6);
  await page.getByRole('textbox', { name: 'Headline' }).fill('Visit the quay');
  await page.getByRole('button', { name: 'See the sheet to print' }).click();
  await expect(page.locator('.zine-sheet')).toHaveCount(2);
  await shot(page, 'brochure');
});

test('things to print: write a few lines, get the sheets', async ({ page }) => {
  for (const [app, name, has] of [
    ['menu', 'Menu', 'Flat white'],
    ['resume', 'Résumé', 'Ada Lovelace'],
  ] as const) {
    await page.goto(`/#/${app}`);
    await page.getByRole('button', { name: 'Start from an example' }).click();
    await expect(page.getByRole('img', { name: `${name}, sheet 1` }), app).toContainText(has);
    await shot(page, app);
  }
  // A poster is a page typed into directly, laid out like a slide; its page type is a template.
  await page.goto('/#/v0/poster');
  await page.getByRole('textbox', { name: 'Headline' }).fill('Yard sale');
  await page.getByRole('textbox', { name: 'Words' }).fill('Saturday 9am');
  const drawn = page.locator('.deck-thumb[aria-current="true"] > svg');
  await expect(drawn).toContainText('Saturday 9am');
  await expect(page).toHaveTitle('Yard sale · TinyLittleOffice');
  await pickOption(page, 'sl-select.zine-layout', '2');
  await page.getByRole('textbox', { name: 'Right column' }).fill('Books\nLamps');
  await expect(drawn).toContainText('Lamps');
  await shot(page, 'poster');
  // Badges and recipe cards: a page per person or dish, added one at a time, tiled on the sheets.
  await page.goto('/#/v0/badges');
  await page.getByRole('textbox', { name: 'Headline' }).fill('Grace Hopper');
  await page.getByRole('textbox', { name: 'Words' }).fill('Compilers');
  await page.getByRole('button', { name: 'Another badge' }).click();
  await expect(page.locator('.deck-thumb')).toHaveCount(3);
  // The new badge goes in after the one being written, and can go again.
  await expect(page.locator('.deck-thumb').nth(1)).toHaveAttribute('aria-current', 'true');
  await page.getByRole('button', { name: 'Remove this badge' }).click();
  await expect(page.locator('.deck-thumb')).toHaveCount(2);
  await page.getByRole('button', { name: 'See the sheet to print' }).click();
  await expect(page.locator('.zine-sheet')).toHaveCount(1);
  await expect(page.locator('.zine-sheet')).toContainText('Grace Hopper');
  // The PDF is a button away, in the Print group.
  const [pdf] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /^PDF/ }).click()]);
  expect(pdf.suggestedFilename()).toBe('grace-hopper.pdf');
  await page.goto('/#/v0/recipes');
  await page.getByRole('textbox', { name: 'Headline' }).fill('Cardamom buns');
  await page.getByRole('button', { name: 'Another card' }).click();
  await expect(page.locator('.deck-thumb')).toHaveCount(3);
  await page.goto('/#/v0/poster');
  await page.getByRole('textbox', { name: 'Headline' }).fill('Yard sale');
  await page.getByRole('textbox', { name: 'Words' }).fill('Saturday 9am');
  await expect(drawn).toContainText('Saturday 9am');
  await reopen(page);
  await page.getByRole('button', { name: 'Download' }).click();
  const [file] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: /^PDF/ }).click()]);
  expect(file.suggestedFilename()).toBe('yard-sale.pdf');
  expect(readFileSync(await file.path()).toString('latin1')).toContain('/MediaBox [0 0 612 792]');
});

test('comic: pages like a zine, each built from panels', async ({ page }) => {
  await page.goto('/#/v0/comic');
  await expect(page.locator('.deck-thumb')).toHaveCount(8);
  await page.getByRole('textbox', { name: 'Headline' }).fill('Biscuit Goes Out');
  await page.getByRole('button', { name: 'Page 2' }).click();
  // A panel: a picture, what is said, a caption, typed into on the page.
  await page.getByRole('button', { name: 'Add a panel' }).click();
  await expect(page.locator('.deck-slide.comic .comic-panels li')).toHaveCount(1);
  await page.getByRole('textbox', { name: 'What is said, panel 1' }).fill('Walk?');
  await page.getByRole('textbox', { name: 'Caption, panel 1' }).fill('Monday, noon.');
  await page.getByRole('button', { name: 'Picture, panel 1' }).click();
  await page.locator('sl-dialog.to-icons sl-input input').fill('dog');
  await page.locator('sl-dialog.to-icons').getByRole('button', { name: 'dog', exact: true }).click();
  await page.getByRole('button', { name: 'Add a panel' }).click();
  await page.getByRole('textbox', { name: 'What is said, panel 2' }).fill('WALK!');
  const drawn = page.locator('.deck-thumb[aria-current="true"] > svg');
  await expect(drawn).toContainText('Walk?');
  await expect(drawn).toContainText('Monday, noon.');
  await expect(drawn.locator('rect[stroke-width="1.5"]')).toHaveCount(2);
  await reopen(page);
  await expect(page.locator('.deck-thumb').first()).toContainText('Biscuit');
  await page.getByRole('button', { name: 'Page 2' }).click();
  await expect(page.getByRole('textbox', { name: 'What is said, panel 2' })).toHaveValue('WALK!');
  await page.getByRole('button', { name: 'Remove panel 1' }).click();
  await expect(drawn.locator('rect[stroke-width="1.5"]')).toHaveCount(1);
  await expect(page.getByRole('textbox', { name: 'What is said, panel 1' })).toHaveValue('WALK!');
  await shot(page, 'comic');
  await page.getByRole('button', { name: 'See the sheet to print' }).click();
  await expect(page.locator('.zine-sheet')).toHaveCount(1);
  await expect(page.locator('.zine-sheet')).toContainText('WALK!');
});

test('stock and flow: sliders move the diagram', async ({ page }) => {
  await page.goto('/#/v0/flow');
  await page.getByRole('button', { name: 'Start from an example' }).click();
  const model = page.frameLocator('to-flow iframe');
  await expect(model.locator('input[type="range"]')).toHaveCount(4);
  await expect(model.locator('svg path')).toHaveCount(6);
  await expect(model.locator('svg rect')).toHaveCount(7);
  // Every stock says how much is in it.
  await expect(model.locator('svg')).toContainText('Signups');
  await expect(model.locator('#say')).toContainText('Signups 1,200');
  const band = () => model.locator('svg path').first().getAttribute('stroke-width').then(Number);
  const before = await band();
  // More people sign up: the number changes, and the band to Signups thickens.
  await model.locator('#s_signup_rate').fill('30');
  await expect(model.locator('#o_signup_rate')).toHaveText('30%');
  await expect(model.locator('#say')).toContainText('Signups 6,000');
  await expect(model.locator('#say')).toContainText('Paying 1,500');
  expect(await band()).toBeGreaterThan(before * 3);
  await shot(page, 'flow');
});

test('pixel art: colour squares by clicking, dragging and from the keyboard', async ({ page }) => {
  await page.goto('/#/v0/pixel');
  const cell = (r: number, c: number) => page.getByRole('gridcell', { name: new RegExp(`^Row ${r}, column ${c}:`) });
  await expect(page.getByRole('gridcell')).toHaveCount(256);
  await cell(1, 1).click();
  await expect(cell(1, 1)).toHaveAccessibleName('Row 1, column 1: Black');
  await page.getByRole('radio', { name: 'Red' }).click();
  // Drag across a row.
  const [a, b] = [(await cell(3, 2).boundingBox())!, (await cell(3, 6).boundingBox())!];
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
  await page.mouse.up();
  for (const c of [2, 3, 4, 5, 6]) await expect(cell(3, c)).toHaveAccessibleName(`Row 3, column ${c}: Red`);
  // Arrow keys move; Enter colours.
  await cell(1, 1).focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(cell(2, 2)).toHaveAccessibleName('Row 2, column 2: Red');
  await page.getByRole('radio', { name: 'Eraser' }).click();
  await cell(1, 1).click();
  await expect(cell(1, 1)).toHaveAccessibleName('Row 1, column 1: empty');
  await reopen(page);
  await expect(cell(3, 4)).toHaveAccessibleName('Row 3, column 4: Red');
  await expect(cell(1, 1)).toHaveAccessibleName('Row 1, column 1: empty');
  await shot(page, 'pixel');
  // Tools: a box dragged out, a line, a fill; and the picture at its own size beside the grid.
  await page.getByRole('radio', { name: 'Indigo' }).click();
  await page.getByRole('button', { name: 'Box', exact: true }).click();
  const drag = async (r1: number, c1: number, r2: number, c2: number) => {
    const [a, b] = [(await cell(r1, c1).boundingBox())!, (await cell(r2, c2).boundingBox())!];
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 6 });
    await page.mouse.up();
  };
  await drag(6, 6, 9, 10);
  await expect(cell(6, 8)).toHaveAccessibleName('Row 6, column 8: Indigo');
  await expect(cell(9, 6)).toHaveAccessibleName('Row 9, column 6: Indigo');
  await expect(cell(7, 8)).toHaveAccessibleName('Row 7, column 8: empty');
  await page.getByRole('button', { name: 'Fill', exact: true }).click();
  await page.getByRole('radio', { name: 'Yellow' }).click();
  await cell(7, 8).click();
  await expect(cell(8, 9)).toHaveAccessibleName('Row 8, column 9: Yellow');
  await expect(cell(12, 12)).toHaveAccessibleName('Row 12, column 12: empty');
  await page.getByRole('button', { name: 'Line', exact: true }).click();
  await drag(12, 1, 12, 8);
  await expect(cell(12, 5)).toHaveAccessibleName('Row 12, column 5: Yellow');
  // (One square per coloured cell, and the page's own white behind them.)
  await expect(page.locator('.pixel-preview .big svg rect')).toHaveCount((await page.locator('.pixel-grid button[style*="background"]').count()) + 1);
  await shot(page, 'pixel-tools');
});

test('small apps: games and things to share work as pages', async ({ page }) => {
  const open = async (app: string) => {
    await page.goto(`/#/${app}`);
    await page.getByRole('button', { name: 'Start from an example' }).click();
    return page.frameLocator(`to-${app} iframe`);
  };
  // An adventure: choices lead on, endings start again.
  let f = await open('adventure');
  await f.getByRole('button', { name: 'Climb to the lamp' }).click();
  await f.getByRole('button', { name: 'Light it' }).click();
  await expect(f.locator('#scene')).toContainText('The end.');
  await f.getByRole('button', { name: 'Start again' }).click();
  await expect(f.getByRole('button', { name: 'Run to the village' })).toBeVisible();
  // A hunt: the right answer opens the next clue; a wrong one does not.
  f = await open('hunt');
  await f.getByRole('textbox', { name: 'Your answer' }).fill('blue');
  await f.getByRole('button', { name: 'Try it' }).click();
  await expect(f.locator('#say')).toHaveText('Not that. Look again.');
  await f.getByRole('textbox', { name: 'Your answer' }).fill(' Red ');
  await f.getByRole('button', { name: 'Try it' }).click();
  await expect(f.locator('#clues li')).toHaveCount(2);
  await expect(f.locator('#clues li').last()).toContainText('count the stairs');
  // Trivia keeps score.
  f = await open('trivia');
  await f.getByRole('button', { name: 'Give Blues a point' }).click();
  await f.getByRole('button', { name: 'Give Blues a point' }).click();
  await expect(f.locator('.team', { hasText: 'Blues' }).locator('output')).toHaveText('2');
  await f.getByText('What is the capital of Portugal?').click();
  await expect(f.getByText('Lisbon')).toBeVisible();
  // Blanks are filled in before the story is seen.
  f = await open('madlibs');
  for (const [i, w] of ['purple', 'llama', 'the moon', 'spoons', 'danced'].entries()) await f.locator('form input').nth(i).fill(w);
  await f.getByRole('button', { name: 'Tell the story' }).click();
  await expect(f.locator('#story')).toContainText('my purple boss arrived riding a llama');
  // The wheel picks someone.
  f = await open('spinner');
  await f.getByRole('button', { name: 'Spin' }).click();
  await expect(f.locator('#won')).toHaveText(/Ada|Grace|Alan|Margaret|Linus|Barbara/, { timeout: 8000 });
  // A card turns over.
  f = await open('flashcards');
  await expect(f.locator('#card')).toHaveText('bom dia');
  await f.locator('#card').click();
  await expect(f.locator('#card')).toHaveText('good morning');
  await f.getByRole('button', { name: 'Next' }).click();
  await expect(f.locator('#card')).toHaveText('obrigado');
  // A poll counts; adding a line adds a vote.
  f = await open('poll');
  await expect(f.locator('li', { hasText: 'Tacos' }).locator('.top span').last()).toHaveText('2');
  const text = page.getByRole('textbox', { name: 'Poll, as text' });
  await text.fill((await text.inputValue()) + '\nGrace: Sushi');
  await expect(f.locator('li', { hasText: 'Sushi' }).locator('.top span').last()).toHaveText('2');
  // Secret Santa: the organiser gets a link per person; each shows one draw only.
  f = await open('santa');
  await expect(f.locator('.links li')).toHaveCount(5);
  const adas = await f.locator('.links li', { hasText: 'Ada' }).getByRole('link').getAttribute('href');
  await page.goto(adas!.replace(/^https?:\/\/[^/]+\//, '/'));
  f = page.frameLocator('to-santa iframe');
  await expect(f.locator('main')).toContainText('Ada, this link is yours alone');
  await expect(f.locator('main')).not.toContainText('their link');
  await f.getByRole('button', { name: 'Show me who I give to' }).click();
  await expect(f.locator('#who')).toContainText(/^You give to (Grace|Alan|Margaret|Linus)\.$/);
  // The bill, settled.
  f = await open('split');
  await expect(f.locator('.pay')).toHaveText(['Grace pays Paul 92.88', 'Ada pays Paul 47.88', 'Sam pays Paul 6.38']);
  f = await open('log');
  await expect(f.locator('.sums div').first()).toContainText('22.5 km');
  // And the ones that print or draw.
  for (const [app, name, has] of [['wordsearch', 'Word search', 'espresso']] as const) {
    await page.goto(`/#/${app}`);
    await page.getByRole('button', { name: 'Start from an example' }).click();
    await expect(page.getByRole('img', { name: `${name}, sheet 1` }), app).toContainText(has);
    await shot(page, app);
  }
  for (const [app, n] of [['floor', 6], ['seating', 18], ['family', 6], ['timeline', 10]] as const) {
    await page.goto(`/#/${app}`);
    await page.getByRole('button', { name: 'Start from an example' }).click();
    await expect(page.locator(`to-${app} .pic > svg g.pick, to-${app} .pic > svg g.shape`).first(), app).toBeVisible();
    await expect(page.locator(`to-${app} .pic > svg text`).first(), app).toBeVisible();
    expect(n).toBeGreaterThan(0);
    await shot(page, app);
  }
});

test('the library: documents are kept on the device, in folders, once asked', async ({ page }) => {
  // Private unless asked: nothing written at all.
  await page.goto('/#/v0/write');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('.to-keep')).toHaveText('Private');
  await page.getByRole('textbox', { name: 'Document' }).click();
  await page.keyboard.type('Nothing kept of this');
  await page.goto('/#/');
  await expect(page.locator('.to-library')).toHaveCount(0);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  await page.goto('/#/v0/write');
  await page.locator('.to-keep').click();
  await expect(page.locator('.to-keep')).toHaveText('Saved');
  // (The suite's own preference, cleared above with the rest: links open for editing.)
  await page.evaluate(() => localStorage.setItem('tinyoffice.open', 'edit'));
  await page.goto('about:blank');
  await page.goto('/#/v0/write');
  await page.getByRole('textbox', { name: 'Document' }).click();
  await page.keyboard.type('Notes from the quay');
  await page.getByRole('textbox', { name: 'Title' }).fill('Quay notes');
  await page.getByRole('textbox', { name: 'Title' }).press('Enter');
  await page.goto('/#/v0/todo');
  await page.getByRole('textbox', { name: 'New task' }).fill('Buy milk');
  await page.keyboard.press('Enter');
  await expect.poll(() => page.url()).toMatch(/#\/v0\/todo\/[WYZR]/);
  // Home glimpses them; Drive holds them, each in a folder named for its app.
  await page.goto('/#/');
  await expect(page.locator('.to-library').getByRole('link', { name: /Quay notes/ })).toBeVisible();
  await page.locator('.to-library').getByRole('link', { name: /Drive, all 2/ }).click();
  const drive = page.locator('to-drive');
  const folders = drive.locator('.drive-nav nav a .name');
  await expect(folders).toHaveText(['Everything', 'Todo', 'Write']);
  await expect(drive.getByRole('link', { name: /Quay notes/ })).toBeVisible();
  // Into a folder of your own, nested with a slash.
  page.once('dialog', (d) => d.accept('Harbor/Plans'));
  await drive.getByRole('button', { name: 'Move Quay notes to another folder' }).click();
  await expect(folders).toHaveText(['Everything', 'Harbor', 'Plans', 'Todo']);
  await drive.locator('.drive-nav nav a', { hasText: 'Plans' }).click();
  await expect(drive.locator('h1')).toContainText('Harbor/Plans');
  await expect(drive.locator('.drive-list li')).toHaveCount(1);
  // Search looks inside the documents, not only at their titles.
  await drive.getByRole('searchbox', { name: 'Search your documents' }).fill('milk');
  await expect(drive.locator('.drive-list li')).toHaveCount(1);
  await expect(drive.locator('.drive-list li')).toContainText('Todo');
  await drive.getByRole('searchbox', { name: 'Search your documents' }).fill('');
  // It opens as it was left; changing it keeps it in its folder.
  await drive.getByRole('link', { name: /Quay notes/ }).click();
  await expect(page.getByRole('textbox', { name: 'Document' })).toContainText('Notes from the quay');
  await page.getByRole('textbox', { name: 'Document' }).click();
  await page.keyboard.press('End');
  await page.keyboard.type(', and more');
  await page.goto('about:blank');
  await page.goto('/#/drive');
  await expect(folders).toHaveText(['Everything', 'Harbor', 'Plans', 'Todo']);
  await drive.getByRole('link', { name: /Quay notes/ }).click();
  await expect(page.getByRole('textbox', { name: 'Document' })).toContainText('and more');
  await page.goto('/#/drive');
  await shot(page, 'drive');
  // Rename a folder; remove a document.
  page.once('dialog', (d) => d.accept('Harbour'));
  await drive.getByRole('button', { name: 'Rename Harbor', exact: true }).click();
  await expect(folders).toHaveText(['Everything', 'Harbour', 'Plans', 'Todo']);
  await drive.getByRole('button', { name: 'Remove Quay notes from this device' }).click();
  await expect(folders).toHaveText(['Everything', 'Todo']);
  await expect(drive).toContainText('Saved only on this device');
  // All of them at once; the links still open.
  const todo = await drive.getByRole('link', { name: /Untitled Todo/ }).getAttribute('href');
  page.once('dialog', (d) => d.accept());
  await drive.getByRole('button', { name: 'Blow it all away' }).click();
  await expect(drive.locator('.drive-list li')).toHaveCount(0);
  await page.goto(todo!);
  await expect(page.locator('to-todo')).toContainText('Buy milk');
});

test('the menu finds an app by name', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu' }).click();
  const drawer = page.locator('#nav-drawer');
  await drawer.getByRole('searchbox', { name: 'Find an app' }).fill('zin');
  await expect(drawer.locator('.to-drawer-nav a:not([hidden])')).toHaveText(['Zine']);
  await drawer.getByRole('searchbox', { name: 'Find an app' }).fill('play');
  await expect(drawer.locator('.to-drawer-nav a:not([hidden])')).toHaveCount(7);
  await drawer.getByRole('searchbox', { name: 'Find an app' }).fill('poll');
  await page.keyboard.press('Enter');
  await expect(page.locator('to-poll')).toBeVisible();
});

test('a map on a slide: a tap on the map goes to the next stop', async ({ page }) => {
  const { encodeEnvelope } = await import('../src/lib/envelope.ts');
  const trip = `trip/${encodeEnvelope({ created: null, body: '3xa8g,-fuyo,Lisbon\tStart here\n3zkdp,-ep8q,Coimbra\n40000,0,Porto' })}`;
  await page.goto('/#/v0/deck/' + encodeEnvelope({ created: null, body: `Trip\n@@${trip}\n\nAfter\ndone` }));
  await page.getByRole('button', { name: 'Present' }).click();
  const map = page.locator('.deck-show .deck-map');
  await expect(map).toBeVisible();
  const box = (await map.boundingBox())!;
  // Taps land on the slide even over the map: stop by stop, then the next slide.
  // (Spaced out: a quick second tap means "show me the whole slide".)
  const tap = async () => {
    await page.waitForTimeout(450);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  };
  for (let i = 0; i < 3; i++) await tap();
  await expect(map.locator('.leaflet-popup').last()).toContainText('3. Porto');
  await tap();
  await expect(page.locator('.deck-show .frame > svg')).toContainText('After');
});

test('the whole document as a QR code, to look at and to keep', async ({ page }) => {
  const { encodeEnvelope } = await import('../src/lib/envelope.ts');
  await page.goto('/#/v0/todo/' + encodeEnvelope({ created: 1, body: '- Scan me' }));
  // The header button, or on a phone the Share menu's item.
  const openQr = async () => {
    if (await page.locator('sl-button[aria-label="QR code"]').isVisible()) await page.locator('sl-button[aria-label="QR code"]').click();
    else {
      await page.getByRole('button', { name: 'Share' }).click();
      await page.getByRole('menuitem', { name: 'QR code' }).click();
    }
  };
  await openQr();
  const dialog = page.locator('#qr-dialog');
  await expect(dialog).toHaveAttribute('open');
  await expect(dialog.getByRole('img', { name: 'QR code of this document' }).locator('svg')).toBeVisible();
  await expect(dialog).toContainText(/\d+ bytes, as one code/);
  const [png] = await Promise.all([page.waitForEvent('download'), dialog.getByRole('button', { name: 'PNG' }).click()]);
  expect(png.suggestedFilename()).toMatch(/-qr\.png$/);
  expect(readFileSync(await png.path()).subarray(1, 4).toString()).toBe('PNG');
  const [svg] = await Promise.all([page.waitForEvent('download'), dialog.getByRole('button', { name: 'SVG' }).click()]);
  expect(readFileSync(await svg.path(), 'utf8')).toContain('<svg');
  await shot(page, 'qr');
  // Too long for any code, and it says so.
  await page.goto('about:blank');
  await page.goto('/#/v0/write/' + encodeEnvelope({ created: 1, body: Array.from({ length: 400 }, (_, i) => `Line ${i} of a long document with words that do not repeat much ${i * 7919}`).join('\n') }));
  await openQr();
  await expect(page.locator('#qr-dialog')).toContainText('the largest QR code holds 2,953');
});

test('slides: bold, italic, nesting, from the keyboard and the toolbar', async ({ page }) => {
  await page.goto('/#/v0/deck');
  const value = () => page.evaluate(() => (document.querySelector('to-deck') as HTMLElement & { value: string }).value);
  const head = page.getByRole('textbox', { name: 'Headline' });
  await head.click();
  await page.keyboard.type('Spring launch');
  await page.keyboard.press('Home');
  for (let i = 0; i < 6; i++) await page.keyboard.press('Shift+ArrowRight');
  // (A headline is bold already; italic is the mark that shows.)
  await page.keyboard.press('Control+i');
  await expect.poll(value).toMatch(/_Spring_ launch/);
  // The slide itself (in the rail) shows the words, not the marks.
  await expect(page.locator('.deck-rail .deck-thumb svg').first()).toContainText('Spring launch');
  await expect(page.locator('.deck-rail .deck-thumb svg').first()).not.toContainText('_');
  // Bullets: a line each; the toolbar marks what is selected.
  const bullets = page.getByRole('textbox', { name: 'Bullets' });
  await bullets.click();
  await page.keyboard.type('Ship the beta');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Tell everyone');
  await page.keyboard.press('Home');
  for (let i = 0; i < 4; i++) await page.keyboard.press('Shift+ArrowRight');
  await page.getByRole('button', { name: 'Italic' }).click();
  await expect.poll(value).toMatch(/Ship the beta\n_Tell_ everyone/);
  // Tab steps a bullet in; Shift+Tab brings it out; so do the buttons.
  await page.keyboard.press('End');
  await page.keyboard.press('Tab');
  await expect.poll(value).toMatch(/\n  _Tell_ everyone/);
  await page.keyboard.press('Tab');
  await expect.poll(value).toMatch(/\n    _Tell_ everyone/);
  await page.keyboard.press('Shift+Tab');
  await page.getByRole('button', { name: 'Bring the bullet out' }).click();
  await expect.poll(value).toMatch(/\n_Tell_ everyone/);
  await page.getByRole('button', { name: 'Indent the bullet' }).click();
  await expect.poll(value).toMatch(/\n  _Tell_ everyone/);
});

test('keeping documents is opt in, and off again erases them', async ({ page }) => {
  await page.goto('/#/v0/todo');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator('.to-keep').click();
  await expect(page.locator('.to-keep')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('textbox', { name: 'New task' }).fill('Buy milk');
  await page.keyboard.press('Enter');
  await expect.poll(() => page.url()).toMatch(/#\/v0\/todo\/[WYZR]/);
  await page.goto('/#/');
  await expect(page.locator('.to-library li')).toHaveCount(1);
  await page.goto('/#/v0/write');
  page.once('dialog', (d) => d.accept());
  await page.locator('.to-keep').click();
  await expect(page.locator('.to-keep')).toHaveText('Private');
  await page.goto('/#/');
  await expect(page.locator('.to-library')).toHaveCount(0);
  // Private means nothing of ours left behind.
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
});

test('everything can be made larger from the menu, and it is remembered', async ({ page }) => {
  await page.goto('/#/v0/todo');
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.locator('#nav-drawer')).toHaveAttribute('open');
  await page.waitForTimeout(400);
  const size = page.locator('#nav-drawer .to-size');
  await expect(size.locator('sl-button').nth(1)).toContainText('100%');
  await size.locator('sl-button').nth(2).click();
  await size.locator('sl-button').nth(2).click();
  await expect(size.locator('sl-button').nth(1)).toContainText('120%');
  expect(await page.evaluate(() => document.documentElement.style.zoom)).toBe('1.2');
  await page.keyboard.press('Escape');
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.style.zoom)).toBe('1.2');
  await page.getByRole('button', { name: 'Menu' }).click();
  await size.locator('sl-button').nth(1).click();
  expect(await page.evaluate(() => document.documentElement.style.zoom)).toBe('');
});

test('write: highlight, alignment and an icon in the line', async ({ page }) => {
  await page.goto('/#/v0/write');
  const doc = page.getByRole('textbox', { name: 'Document' });
  await doc.click();
  await page.keyboard.type('Ship it today');
  await page.keyboard.press('Shift+Home');
  await page.getByRole('button', { name: 'Highlight' }).click();
  // (The browser writes a coloured span; the document reads it as a highlight.)
  await expect(doc.locator('mark, span[style*="background"]')).toHaveText('Ship it today');
  await page.getByRole('button', { name: 'Centre' }).click();
  await expect(doc.locator('p')).toHaveAttribute('style', /text-align: ?center/);
  await doc.locator('p').first().click();
  await page.keyboard.press('End');
  await page.getByRole('button', { name: 'Icon', exact: true }).click();
  await page.locator('sl-dialog.to-icons sl-input input').fill('rocket');
  await page.locator('sl-dialog.to-icons').getByRole('button', { name: 'rocket', exact: true }).click();
  await expect(doc.locator('.ic[data-icon="rocket"] svg')).toBeVisible();
  // It all comes back from the link, and is in the text as marks.
  await reopen(page);
  await expect(doc.locator('mark').first()).toHaveText('Ship it today');
  await expect(doc.locator('.ic[data-icon="rocket"]')).toHaveCount(1);
  expect(await page.evaluate(() => (document.querySelector('to-write') as HTMLElement & { value: string }).value)).toMatch(/^>c =Ship it today(=:rocket:|:rocket: =)/);
  await expect(doc.locator('p')).toHaveAttribute('style', /center/);
  await shot(page, 'write-marks');
});

test('calculator: a tape, a graph, and a mortgage worked out as a page', async ({ page }) => {
  await page.goto('/#/v0/calc');
  const display = page.getByRole('textbox', { name: 'Expression' });
  await page.getByRole('button', { name: '7', exact: true }).click();
  await page.getByRole('button', { name: '×', exact: true }).click();
  await page.getByRole('button', { name: '6', exact: true }).click();
  await expect(page.locator('.calc-live')).toHaveText('42');
  await page.getByRole('button', { name: '=', exact: true }).click();
  await expect(page.locator('.calc-tape li')).toHaveCount(1);
  await expect(page.locator('.calc-tape')).toContainText('= 42');
  await display.fill('sqrt(144)+5!');
  await display.press('Enter');
  await expect(page.locator('.calc-tape li')).toHaveCount(2);
  await expect.poll(() => page.url()).toMatch(/#\/v0\/calc\/[WYZR]/);
  // The graph draws y = f(x).
  await page.getByRole('radio', { name: 'Scientific & graph' }).click();
  await page.getByRole('textbox', { name: 'y =' }).fill('sin(x)');
  await page.getByRole('textbox', { name: 'y =' }).press('Enter');
  await expect(page.locator('.calc-right > svg')).toContainText('y = sin(x)');
  await expect(page.locator('.calc-right svg path[stroke-width="2.2"]')).toHaveCount(1);
  // A mortgage: boxes in, the answer and the years beside them.
  await page.getByRole('radio', { name: 'Mortgage' }).click();
  await expect(page.locator('.calc-right > svg')).toContainText('2,022.62');
  await page.getByLabel('Interest rate').fill('5');
  await page.getByLabel('Interest rate').press('Tab');
  await expect(page.locator('.calc-right > svg')).toContainText('1,717.83');
  await reopen(page);
  await expect(page.locator('.calc-right > svg')).toContainText('1,717.83');
  await expect(page).toHaveTitle('Mortgage · TinyLittleOffice');
  await shot(page, 'calc');
});
