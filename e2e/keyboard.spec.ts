import { test, expect } from '@playwright/test';

// The keyboard alone: the bar by Tab with a ring on what has the focus, Esc closing what is open and giving the focus back, arrows through Insert.
test('keyboard: the bar by Tab, Esc gives the focus back, arrows walk Insert', async ({ page }) => {
  const { encodeEnvelope } = await import('../src/lib/envelope.ts');
  await page.goto(`/#/v0/write/${encodeEnvelope({ created: 1, body: '# Memo\n\nSome words.' })}`);
  const inBar = () => page.evaluate(() => !!document.activeElement?.closest('.to-toolbar'));
  await page.getByRole('textbox', { name: 'Title' }).focus();
  for (let i = 0; i < 16 && !(await inBar()); i++) await page.keyboard.press('Tab');
  expect(await inBar(), 'Tab reaches the bar').toBe(true);
  // The ring: the focused control (a Shoelace button draws it on its inner part) has an outline or a shadow.
  const ringed = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    const inner = (el.shadowRoot?.activeElement ?? el.shadowRoot?.querySelector('[part~="base"]') ?? el) as HTMLElement;
    const cs = getComputedStyle(inner);
    return (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none';
  });
  expect(ringed, 'the focus is visible').toBe(true);

  // Insert: Enter opens it on its search box, arrows move, Esc closes it and the button has the focus again.
  const insert = page.getByRole('button', { name: 'Insert' });
  await insert.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.to-insert-list input')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.to-insert-list [role="option"][aria-selected="true"]')).toHaveAttribute('id', /-1$/);
  await page.keyboard.press('Escape');
  await expect(page.locator('.to-insert-list')).toHaveCount(0);
  await expect(insert).toBeFocused();

  // A menu in the header (Download): Esc closes it, the button has the focus again.
  const download = page.getByRole('button', { name: 'Download' });
  await download.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toBeHidden();
  await expect(download).toBeFocused();

  // The hamburger: Esc closes the drawer, the Menu button has the focus again.
  const menu = page.getByRole('button', { name: 'Menu' });
  await menu.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#nav-drawer')).toHaveAttribute('open');
  await expect(page.getByRole('searchbox', { name: 'Find an app' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#nav-drawer')).not.toHaveAttribute('open');
  await expect(menu).toBeFocused();

  // The icon library: Esc closes it, the Icon button has the focus again.
  await page.goto('/#/v0/draw');
  const iconButton = page.getByRole('button', { name: 'Icon', exact: true });
  await iconButton.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('sl-dialog.to-icons')).toHaveAttribute('open');
  await expect(page.locator('sl-dialog.to-icons input')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('sl-dialog.to-icons')).toHaveCount(0);
  await expect(iconButton).toBeFocused();
});
