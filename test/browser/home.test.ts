// The home page's foot (Paul, 2026-10-12): one line, "An Aboard Foundry project. Made with respect in New York City. · Beta version · GitHub · Email",
// Aboard Foundry a link to aboard.com, GitHub the repository, Email a mail link; the sites open in a new tab, in the page's language.
import { afterEach, expect, test, vi } from 'vitest';
import { cdp, page } from 'vitest/browser';
import { setLanguage } from '../../src/kit/core/i18n.ts';
import { keepSize, SIZE_MAX } from '../../src/kit/ui/zoom.ts';
import { preloadTemplates, type ToTemplates } from '../../src/kit/ui/home.ts';
import { firstLines } from './firstline.ts';
import { mount, tick, until } from './helpers.ts';
import { encodeDoc } from '../../src/kit/core/codec.ts';

afterEach(async () => {
  keepSize(1);
  await setLanguage(null);
  await page.viewport(1100, 800);
});

/** The foot's line, and the links in it. */
const foot = (shell: HTMLElement) => {
  const f = shell.querySelector<HTMLElement>('to-home footer.to-home-foot')!;
  return { f, lines: [...f.querySelectorAll('p')].map((p) => p.textContent!.trim()), links: [...f.querySelectorAll('a')] };
};

test('the home page ends with whose project it is and where it was made, then the beta, its source and how to write', async () => {
  const shell = await mount('');
  await until(() => !!shell.querySelector('to-home footer.to-home-foot'));
  const { f, lines, links } = foot(shell);
  // Below the apps, last in the page.
  expect(f.previousElementSibling!.classList.contains('to-apps')).toBe(true);
  expect(f.nextElementSibling).toBeNull();
  expect(lines).toEqual(['An Aboard Foundry project. Made with respect in New York City. · Beta version · GitHub · Email']);
  expect(links.map((a) => [a.textContent, a.href, a.target, a.rel])).toEqual([
    ['Aboard Foundry', 'https://aboard.com/', '_blank', 'noopener'],
    ['GitHub', 'https://github.com/aboard-io/tinylittleoffice', '_blank', 'noopener'],
    ['Email', 'mailto:hello+tlo@aboard.com', '', ''],
  ]);
  // Quiet: the kit's muted ink, smaller than an app's name, its words aligned with the apps' names.
  const style = getComputedStyle(f);
  const name = shell.querySelector<HTMLElement>('.to-app-name')!;
  expect(parseFloat(getComputedStyle(f.querySelector('p')!).fontSize)).toBeLessThan(parseFloat(getComputedStyle(name).fontSize));
  const probe = document.createElement('i');
  probe.style.color = 'var(--to-ink-3)';
  f.append(probe);
  expect(style.color).toBe(getComputedStyle(probe).color);
  probe.remove();
  const open = shell.querySelector<HTMLElement>('.to-app-open')!;
  expect(Math.abs(f.querySelector('p')!.getBoundingClientRect().left - (open.getBoundingClientRect().left + parseFloat(getComputedStyle(open).paddingLeft)))).toBeLessThan(1);
});

test('the foot is said in the page’s language, the names Aboard and GitHub kept and still the links', async () => {
  const shell = await mount('');
  await setLanguage('fr');
  await until(() => document.documentElement.lang === 'fr');
  await until(() => !foot(shell).lines[0].startsWith('An Aboard Foundry project.'));
  const { lines, links } = foot(shell);
  expect(lines).toEqual(['Un projet Aboard Foundry. Fait avec respect à New York. · Version bêta · GitHub · E-mail']);
  expect(links.map((a) => [a.textContent, a.href])).toEqual([
    ['Aboard Foundry', 'https://aboard.com/'],
    ['GitHub', 'https://github.com/aboard-io/tinylittleoffice'],
    ['E-mail', 'mailto:hello+tlo@aboard.com'],
  ]);
});

