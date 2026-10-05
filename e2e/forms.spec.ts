import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { shot, reopen } from './helpers';

// As a new visitor finds it: the form, not the text.
test.use({ storageState: { cookies: [], origins: [] } });

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
  await page.getByRole('button', { name: 'Edit as text' }).click();
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
  await org.getByRole('button', { name: 'Indent row 2' }).click();
  await org.getByRole('button', { name: /^Picture, row 1/ }).click();
  await page.locator('sl-dialog.to-icons sl-input input').fill('crown');
  await page.locator('sl-dialog.to-icons').getByRole('button', { name: 'crown', exact: true }).click();
  const drawn = page.locator('to-org .pic > svg');
  await expect(drawn).toContainText('Ben');
  await expect(drawn.locator('g[stroke-linecap="round"]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Edit as text' }).click();
  await expect(page.getByRole('textbox', { name: 'Org chart, as text' })).toHaveValue(':crown Ada | CEO\n  Ben');
  await page.getByRole('button', { name: 'Edit as a form' }).click();

  // Sticky notes: a colour is a choice.
  await page.goto('/#/sticky');
  const sticky = page.locator('to-sticky to-lines');
  await sticky.getByRole('group', { name: 'Add' }).getByRole('button', { name: 'Coloured note' }).click();
  await page.getByRole('combobox', { name: 'Colour, row 1' }).selectOption('green');
  await page.getByRole('textbox', { name: 'Note, row 1' }).fill('Thank the testers');
  await expect(page.locator('to-sticky .pic > svg')).toContainText('Thank the');
  await expect.poll(() => page.url()).toMatch(/#\/v2\/sticky\/[YZR]/);

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
