/**
 * At the largest size of everything (SIZE_MAX, 200%) on a phone (WebKit, 390 by 844), the low-vision reader's check:
 * no word is split across lines. The home page, then each app of the registry opened on its first template; for every
 * text node in the page's main, each word (Intl.Segmenter's) gives a single client rect, so a row wraps before a word
 * breaks (a schedule's task, a trip's stop, the home page's app names). One test with soft assertions, so a run
 * names every app whose words split rather than the first. Run on its own:
 *
 *   PW_PORT=4424 npx playwright test e2e/reflow-phone.spec.ts --project=phone
 */
import { test, expect, type Page } from '@playwright/test';
import { apps } from '../src/kit/apps.ts';
import { encodeDoc } from '../src/kit/codec.ts';
import { routeHash } from '../src/kit/route.ts';

/** Until the editor's element is defined and drawn, and the fonts are in. */
async function drawn(page: Page) {
  await page.waitForFunction(() => {
    const el = document.querySelector('main > *');
    return !!el && (!customElements.get(el.localName) || !!(el.shadowRoot ?? el).childElementCount);
  });
  await page.evaluate(() => document.fonts.ready.then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))));
}

/**
 * The words in main drawn over more than one line, where a row could have wrapped instead: a word that would fit in its
 * box whole, or one in a box squeezed narrower than 3em. A word wider than the most its box can be given (a long one,
 * deep in an outline) still breaks, as it must.
 */
const split = (page: Page) =>
  page.evaluate(() => {
    const words = new Intl.Segmenter(document.documentElement.lang || 'en', { granularity: 'word' });
    const out: string[] = [];
    const walk = document.createTreeWalker(document.querySelector('main')!, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode() as Text | null; n; n = walk.nextNode() as Text | null) {
      // A word drawn as a picture (an SVG's text, a slide) is the picture's; the page's own words are what reflow.
      if (n.parentElement?.closest('svg')) continue;
      let box = n.parentElement!;
      while (getComputedStyle(box).display.startsWith('inline') || getComputedStyle(box).display === 'contents') box = box.parentElement!;
      const cs = getComputedStyle(box);
      const room = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const em = parseFloat(getComputedStyle(n.parentElement!).fontSize);
      for (const s of words.segment(n.data)) {
        if (!s.isWordLike) continue;
        const r = document.createRange();
        r.setStart(n, s.index);
        r.setEnd(n, s.index + s.segment.length);
        const rects = [...r.getClientRects()].filter((b) => b.width > 0.5 && b.height > 0.5);
        if (new Set(rects.map((b) => Math.round(b.top))).size < 2) continue;
        // What breaks is the run of letters between two spaces (a word's "you@" goes with it), measured whole.
        const from = n.data.slice(0, s.index).search(/\S*$/);
        const to = s.index + s.segment.length + n.data.slice(s.index + s.segment.length).search(/\s|$/);
        r.setStart(n, from);
        r.setEnd(n, to);
        const wide = [...r.getClientRects()].reduce((sum, b) => sum + b.width, 0);
        if (wide <= room + 1 || room < 3 * em) out.push(`"${s.segment}" (${Math.round(wide)}px) in a box of ${Math.round(room)}px: "${n.data.trim().slice(0, 40)}"`);
      }
    }
    return [...new Set(out)];
  });

test('at 200% on a phone, no word in the home page or any app is split across lines', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone only');
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  // about:blank between the apps has no storage: the size is set where there is.
  await page.addInitScript(() => location.protocol.startsWith('http') && (localStorage.setItem('tinyoffice.keep', '1'), localStorage.setItem('tinyoffice.size', '2')));
  await page.goto('/');
  await expect(page.locator('.to-app-open').first()).toBeVisible();
  await drawn(page);
  expect.soft(await split(page), 'home').toEqual([]);
  for (const app of apps()) {
    const tpl = app.templates[0];
    await page.goto('about:blank');
    await page.goto(`/${routeHash(app.id, encodeDoc(tpl.doc))}`);
    await drawn(page);
    expect.soft(await split(page), `${app.id} (${tpl.name})`).toEqual([]);
  }
  expect(errors).toEqual([]);
});