test('the foot’s links are the chrome’s own and open as they are; the mark that says so lets nothing else through', async () => {
  const shell = await mount('');
  await until(() => !!shell.querySelector('to-home footer.to-home-foot'));
  const followed: boolean[] = [];
  // After the guard (capture, on the document) has had its say: whether the browser would follow, and then not.
  const see = (e: Event) => (followed.push(!e.defaultPrevented), e.preventDefault());
  document.addEventListener('click', see);
  try {
    for (const a of foot(shell).links) a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(followed).toEqual([true, true]);
    expect(document.querySelector('to-dialog.to-link-guard dialog[open]')).toBeNull();
    // The same mark on a link anywhere else, to anywhere else, is asked about like any link that leaves.
    const forged = Object.assign(document.createElement('a'), { href: 'https://elsewhere.example/', target: '_blank' });
    forged.setAttribute('data-to-chrome', '');
    foot(shell).f.append(forged);
    forged.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    // (The guard stops the click: nothing after it sees one.)
    expect(followed).toEqual([true, true]);
    await until(() => !!document.querySelector('to-dialog.to-link-guard dialog[open]'));
  } finally {
    document.removeEventListener('click', see);
    document.querySelectorAll('dialog[open]').forEach((d) => (d as HTMLDialogElement).close());
  }
});

// The templates dialog (Paul, 2026-10-11: "Align the previews to the far left"): each preview is its row's first column,
// flush with the dialog's content edge (the heading's), and at the top of its row beside the template's name, however
// long the blurb under the name; the Blank row's highlight is the same row, so its preview lines up with the others.
async function openTemplates(shell: HTMLElement, app: string) {
  await until(() => !!shell.querySelector('.to-app'));
  const tpl = shell.querySelector<HTMLElement>(`.to-app[aria-label="${app}"] to-templates`) as ToTemplates;
  tpl.show();
  // Blank is drawn at once, its preview with it; the templates come with their file. Waiting on the first preview alone
  // measured Blank by itself when the file was slow (main, 2026-10-12: "no blurb taller than its preview: 0/94"), so
  // the wait is for the templates themselves, every one with its preview.
  await until(() => {
    const options = tpl.querySelectorAll('dialog[open] [role=option]');
    return options.length > 1 && [...options].every((o) => !!o.querySelector('svg'));
  });
  // Measured in the site's own type: the self-hosted faces are loaded before a height is read.
  await document.fonts.ready;
  return tpl;
}
/** Each preview against the heading's edge (the left, or the right in a right-to-left language) and its name's top. */
function previews(tpl: ToTemplates) {
  const rtl = getComputedStyle(tpl.dialog).direction === 'rtl';
  const h = tpl.dialog.querySelector('h2')!.getBoundingClientRect();
  return [...tpl.dialog.querySelectorAll<HTMLElement>('[role=option]')].map((o) => {
    const thumb = o.querySelector('.to-thumb')!.getBoundingClientRect();
    const name = o.querySelector('.to-option-words > span')!.getBoundingClientRect();
    const blurb = o.querySelector('small')?.getBoundingClientRect().height ?? 0;
    return { edge: rtl ? h.right - thumb.right : thumb.left - h.left, top: thumb.top - name.top, long: blurb > thumb.height, blurb, thumb: thumb.height };
  });
}

for (const [w, h] of [
  [390, 844],
  [1100, 800],
] as const)
  test(`at ${w}px each template's preview sits at the dialog's content edge and at the top of its row, beside its name`, async () => {
    await page.viewport(w, h);
    const tpl = await openTemplates(await mount(''), 'Word Processor');
    try {
      const rows = previews(tpl);
      // A blurb taller than the preview is there to be beside (Cover letter's five lines on a phone).
      if (w === 390)
        expect(
          rows.some((r) => r.long),
          `no blurb taller than its preview: ${rows.map((r) => `${Math.round(r.blurb)}/${Math.round(r.thumb)}`).join(' ')}`,
        ).toBe(true);
      // One column on a phone: every preview at the edge; two on a wide screen: the first column's.
      const edges = rows.map((r) => Math.round(r.edge));
      if (w === 390) expect(edges.every((e) => Math.abs(e) < 1)).toBe(true);
      else expect(Math.abs(Math.min(...edges))).toBeLessThan(1);
      for (const r of rows) expect(Math.abs(r.top)).toBeLessThan(2);
    } finally {
      tpl.hide();
    }
  });

test('right to left, the previews sit at the far right, at the top of their rows', async () => {
  await page.viewport(390, 844);
  const shell = await mount('');
  await setLanguage('ar');
  await until(() => document.documentElement.dir === 'rtl');
  const name = (await import('../../src/kit/core/apps.ts')).apps().find((a) => a.id === 'write')!.name;
  const tpl = await openTemplates(shell, name);
  try {
    for (const r of previews(tpl)) {
      expect(Math.abs(r.edge)).toBeLessThan(1);
      expect(Math.abs(r.top)).toBeLessThan(2);
    }
  } finally {
    tpl.hide();
  }
});

