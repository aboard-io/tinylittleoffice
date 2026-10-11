// The home page's foot (Paul, 2026-10-11): "Made with respect by Aboard", Aboard a link to aboard.com, and "Open source",
// a link to the repository; each opens in a new tab, in the page's language.
import { afterEach, expect, test } from 'vitest';
import { setLanguage } from '../../src/kit/i18n.ts';
import { mount, until } from './helpers.ts';

afterEach(async () => {
  await setLanguage(null);
});

/** The foot's two lines, and the links in them. */
const foot = (shell: HTMLElement) => {
  const f = shell.querySelector<HTMLElement>('to-home footer.to-home-foot')!;
  return { f, lines: [...f.querySelectorAll('p')].map((p) => p.textContent!.trim()), links: [...f.querySelectorAll('a')] };
};

test('the home page ends with who made it and where its source is, each a link opening in a new tab', async () => {
  const shell = await mount('');
  await until(() => !!shell.querySelector('to-home footer.to-home-foot'));
  const { f, lines, links } = foot(shell);
  // Below the apps, last in the page.
  expect(f.previousElementSibling!.classList.contains('to-apps')).toBe(true);
  expect(f.nextElementSibling).toBeNull();
  expect(lines).toEqual(['Made with respect by Aboard', 'Open source']);
  expect(links.map((a) => [a.textContent, a.href, a.target, a.rel])).toEqual([
    ['Aboard', 'https://aboard.com/', '_blank', 'noopener'],
    ['Open source', 'https://github.com/aboard-io/tinylittleoffice', '_blank', 'noopener'],
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

test('the foot is said in the page’s language, the name Aboard kept and still the link', async () => {
  const shell = await mount('');
  await setLanguage('fr');
  await until(() => document.documentElement.lang === 'fr');
  await until(() => foot(shell).lines[0] !== 'Made with respect by Aboard');
  const { lines, links } = foot(shell);
  expect(lines).toEqual(['Fait avec respect par Aboard', 'Code source ouvert']);
  expect(links.map((a) => [a.textContent, a.href, a.rel])).toEqual([
    ['Aboard', 'https://aboard.com/', 'noopener'],
    ['Code source ouvert', 'https://github.com/aboard-io/tinylittleoffice', 'noopener'],
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
