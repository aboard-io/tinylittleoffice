import { test, expect } from '@playwright/test';
test('the site serves its own API as a module a page can import', async ({ page }) => {
  await page.goto('/');
  const out = await page.evaluate(async () => {
    const T = await import(location.origin + '/api.js');
    const u = T.link('todo', '- a\nx b', { by: 'agent' });
    return [T.parse(u).env.by, T.parse(u).markdown, (await T.lint('deck', ':brainz:t\nHi')).length];
  });
  expect(out).toEqual(['agent', '- [ ] a\n- [x] b\n', 1]);
});
