/**
 * Axe over every app at phone size (WebKit, 390 by 844), in light and in dark: the home page, then each app
 * of the registry opened on its first template. One test with soft assertions, so a run reports every app
 * and theme that fails rather than the first. (The smoke's axe covers the home, a text and the Display Link
 * at both sizes; the diagram spec, its own pages.)
 *
 *   PW_PORT=4423 npx playwright test e2e/a11y.spec.ts --project=phone
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { apps } from '../src/kit/apps.ts';
import { encodeDoc } from '../src/kit/codec.ts';
import { routeHash } from '../src/kit/route.ts';

// theme.js tells iOS alone that the page may not zoom (see smoke.spec.ts), which axe's meta-viewport rule cannot know.
const axe = (page: Page) => new AxeBuilder({ page }).disableRules(['meta-viewport']).analyze();
/** A violation in a line: the rule, and where. */
const said = (v: Awaited<ReturnType<typeof axe>>['violations'][number]) =>
  `${v.id} (${v.impact}): ${v.nodes
    .slice(0, 3)
    .map((n) => `${n.target.map(String).join(' >> ')}${n.any[0]?.message ? ` [${n.any[0].message}]` : ''}`)
    .join(', ')}${v.nodes.length > 3 ? ` and ${v.nodes.length - 3} more` : ''}`;

/** Until the editor's element is defined and drawn, and the fonts are in. */
async function drawn(page: Page) {
  await page.waitForFunction(() => {
    const el = document.querySelector('main.to-main > *');
    return !!el && !!customElements.get(el.localName) && !!(el.shadowRoot ?? el).childElementCount;
  });
  await page.evaluate(() => document.fonts.ready.then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))));
}

test('axe finds nothing in any app, at phone size, light and dark', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'at phone size');
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
    await expect(page.locator('.to-app-open').first()).toBeVisible();
    expect.soft((await axe(page)).violations.map(said), `home, ${scheme}`).toEqual([]);
    for (const app of apps()) {
      const tpl = (await app.templates())[0];
      // A fresh load each time, so nothing of the app before is on the page.
      await page.goto('about:blank');
      await page.goto(`/${routeHash(app.id, encodeDoc(tpl.doc))}`);
      await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
      await drawn(page);
      expect.soft((await axe(page)).violations.map(said), `${app.id} (${tpl.name}), ${scheme}`).toEqual([]);
    }
  }
  expect(errors).toEqual([]);
});

// What VoiceOver is given for the Word Processor's words (WebKit, phone size): the first template's paragraphs as
// they are written, and a template's lists as lists, each item with its level, a task with its state before its words.
test('the Word Processor’s words, as a screen reader is given them', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'WebKit at phone size');
  const write = apps().find((a) => a.id === 'write')!;
  const open = async (doc: string) => {
    await page.goto('about:blank');
    await page.goto(`/${routeHash('write', encodeDoc(doc))}`);
    await drawn(page);
    return page.locator('to-write-editor to-text .tx').first();
  };
  await expect(await open((await write.templates())[0].doc)).toMatchAriaSnapshot(`
    - textbox "Document":
      - paragraph: Your name Street and number Town and postcode you@example.com
      - paragraph: The date
      - paragraph: Dear …,
      - paragraph: Why you are writing, in a sentence.
      - paragraph: What you have to say, in order.
      - paragraph: What happens next, and by when.
      - paragraph: Yours sincerely,
      - paragraph
      - paragraph: Your name
  `);
  await expect(await open((await write.templates()).find((tp) => tp.id === 'meeting')!.doc)).toMatchAriaSnapshot(`
    - textbox "Document":
      - heading "Meeting" [level=1]
      - paragraph: The date · where · who came
      - heading "Agenda" [level=2]
      - list:
        - listitem [level=1]: First item
        - listitem [level=1]: Second item
      - heading "Notes" [level=2]
      - paragraph: What was said, briefly.
      - heading "Decisions" [level=2]
      - list:
        - listitem [level=1]: What was decided.
      - heading "Actions" [level=2]
      - list:
        - listitem [level=1]: not done Who does what, by when
  `);
  // The places Playwright's snapshot leaves out: each item's position and how many.
  const items = page.locator('to-write-editor to-text .tx li');
  expect(await items.evaluateAll((li) => li.map((l) => `${l.getAttribute('aria-posinset')}/${l.getAttribute('aria-setsize')}`))).toEqual(['1/2', '2/2', '1/1', '1/1']);
});
