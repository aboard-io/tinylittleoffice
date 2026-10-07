import { test, expect } from '@playwright/test';

// The one tooltip (src/kit/tip.ts): hover and keyboard focus on a desktop, a long press on a phone.
test('a tip on hover and on focus, and none when the pointer leaves', async ({ page, isMobile }) => {
  test.skip(isMobile, 'hover is a desktop thing');
  await page.goto('/#/todo');
  const undo = page.getByRole('button', { name: 'Undo' });
  await undo.hover();
  const tip = page.locator('#to-tip');
  await expect(tip).toHaveClass(/open/);
  await expect(tip).toHaveText(/^Undo \(/);
  await page.mouse.move(10, 400);
  await expect(tip).not.toHaveClass(/open/);
  // A keyboard focus shows it too, Escape puts it away.
  await page.keyboard.press('Tab');
  await page.getByRole('button', { name: 'Share' }).focus();
  await expect(tip).toHaveClass(/open/);
  await expect(tip).toHaveText('Share');
  await page.keyboard.press('Escape');
  await expect(tip).not.toHaveClass(/open/);
});

test('a long press shows the tip and is not a tap', async ({ page }) => {
  await page.goto('/#/todo');
  await page.getByRole('textbox', { name: 'New task' }).fill('Milk');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('textbox', { name: 'Task 1' })).toHaveValue('Milk');
  const del = page.getByRole('button', { name: 'Delete task' }).first();
  const box = (await del.boundingBox())!;
  const at = { clientX: box.x + box.width / 2, clientY: box.y + box.height / 2, pointerType: 'touch', isPrimary: true, bubbles: true, composed: true };
  await del.dispatchEvent('pointerdown', at);
  await page.waitForTimeout(600);
  const tip = page.locator('#to-tip');
  await expect(tip).toHaveClass(/open/);
  await expect(tip).toHaveText('Delete task');
  await del.dispatchEvent('pointerup', at);
  await del.dispatchEvent('click', { bubbles: true, composed: true });
  // The press was for the tip: the task is still there.
  await expect(page.getByRole('textbox', { name: 'Task 1' })).toHaveValue('Milk');
  await expect(tip).not.toHaveClass(/open/, { timeout: 4000 });
  // A tap, though, deletes it.
  await del.click();
  await expect(page.getByRole('textbox', { name: 'Task 1' })).toHaveCount(0);
});
