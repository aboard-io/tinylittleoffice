import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { shot, reopen } from './helpers';

// As a new visitor finds it: the form, not the text.
test.use({ storageState: { cookies: [], origins: [{ origin: 'http://localhost:4173', localStorage: [{ name: 'tinyoffice.keep', value: '1' }, { name: 'tinyoffice.edit', value: 'form' }, { name: 'tinyoffice.open', value: 'edit' }] }] } });

test('a menu is made by filling in a form; what is saved is the text', async ({ page }) => {
  await page.goto('/#/menu');
  const form = page.locator('to-menu to-lines');
  await expect(form).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Menu, as text' })).toHaveCount(0);
  const add = (kind: string) => form.getByRole('group', { name: 'Add' }).getByRole('button', { name: kind, exact: true }).click();
  await add('Name');
  await page.keyboard.type('Harbor Coffee');
  await add('Section');
  await page.keyboard.type('Coffee');
  await add('Dish');
  await page.keyboard.type('Espresso');
  await page.keyboard.press('Tab');
  await page.keyboard.type('3.00');
  await page.keyboard.press('Tab');
  await page.keyboard.type('Dark and syrupy');
  // Return starts another of the same.
  await page.keyboard.press('Enter');
  await page.keyboard.type('Flat white');
  await page.keyboard.press('Tab');
  await page.keyboard.type('4.20');
  const sheet = page.getByRole('img', { name: 'Menu, sheet 1' });
  await expect(sheet).toContainText('Harbor Coffee');
  await expect(sheet).toContainText('COFFEE');
  await expect(sheet).toContainText('Dark and syrupy');
  await expect(sheet).toContainText('4.20');
  // A title is asked for once.
  await expect(form.getByRole('group', { name: 'Add' }).getByRole('button', { name: 'Name', exact: true })).toHaveCount(0);
  await expect(page).toHaveTitle('Harbor Coffee · TinyLittleOffice');
  // Rows move and go.
  await form.getByRole('button', { name: 'Move row 4 up' }).click();
  await expect(form.getByRole('textbox', { name: 'Dish, row 3' })).toHaveValue('Flat white');
  await form.getByRole('button', { name: 'Remove row 4' }).click();
  await expect(sheet).not.toContainText('Espresso');
  await shot(page, 'form-menu');
  const results = await new AxeBuilder({ page }).disableRules(['label-title-only']).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes[0].target.join(' ')}`)).toEqual([]);
  // It is the same document either way: as text it reads as anyone would have typed it, and the choice is remembered.
  await page.keyboard.press('Control+Shift+t');
  await expect(page.getByRole('textbox', { name: 'Menu, as text' })).toHaveValue('# Harbor Coffee\n## Coffee\nFlat white | 4.20');
  await page.getByRole('textbox', { name: 'Menu, as text' }).fill('# Harbor Coffee\n## Coffee\nFlat white | 4.20\nFilter | 3.50 | Ask what is on');
  await reopen(page);
  await page.getByRole('button', { name: 'Edit as a form' }).click();
  await expect(form.getByRole('textbox', { name: 'What it is, row 4' })).toHaveValue('Ask what is on');
  // Undo works on the form as on anything.
  await form.getByRole('textbox', { name: 'Price, row 4' }).fill('9');
  await page.keyboard.press('Control+z');
  await expect(form.getByRole('textbox', { name: 'Price, row 4' })).toHaveValue('3.50');
});

test('forms: outlines indent, pictures are picked, choices are chosen', async ({ page }) => {
  // An org chart: people under people.
  await page.goto('/#/org');
  const org = page.locator('to-org to-lines');
  await org.getByRole('group', { name: 'Add' }).getByRole('button', { name: 'Person' }).click();
  await page.getByRole('textbox', { name: 'Name, row 1' }).fill('Ada');
  await page.getByRole('textbox', { name: 'Role, row 1' }).fill('CEO');
  await page.getByRole('textbox', { name: 'Role, row 1' }).press('Enter');
  await page.keyboard.type('Ben');
  // Alt and the arrows work the outline: in, and down a level under Ada.
  await page.keyboard.press('Alt+ArrowRight');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Eve');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Cy');
  await page.keyboard.press('Alt+ArrowUp');
  await expect(page.getByRole('textbox', { name: 'Name, row 3' })).toHaveValue('Cy');
  await expect(page.getByRole('textbox', { name: 'Name, row 3' })).toBeFocused();
  await page.keyboard.press('Alt+ArrowRight');
  // Cy is under Ben now; moving Ben takes Cy along.
  await org.getByRole('button', { name: 'Move row 2 down' }).click();
  await expect(page.getByRole('textbox', { name: 'Name, row 2' })).toHaveValue('Eve');
  await expect(page.getByRole('textbox', { name: 'Name, row 4' })).toHaveValue('Cy');
  // An empty row goes with Backspace.
  await page.getByRole('textbox', { name: 'Name, row 4' }).press('Enter');
  await expect(org.locator('.lf-row')).toHaveCount(5);
  await page.keyboard.press('Backspace');
  await expect(org.locator('.lf-row')).toHaveCount(4);
  // A dotted line between two of them.
  await org.getByRole('group', { name: 'Add' }).getByRole('button', { name: 'Dotted line' }).click();
  await page.keyboard.type('Cy');
  await page.keyboard.press('Tab');
  await page.keyboard.type('Eve');
  await page.keyboard.press('Tab');
  await page.keyboard.type('advises');
  await expect(page.locator('to-org .pic > svg line[stroke-dasharray="2 3"]')).toHaveCount(1);
  await expect(page.locator('to-org .pic > svg')).toContainText('advises');
  await shot(page, 'form-org');
  await org.getByRole('button', { name: /^Picture, row 1/ }).click();
  await page.locator('sl-dialog.to-icons sl-input input').fill('crown');
  await page.locator('sl-dialog.to-icons').getByRole('button', { name: 'crown', exact: true }).click();
  const drawn = page.locator('to-org .pic > svg');
  await expect(drawn).toContainText('Ben');
  await expect(drawn.locator('g[stroke-linecap="round"]')).toHaveCount(1);
  await page.keyboard.press('Control+Shift+t');
  await expect(page.getByRole('textbox', { name: 'Org chart, as text' })).toHaveValue(':crown Ada | CEO\n  Eve\n  Ben\n    Cy\nCy .. Eve: advises');
  await page.getByRole('button', { name: 'Edit as a form' }).click();

  // Seating: a table, then its people as rows.
  await page.goto('/#/seating');
  const seating = page.locator('to-seating to-lines');
  await seating.getByRole('group', { name: 'Add' }).getByRole('button', { name: 'Table' }).click();
  await page.getByRole('textbox', { name: 'Table, row 1' }).fill('Head table');
  await expect(page.locator('to-seating .pic > svg')).toContainText('Head table');
  await expect.poll(() => page.url()).toMatch(/#\/v2\/seating\/[WYZR]/);

  // The model: sliders and flows from boxes, and the diagram follows.
  await page.goto('/#/flow');
  const flow = page.locator('to-flow to-lines');
  const addFlow = (kind: string) => flow.getByRole('group', { name: 'Add' }).getByRole('button', { name: kind, exact: true }).click();
  await addFlow('Slider');
  await page.keyboard.type('visitors');
  await page.keyboard.press('Tab');
  await page.keyboard.type('1000');
  await addFlow('Flow');
  await page.keyboard.type('Visitors');
  await page.keyboard.press('Tab');
  await page.keyboard.type('Signups');
  await page.keyboard.press('Tab');
  await page.keyboard.type('visitors * 0.1');
  await expect(page.frameLocator('to-flow iframe').locator('#say')).toContainText('Signups 100');
  await shot(page, 'form-flow');

  // An example fills the form in.
  await page.goto('/#/invoice');
  await page.getByRole('button', { name: 'Start from an example' }).click();
  const inv = page.locator('to-invoice to-lines');
  await expect(inv.getByRole('textbox', { name: 'Who it is from, row 1' })).toHaveValue('Harbor Studio | 14 Quay Street');
  await expect(inv.locator('input[type="date"]').first()).toHaveValue('2027-03-01');
  await expect(inv.getByRole('textbox', { name: 'Quantity, row 7' })).toHaveValue('12');
  await inv.getByRole('textbox', { name: 'Quantity, row 7' }).fill('10');
  await expect(page.frameLocator('to-invoice iframe').locator('tfoot tr').last()).toContainText('$5,162.40');
  await shot(page, 'form-invoice');
});

test('the picture is worked directly: tap a box and type; Enter for the next', async ({ page }) => {
  await page.goto('/#/org');
  await page.getByRole('button', { name: 'Start from an example' }).click();
  const pic = page.locator('to-org .pic > svg');
  // A tap opens the words, with the small things to do underneath; no cluster of buttons on the picture.
  await pic.getByRole('button', { name: /^Ben Okoro/ }).click();
  const box = page.locator('.pic-edit');
  await expect(box.locator('input').first()).toBeFocused();
  await expect(box.locator('input').first()).toHaveValue('Ben Okoro');
  await expect(pic.locator('.diagram-ctl')).toHaveCount(0);
  // Enter: one under Ben, indented, the cursor in it.
  await page.keyboard.press('Enter');
  await expect(box.locator('input').first()).toHaveValue('');
  await page.keyboard.type('Gus Pine');
  await expect(pic).toContainText('Gus Pine');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+Shift+t');
  await expect(page.getByRole('textbox', { name: 'Org chart, as text' })).toHaveValue(/Ben Okoro \| Engineering\n    Cy Lund \| Platform\n    Di Shah \| Apps\n    Gus Pine/);
  await page.keyboard.press('Control+Shift+t');
  // A picture on Eve; then take Flo away.
  await pic.getByRole('button', { name: /^Eve Marsh/ }).click();
  await box.getByRole('button', { name: 'Give it a picture' }).click();
  await page.locator('sl-dialog.to-icons sl-input input').fill('palette');
  await page.locator('sl-dialog.to-icons').getByRole('button', { name: 'palette', exact: true }).click();
  await expect(pic.locator('g.pick g[stroke-linecap="round"]')).toHaveCount(1);
  await pic.getByRole('button', { name: /^Flo Reyes/ }).click();
  await box.getByRole('button', { name: 'Take it away' }).click();
  await expect(pic).not.toContainText('Flo Reyes');
  await expect(pic.getByRole('button', { name: /Okoro|Lund|Shah|Marsh|Diaz|Pine/ })).toHaveCount(6);
  // Backspace on empty words takes one away too.
  await pic.getByRole('button', { name: /^Cy Lund/ }).click();
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');
  await expect(pic).not.toContainText('Cy Lund');
  await page.setViewportSize({ width: 400, height: 800 });
  await shot(page, 'direct-org');
});

test('a page is edited in the page: type into it, add with the bar, Enter for another', async ({ page }) => {
  await page.goto('/#/split');
  await page.getByRole('button', { name: 'Start from an example' }).click();
  const f = page.frameLocator('to-split iframe');
  // What is written in the text is there in the page, to type into.
  const sam = f.getByRole('textbox', { name: 'Who paid, row 4' });
  await expect(sam).toHaveText('Sam');
  await sam.click();
  await page.keyboard.press('End');
  await page.keyboard.type('antha');
  // The table beneath has it at once; once the typing pauses the page is drawn afresh, sums and all.
  await expect(page.getByRole('textbox', { name: 'Who paid, row 4' })).toHaveValue('Samantha');
  await expect(f.locator('.pay').last()).toContainText('Samantha');
  // The bar adds a row, shown with its fields' names to type over; Remove takes it away.
  await f.getByRole('group', { name: 'Add' }).getByRole('button', { name: '+ Payment' }).click();
  // (It goes in after the row last typed in: Samantha's.)
  const who = f.getByRole('textbox', { name: 'Who paid, row 5' });
  await expect(who).toHaveText('Who paid');
  await expect(f.locator('tbody tr')).toHaveCount(5);
  await who.click();
  await page.keyboard.press('Control+a');
  await page.keyboard.type('Grace');
  await expect(page.getByRole('textbox', { name: 'Who paid, row 5' })).toHaveValue('Grace');
  await expect(f.locator('tbody')).toContainText('Grace');
  await shot(page, 'page-edit');
  await f.getByRole('textbox', { name: 'Who paid, row 5' }).click();
  await f.getByRole('button', { name: 'Remove this' }).click();
  await expect(f.locator('tbody tr')).toHaveCount(4);
  // Enter in a box: another row like it.
  await f.getByRole('textbox', { name: 'What for, row 5' }).click();
  await page.keyboard.press('Enter');
  await expect(f.locator('tbody tr')).toHaveCount(5);
});

test('words are typed on the picture itself: a shape, and a line of a printed sheet', async ({ page }) => {
  await page.goto('/#/org');
  await page.getByRole('button', { name: 'Start from an example' }).click();
  const pic = page.locator('to-org .pic > svg');
  // Twice on a box opens it for typing; Enter keeps it.
  await pic.getByRole('button', { name: /^Ben Okoro/ }).dblclick();
  const box = page.locator('.pic-edit input').first();
  await expect(box).toBeFocused();
  await expect(box).toHaveValue('Ben Okoro');
  await page.keyboard.press('Control+a');
  await page.keyboard.type('Ben Okoro-Smith');
  await expect(pic).toContainText('Ben Okoro-Smith');
  // The role is in the same box, a Tab away.
  await page.keyboard.press('Tab');
  await expect(page.locator('.pic-edit input').nth(1)).toBeFocused();
  await expect(page.locator('.pic-edit input').nth(1)).toHaveValue('Engineering');
  await page.keyboard.press('Control+a');
  await page.keyboard.type('Platform engineering');
  await expect(pic).toContainText('Platform engineering');
  await page.keyboard.press('Escape');
  await expect(box).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Name, row 2' })).toHaveValue('Ben Okoro-Smith');
  await expect(page.getByRole('textbox', { name: 'Role, row 2' })).toHaveValue('Platform engineering');
  // One tap does the same.
  await pic.getByRole('button', { name: /^Eve Marsh/ }).click();
  await expect(page.locator('.pic-edit input').first()).toHaveValue('Eve Marsh');
  await page.keyboard.press('Escape');

  // On a sheet: tap the words, type.
  await page.goto('/#/menu');
  await page.getByRole('button', { name: 'Start from an example' }).click();
  const sheet = page.getByRole('img', { name: 'Menu, sheet 1' });
  await sheet.locator('text', { hasText: 'Flat white' }).click();
  await expect(page.locator('.pic-edit input').first()).toHaveValue('Flat white');
  await page.keyboard.press('Control+a');
  await page.keyboard.type('Oat flat white');
  await page.keyboard.press('Enter');
  await expect(sheet).toContainText('Oat flat white');
  await expect(page.getByRole('textbox', { name: 'Dish, row 5' })).toHaveValue('Oat flat white');
  await shot(page, 'type-on-picture');
});

test('the picture is the editor: tap to add, drag to move, drag onto another to re-home', async ({ page }) => {
  // Picture mode: the default; no list beside it.
  await page.goto('/#/org');
  await page.evaluate(() => localStorage.removeItem('tinyoffice.edit'));
  await page.reload();
  await expect(page.locator('to-org to-lines')).toHaveCount(0);
  await page.getByRole('button', { name: 'Start from an example' }).click();
  const pic = page.locator('to-org .pic > svg');
  await expect(pic.locator('g.pick')).toHaveCount(6);
  // A tap on empty space adds a person, with the box open to name them.
  const box = await pic.boundingBox();
  await page.mouse.click(box!.x + box!.width - 12, box!.y + box!.height - 12);
  await expect(page.locator('.pic-edit input').first()).toBeFocused();
  await page.keyboard.type('Gus Pine');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await expect(pic).toContainText('Gus Pine');
  await expect(pic.locator('g.pick')).toHaveCount(7);
  // Dragged onto Eve, Gus reports to her.
  const gus = pic.getByRole('button', { name: /^Gus Pine/ });
  const eve = pic.getByRole('button', { name: /^Eve Marsh/ });
  const [g, e] = [await gus.boundingBox(), await eve.boundingBox()];
  await page.mouse.move(g!.x + g!.width / 2, g!.y + g!.height / 2);
  await page.mouse.down();
  await page.mouse.move(e!.x + e!.width / 2, e!.y + e!.height / 2, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.press('Control+Shift+t');
  await expect(page.getByRole('textbox', { name: 'Org chart, as text' })).toHaveValue(/Eve Marsh \| Design\n    Gus Pine/);
  await page.keyboard.press('Control+Shift+t');
  // The list is there when wanted.
  await page.getByRole('button', { name: 'List', exact: true }).click();
  await expect(page.locator('to-org to-lines')).toHaveCount(1);
  await page.getByRole('button', { name: 'Hide the list' }).click();
  await expect(page.locator('to-org to-lines')).toHaveCount(0);

  // A floor plan's rooms keep a place: a drag moves one, a tap puts a room there.
  await page.goto('/#/floor');
  await page.getByRole('button', { name: 'Start from an example' }).click();
  const plan = page.locator('to-floor .pic > svg');
  const kitchen = plan.getByRole('button', { name: /^Kitchen/ });
  const k = (await kitchen.boundingBox())!;
  await page.mouse.move(k.x + k.width / 2, k.y + k.height / 2);
  await page.mouse.down();
  await page.mouse.move(k.x + k.width / 2 + 80, k.y + k.height / 2 + 60, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.press('Control+Shift+t');
  await expect(page.getByRole('textbox', { name: 'Floor plan, as text' })).toHaveValue(/Kitchen: [\d.]+ x [\d.]+ at [\d.]+,[\d.]+/);
});

test('adding on the picture: a draft that becomes real when typed into, and goes if not', async ({ page }) => {
  const doc = (app: string) => page.evaluate((a) => (document.querySelector('to-' + a) as any).doc, app);
  for (const [app, words, expect_] of [
    ['mind', 'Idea', /\n    Fresh thing\n/],
    ['net', 'To', /API > Fresh thing/],
    ['lanes', 'What they do', /Customer: Fresh thing/],
    ['timeline', 'What happened', /1843: Fresh thing/],
  ] as const) {
    await page.goto(`/#/${app}`);
    await page.evaluate(() => localStorage.removeItem('tinyoffice.edit'));
    await page.reload();
    await page.getByRole('button', { name: 'Start from an example' }).click();
    const pic = page.locator(`to-${app} .pic > svg`);
    const before = await doc(app);
    await pic.locator('g.pick').nth(1).click();
    await page.keyboard.press('Enter');
    // The draft is drawn and its box is open, but nothing is written yet.
    const box = page.locator('.pic-edit input').first();
    await expect(box).toBeFocused();
    await expect(box).toHaveAttribute('aria-label', new RegExp(`^${words}, row`));
    expect(await doc(app)).toBe(before);
    // Abandoned, nothing changes; typed into, it is real.
    await page.keyboard.press('Escape');
    await expect(page.locator('.pic-edit')).toHaveCount(0);
    expect(await doc(app)).toBe(before);
    await pic.locator('g.pick').nth(1).click();
    await page.keyboard.press('Enter');
    await expect(box).toBeFocused();
    await page.keyboard.type('Fresh thing');
    await page.keyboard.press('Enter');
    expect(await doc(app), app).toMatch(expect_);
    // (Enter opened the next draft; let it go.)
    await page.keyboard.press('Escape');
    await expect(page.locator('.pic-edit')).toHaveCount(0);
    // A tap on empty space while typing only closes the box.
    await pic.locator('g.pick').filter({ hasText: /\S/ }).first().click();
    await expect(page.locator('.pic-edit')).toHaveCount(1);
    const b = (await pic.boundingBox())!;
    await page.mouse.click(b.x + b.width - 6, b.y + b.height - 6);
    await expect(page.locator('.pic-edit')).toHaveCount(0);
  }
});