// The home page's rows (Paul, 2026-10-11: "Align the icons in the main menu to the top so they stay there when we zoom"):
// at 200% an app's name wraps between its words, and its icon stays beside the first line.
test('at the largest size on a phone, an app whose name wraps keeps its icon beside the first line', async () => {
  await page.viewport(390, 844);
  keepSize(SIZE_MAX);
  const shell = await mount('');
  await until(() => !!shell.querySelector('.to-app-open'));
  const rows = firstLines(shell.querySelector('.to-apps')!);
  expect(rows.filter((r) => r.wraps && r.beside).length).toBeGreaterThan(0);
  expect(rows.filter((r) => !r.beside && !r.under)).toEqual([]);
});

// The search over the documents (Paul, 2026-10-12: "Get rid of 'search your documents' if there are no documents or we
// are in private mode"): there only when Save in browser is on and something is kept.
test('no search box under Private, a library in memory or not; none when Saved with nothing kept; the box once one is kept', async () => {
  const { keep, forgetAll } = await import('../../src/kit/share/library.ts');
  const { setKeeping, store } = await import('../../src/kit/core/store.ts');
  const doc = { id: 'a', app: 'write', title: 'Plans', hash: `#/v1/write/${encodeDoc('---\ntitle: Plans\n---\nGo.\n')}`, at: Date.now() };
  try {
    // Private, a list written to the visit's memory as an old build did.
    setKeeping(false);
    store.set('tinyoffice.library', JSON.stringify([doc]));
    let shell = await mount('');
    await until(() => !!shell.querySelector('.to-app'));
    expect(shell.querySelector('.to-search')).toBeNull();
    expect(shell.querySelector('.to-drive')).toBeNull();
    // Saved, nothing kept.
    setKeeping(true);
    forgetAll();
    shell = await mount('');
    await until(() => !!shell.querySelector('.to-app'));
    expect(shell.querySelector('.to-search')).toBeNull();
    // Saved, one kept.
    keep(doc);
    shell = await mount('');
    await until(() => !!shell.querySelector('.to-search'));
    expect(shell.querySelector<HTMLInputElement>('.to-search')!.placeholder).toBe('Search your documents');
  } finally {
    forgetAll();
    setKeeping(false);
  }
});

// The kept documents under an app line up with it (Paul, 2026-10-12: "The preview documents are supposed to be aligned
// with the app names and icons. They're indented very much to the right"): a preview's edge on the icon's, the gap from
// the preview to the words the gap from the icon to the name, and "n more" with them.
async function drive(lang: string | null) {
  const { keep, forgetAll } = await import('../../src/kit/share/library.ts');
  const { setKeeping } = await import('../../src/kit/core/store.ts');
  setKeeping(true);
  forgetAll();
  for (let i = 0; i < 7; i++) keep({ id: `d${i}`, app: 'write', title: `Plan ${i}`, hash: `#/v1/write/${encodeDoc(`---\ntitle: Plan ${i}\n---\nGo.\n`)}`, at: Date.now() - i });
  const shell = await mount('');
  if (lang) {
    await setLanguage(lang);
    await until(() => document.documentElement.lang === lang);
  }
  await until(() => !!shell.querySelector('.to-drive-open to-preview'));
  await document.fonts.ready;
  const app = shell.querySelector<HTMLElement>('.to-app:has(.to-drive)')!;
  const rtl = getComputedStyle(app).direction === 'rtl';
  const box = (sel: string) => app.querySelector(sel)!.getBoundingClientRect();
  // The start edge (left, or right in a right-to-left language), and how far past `from`'s far edge `to` begins.
  const start = (r: DOMRect) => (rtl ? -r.right : r.left);
  const after = (from: DOMRect, to: DOMRect) => (rtl ? from.left - to.right : to.left - from.right);
  const ico = box('.to-app-open > .to-icon');
  const name = box('.to-app-name');
  const more = app.querySelector<HTMLElement>('.to-drive-more')!;
  const ms = getComputedStyle(more);
  const moreWords = start(more.getBoundingClientRect()) + parseFloat(rtl ? ms.paddingRight : ms.paddingLeft);
  const rows = [...app.querySelectorAll('.to-drive-open')].map((a) => ({
    preview: a.querySelector('to-preview')!.getBoundingClientRect(),
    words: a.querySelector('.to-drive-words')!.getBoundingClientRect(),
  }));
  return {
    shell,
    forget: () => (forgetAll(), setKeeping(false)),
    rows: rows.map((r) => ({ edge: start(r.preview) - start(ico), gap: after(r.preview, r.words) - after(ico, name) })),
    more: moreWords - start(ico),
  };
}

