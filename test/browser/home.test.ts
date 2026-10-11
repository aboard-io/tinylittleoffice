// The home page's foot (Paul, 2026-10-11): "Made with respect by Aboard · GitHub · Email us", Aboard a link to aboard.com,
// GitHub the repository, Email us a mail link; the sites open in a new tab, in the page's language.
import { afterEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { setLanguage } from '../../src/kit/i18n.ts';
import { keepSize, SIZE_MAX } from '../../src/kit/zoom.ts';
import type { ToTemplates } from '../../src/kit/home.ts';
import { firstLines } from './firstline.ts';
import { mount, until } from './helpers.ts';

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

test('the home page ends with who made it, where its source is and how to write, one line of links', async () => {
  const shell = await mount('');
  await until(() => !!shell.querySelector('to-home footer.to-home-foot'));
  const { f, lines, links } = foot(shell);
  // Below the apps, last in the page.
  expect(f.previousElementSibling!.classList.contains('to-apps')).toBe(true);
  expect(f.nextElementSibling).toBeNull();
  expect(lines).toEqual(['Made with respect by Aboard · GitHub · Email us']);
  expect(links.map((a) => [a.textContent, a.href, a.target, a.rel])).toEqual([
    ['Aboard', 'https://aboard.com/', '_blank', 'noopener'],
    ['GitHub', 'https://github.com/aboard-io/tinylittleoffice', '_blank', 'noopener'],
    ['Email us', 'mailto:hello+tlo@aboard.com', '', ''],
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
  await until(() => foot(shell).lines[0] !== 'Made with respect by Aboard');
  const { lines, links } = foot(shell);
  expect(lines).toEqual(['Fait avec respect par Aboard · GitHub · Nous écrire']);
  expect(links.map((a) => [a.textContent, a.href])).toEqual([
    ['Aboard', 'https://aboard.com/'],
    ['GitHub', 'https://github.com/aboard-io/tinylittleoffice'],
    ['Nous écrire', 'mailto:hello+tlo@aboard.com'],
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
  await until(() => !!tpl.querySelector('dialog[open] [role=option] svg'));
  return tpl;
}
/** Each preview against the heading's edge (the left, or the right in a right-to-left language) and its name's top. */
function previews(tpl: ToTemplates) {
  const rtl = getComputedStyle(tpl.dialog).direction === 'rtl';
  const h = tpl.dialog.querySelector('h2')!.getBoundingClientRect();
  return [...tpl.dialog.querySelectorAll<HTMLElement>('[role=option]')].map((o) => {
    const thumb = o.querySelector('.to-thumb')!.getBoundingClientRect();
    const name = o.querySelector('.to-option-words > span')!.getBoundingClientRect();
    return { edge: rtl ? h.right - thumb.right : thumb.left - h.left, top: thumb.top - name.top, long: (o.querySelector('small')?.getBoundingClientRect().height ?? 0) > thumb.height };
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
      if (w === 390) expect(rows.some((r) => r.long)).toBe(true);
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
  const name = (await import('../../src/kit/apps.ts')).apps().find((a) => a.id === 'write')!.name;
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