for (const [w, h, lang] of [
  [390, 844, null],
  [1100, 800, null],
  [390, 844, 'ar'],
] as const)
  test(`at ${w}px${lang ? `, in ${lang}` : ''}, a kept document's preview sits on its app's icon's edge, its words as far from it as the name from the icon, "n more" with them`, async () => {
    await page.viewport(w, h);
    const d = await drive(lang);
    try {
      expect(d.rows.length).toBe(5);
      for (const r of d.rows) {
        expect(Math.abs(r.edge), `preview ${r.edge}px off the icon`).toBeLessThan(1);
        expect(Math.abs(r.gap), `words ${r.gap}px off`).toBeLessThan(1);
      }
      expect(Math.abs(d.more), `"n more" ${d.more}px off`).toBeLessThan(1);
    } finally {
      d.forget();
    }
  });

// The wordmark stands on the apps' edge (Paul, 2026-10-12: "On desktop, keep the logo aligned with the list of apps
// below"): its first letter on the first app's icon's edge at every width, the header's start the column's start and the
// wordmark's margin the row's inset; at 390 the header is still one row, the wordmark beside the menu button.
for (const [w, h, lang] of [
  [1440, 900, null],
  [1100, 800, null],
  [900, 800, null],
  [390, 844, null],
  [1440, 900, 'ar'],
] as const)
  test(`at ${w}px${lang ? `, in ${lang}` : ''}, the wordmark's first letter stands on the first app's icon's edge, the header one row`, async () => {
    await page.viewport(w, h);
    const shell = await mount('');
    if (lang) {
      await setLanguage(lang);
      await until(() => document.documentElement.lang === lang);
    }
    await until(() => !!shell.querySelector('.to-app-open > .to-icon') && !!shell.querySelector('.to-header > .to-brand'));
    await document.fonts.ready;
    const brand = shell.querySelector<HTMLElement>('.to-header > .to-brand')!;
    const rtl = getComputedStyle(brand).direction === 'rtl';
    const text = document.createTreeWalker(brand, NodeFilter.SHOW_TEXT, (n) => (n.textContent!.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP)).nextNode()!;
    const range = document.createRange();
    range.selectNodeContents(text);
    const words = range.getBoundingClientRect();
    const ico = shell.querySelector('.to-app-open > .to-icon')!.getBoundingClientRect();
    const off = rtl ? ico.right - words.right : words.left - ico.left;
    expect(Math.abs(off), `the wordmark ${off}px off the icon's edge`).toBeLessThan(1);
    // One row: the header its token's height, the words inside it and clear of the menu button.
    const header = shell.querySelector<HTMLElement>('.to-header')!;
    const probe = document.createElement('i');
    probe.style.cssText = 'position:absolute;display:block;height:var(--to-header-h)';
    header.append(probe);
    const rowH = probe.getBoundingClientRect().height;
    probe.remove();
    const hr = header.getBoundingClientRect();
    const burger = shell.querySelector('.to-burger')!.getBoundingClientRect();
    expect(Math.abs(hr.height - rowH), `header ${hr.height}px, a row ${rowH}px`).toBeLessThan(1);
    expect(words.top).toBeGreaterThanOrEqual(hr.top);
    expect(words.bottom).toBeLessThanOrEqual(hr.bottom);
    expect(rtl ? burger.right - words.left : words.right - burger.left, 'the wordmark runs under the menu button').toBeLessThanOrEqual(0);
  });

// A press at the spot the templates list opened under is not a choice for the first moment (Paul, 2026-10-12: "Sometimes
// when I click a template the link to an app underneath opens up"): the list's first rows land where the button was, and
// a double tap, a slow tap or a finger that pressed again chose Blank and opened the app. Real presses, through the
// browser's own input (touch emulated, as a phone's), at points in this frame mapped to the page's.
function onPage(x: number, y: number): { x: number; y: number } {
  const f = window.frameElement?.getBoundingClientRect();
  const s = f ? f.width / innerWidth : 1;
  return { x: (f?.left ?? 0) + x * s, y: (f?.top ?? 0) + y * s };
}
async function tap(x: number, y: number) {
  const p = onPage(x, y);
  await cdp().send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [p] });
  await cdp().send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
async function click(x: number, y: number, clickCount = 1) {
  const p = onPage(x, y);
  await cdp().send('Input.dispatchMouseEvent', { type: 'mousePressed', ...p, button: 'left', clickCount });
  await cdp().send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...p, button: 'left', clickCount });
}
/** The middle of an element, in this frame. */
const middle = (el: Element): [number, number] => {
  const r = el.getBoundingClientRect();
  return [r.left + r.width / 2, r.top + r.height / 2];
};
/** A home page with the Outliner's list ready to open under a finger or a mouse, and what to read after a press. */
async function underPress(w: number, h: number) {
  await page.viewport(w, h);
  const shell = await mount('');
  await until(() => !!shell.querySelector('.to-app'));
  const tpl = shell.querySelector<HTMLElement>('.to-app[aria-label="Outliner"] to-templates') as ToTemplates;
  // The templates are in before the press, so the list does not grow under the finger while the test reads it.
  await preloadTemplates(tpl.app);
  return { tpl, open: () => tpl.dialog.open, hash: () => location.hash };
}
const touch = (on: boolean) => cdp().send('Emulation.setTouchEmulationEnabled', on ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });

test('390×844 with a finger: taps again where the templates button was, 120, 300 and 700 ms on, choose nothing; a tap there 600 ms after the last chooses', async () => {
  await touch(true);
  try {
    const { tpl, open, hash } = await underPress(390, 844);
    const [x, y] = middle(tpl.button);
    await tap(x, y);
    await until(open, 'the list never opened');
    const at = performance.now();
    // What the spot holds once the list is open: an option (Blank, on a phone), the one a second tap chose.
    expect(document.elementFromPoint(x, y)?.closest('[role=option]'), 'no option under the button').toBeTruthy();
    for (const gap of [120, 300, 700]) {
      await until(() => performance.now() - at >= gap, 2000);
      await tap(x, y);
      await tick(40);
      expect(open(), `a tap ${gap} ms on closed the list`).toBe(true);
      expect(hash(), `a tap ${gap} ms on opened an app`).toBe('');
    }
    // The rule lapses: the spot pressed again past the half second chooses the option there.
    await tick(600);
    await tap(x, y);
    await until(() => !open(), 'a tap 600 ms after the last chose nothing');
    expect(hash()).toMatch(/^#\/v1\/outline/);
  } finally {
    await touch(false);
    document.querySelectorAll('dialog[open]').forEach((d) => (d as HTMLDialogElement).close());
  }
});

test('390×844 with a finger: a tap 120 ms after the list opened, on an option 40px or more away, chooses it', async () => {
  await touch(true);
  try {
    const { tpl, open, hash } = await underPress(390, 844);
    const [x, y] = middle(tpl.button);
    await tap(x, y);
    await until(open, 'the list never opened');
    const at = performance.now();
    // A template's row, not the one under the spot (Blank, whose middle may be that far along its row).
    const under = document.elementFromPoint(x, y)?.closest('[role=option]');
    const away = [...tpl.dialog.querySelectorAll('[role=option]')]
      .filter((o) => o !== under)
      .map(middle)
      .find(([ox, oy]) => Math.hypot(ox - x, oy - y) >= 40)!;
    await until(() => performance.now() - at >= 120, 2000);
    await tap(...away);
    await until(() => !open(), 'a tap away from the spot chose nothing');
    expect(hash()).toMatch(/^#\/v1\/outline\//);
  } finally {
    await touch(false);
  }
});

test('1100 wide with a mouse: a double click on the templates button leaves the list open with nothing chosen', async () => {
  const { tpl, open, hash } = await underPress(1100, 800);
  try {
    const [x, y] = middle(tpl.button);
    await click(x, y, 1);
    await click(x, y, 2);
    await tick(40);
    expect(open()).toBe(true);
    expect(hash()).toBe('');
    // A key still chooses at once: Enter on the option in hand.
    tpl.listbox.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    tpl.listbox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await until(() => !open(), 'Enter chose nothing');
    expect(hash()).toMatch(/^#\/v1\/outline/);
  } finally {
    document.querySelectorAll('dialog[open]').forEach((d) => (d as HTMLDialogElement).close());
  }
});

// Last in the file: the version once read is kept (kit/core/version.ts running), so the foot of every mount after this would carry it.
test('the foot ends with the build’s version once /version.json is read: its tag, or its commit’s first seven letters (Paul, 2026-10-12)', async () => {
  const real = globalThis.fetch;
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url.endsWith('/version.json'))
      return new Response(JSON.stringify({ commit: 'abcdef0123456789abcdef0123456789abcdef01', tag: 'v9.9.9', built: '2026-10-12T00:00:00Z', csp: { scripts: [] } }), {
        headers: { 'content-type': 'application/json' },
      });
    return real(input, init);
  });
  try {
    const shell = await mount('');
    await until(() => foot(shell).lines[0].endsWith(' · v9.9.9'), 'the version never reached the foot');
    expect(foot(shell).lines[0]).toBe('An Aboard Foundry project. Made with respect in New York City. · Beta version · GitHub · Email · v9.9.9');
    expect(foot(shell).links.map((a) => a.textContent)).toEqual(['Aboard Foundry', 'GitHub', 'Email']);
  } finally {
    vi.unstubAllGlobals();
  }
});

// Issue #6 (Paul, 2026-10-15): on the home page the drawer lists the documents saved under its switch too, and a
// document deleted there is gone from its app's list on the page at once.
test("the home page's drawer lists the documents saved under the switch; Delete there takes it from the app's list too; a tap opens one", async () => {
  const { keep, forgetAll } = await import('../../src/kit/share/library.ts');
  const { setKeeping } = await import('../../src/kit/core/store.ts');
  setKeeping(true);
  forgetAll();
  const plans = `#/v1/write/${encodeDoc('---\ntitle: Plans\n---\nGo.\n')}`;
  try {
    keep({ id: 'p', app: 'write', title: 'Plans', hash: plans, at: Date.now() });
    keep({ id: 'b', app: 'sheet', title: 'Budget', hash: `#/v1/sheet/${encodeDoc('a,b\n1,2\n')}`, at: Date.now() - 1000 });
    const shell = await mount('');
    await until(() => shell.querySelectorAll('.to-drive li').length === 2);
    shell.querySelector<HTMLButtonElement>('.to-burger')!.click();
    const dialog = shell.querySelector<HTMLDialogElement>('dialog.to-drawer')!;
    await until(() => dialog.open && !!dialog.querySelector('.to-saved'));
    const names = () => [...dialog.querySelectorAll('.to-saved .to-found-words > span')].map((s) => s.textContent);
    expect(names()).toEqual(['Plans', 'Budget']);
    dialog.querySelector<HTMLButtonElement>('.to-saved button[aria-label="Delete Budget"]')!.click();
    await until(() => names().join() === 'Plans');
    await until(() => shell.querySelectorAll('.to-drive li').length === 1);
    dialog.querySelector<HTMLAnchorElement>('.to-saved a.to-saved-open')!.click();
    await until(() => location.hash === plans);
    await until(() => !dialog.open);
    await until(() => !!shell.querySelector('to-write-editor'));
  } finally {
    forgetAll();
    setKeeping(false);
    history.replaceState(null, '', location.pathname);
  }
});

test("the home page's drawer, Save in browser on and nothing saved: the line that says so", async () => {
  const { forgetAll } = await import('../../src/kit/share/library.ts');
  const { setKeeping } = await import('../../src/kit/core/store.ts');
  setKeeping(true);
  forgetAll();
  try {
    const shell = await mount('');
    shell.querySelector<HTMLButtonElement>('.to-burger')!.click();
    const dialog = shell.querySelector<HTMLDialogElement>('dialog.to-drawer')!;
    await until(() => dialog.open);
    expect(dialog.querySelector('.to-drawer-save .to-saved-none')!.textContent).toBe('Nothing saved yet.');
    dialog.close();
  } finally {
    setKeeping(false);
  }
});
