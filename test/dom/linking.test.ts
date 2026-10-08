// Making links (Mod+K, the Link buttons), the bubble a click in one shows, and formatted text pasted in.
import { test, expect } from 'vitest';
import { mount, settle, press, button, type Editor } from './helpers.ts';
import type { ToLinkDialog } from '../../src/widgets/link-dialog.ts';
import type { ToWrite } from '../../src/apps/write.ts';

const page = (el: Element) => el.querySelector<HTMLElement>('.write-page')!;
const dialog = () => document.querySelector('to-link-dialog') as ToLinkDialog;
/** Select the given words inside a text box, as a person dragging over them. */
function selectWords(box: HTMLElement, words: string) {
  const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const at = n.textContent!.indexOf(words);
    if (at < 0) continue;
    const r = document.createRange();
    r.setStart(n, at);
    r.setEnd(n, at + words.length);
    getSelection()!.removeAllRanges();
    getSelection()!.addRange(r);
    return;
  }
  throw new Error(`no "${words}" in the text`);
}
/** Answer the link dialog: type the address (and words, when asked), then Link. */
async function answer(address: string, words?: string) {
  await new Promise((r) => setTimeout(r, 0));
  const d = dialog();
  await d.updateComplete;
  if (words !== undefined) {
    const w = d.querySelector('.ld-text') as HTMLElement & { value: string };
    w.value = words;
    w.dispatchEvent(new CustomEvent('sl-input', { bubbles: true }));
  }
  const u = d.querySelector('.ld-url') as HTMLElement & { value: string };
  u.value = address;
  u.dispatchEvent(new CustomEvent('sl-input', { bubbles: true }));
  await d.updateComplete;
  (d.querySelector('.ld-ok') as HTMLElement).click();
  await new Promise((r) => setTimeout(r, 0));
}

test('Mod+K links the selected words; the address gets its start', async () => {
  const { el, last } = await mount('write', 'Read our report today.');
  page(el).focus();
  selectWords(page(el), 'our report');
  press(page(el), 'k', { mod: true });
  await new Promise((r) => setTimeout(r, 0));
  expect(dialog().querySelector('.ld-words')!.textContent).toBe('Linking our report');
  await answer('example.com/report');
  await settle(el);
  expect(last()).toBe('Read [our report](https://example.com/report) today.');
  expect(page(el).querySelector('a')!.getAttribute('href')).toBe('https://example.com/report');
});

test('with nothing selected, the dialog asks for the words too, and puts them where the caret is', async () => {
  const { el, last } = await mount('write', 'Contact:');
  page(el).focus();
  const r = document.createRange();
  r.selectNodeContents(page(el).querySelector('p')!);
  r.collapse(false);
  getSelection()!.removeAllRanges();
  getSelection()!.addRange(r);
  button(el, 'Link').click();
  await answer('ada@example.com', 'Ada');
  await settle(el);
  expect(last()).toBe('Contact:[Ada](mailto:ada@example.com)');
});

test('a click in a link shows where it goes; Remove takes the link off and keeps the words', async () => {
  const { el, last } = await mount('write', 'See [the plan](https://a.co/plan) now');
  const a = page(el).querySelector('a')!;
  a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  await settle(el);
  const bubble = el.querySelector<HTMLElement>('.link-bubble')!;
  expect(bubble.querySelector('.lb-href')!.textContent).toBe('https://a.co/plan');
  // The address in the bubble opens it, asking first, as the arrow beside it does.
  (bubble.querySelector('.lb-href') as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  await new Promise((r) => setTimeout(r, 0));
  const guard = document.querySelector('to-link-guard') as HTMLElement & { updateComplete: Promise<unknown> };
  await guard.updateComplete;
  expect(guard.querySelector('.lg-url')!.textContent).toBe('https://a.co/plan');
  (guard.querySelector('.lg-cancel') as HTMLElement).click();
  a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  await settle(el);
  button(el.querySelector<HTMLElement>('.link-bubble')!, 'Remove link').click();
  await settle(el);
  expect(last()).toBe('See the plan now');
  expect(el.querySelector('.link-bubble')).toBeNull();
});

test('in a deck, the Link button links words in a bullet', async () => {
  const { el, last } = await mount('deck', 'Plan\nRead the brief');
  const bullets = [...el.querySelectorAll<ToWrite>('to-rich')].find((r) => r.textContent?.includes('Read the brief'))!;
  page(bullets).focus();
  page(bullets).dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
  selectWords(page(bullets), 'the brief');
  await settle(el);
  button(el, 'Link').click();
  await answer('https://a.co/brief');
  await settle(el);
  expect(last()).toBe('Plan\nRead [the brief](https://a.co/brief)');
});

test('formatted text pasted in keeps its headings, lists, marks and links, and nothing else', async () => {
  const { el, last } = await mount('write', '');
  page(el).focus();
  const html = `<meta charset="utf-8"><b style="font-weight:normal" id="docs-internal-guid-x"><h1>Plan</h1>
    <p>Some <strong>bold</strong> and <em>slanted</em> words, <a href="https://a.co/r">a report</a>, <a href="javascript:alert(1)">a trap</a>.</p>
    <ul><li>One</li><li>Two<ul><li>Two and a half</li></ul></li></ul><script>alert(1)</script><style>p{color:red}</style></b>`;
  const data = new DataTransfer();
  data.setData('text/html', html);
  data.setData('text/plain', 'Plan\nSome bold…');
  page(el).dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  await settle(el);
  expect(last()).toBe('# Plan\n\nSome **bold** and *slanted* words, [a report](https://a.co/r), a trap.\n\n- One\n- Two\n  - Two and a half');
});

test('pasted into one line (an outline item), formatted text keeps its marks and links in that line', async () => {
  const { el, last } = await mount('outline', 'Launch the');
  const box = page(el.querySelector('to-rich')!);
  box.focus();
  const r = document.createRange();
  r.selectNodeContents(box);
  r.collapse(false);
  getSelection()!.removeAllRanges();
  getSelection()!.addRange(r);
  const data = new DataTransfer();
  data.setData('text/html', '<p> <b>plan</b></p>\n  <p>see <a href="https://a.co">here</a></p>');
  data.setData('text/plain', ' plan see here');
  box.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  await settle(el);
  expect(last()).toBe('Launch the **plan** see [here](https://a.co)');
});

test('a heading cannot be unbolded: Bold is off there, Mod+B does nothing, and bold inside one is dropped', async () => {
  const { el, docs, last } = await mount('write', '# Title\n\n## Sub\n\nBody');
  const h1 = page(el).querySelector('h1')!;
  page(el).focus();
  getSelection()!.selectAllChildren(h1);
  document.dispatchEvent(new Event('selectionchange'));
  // (happy-dom answers no editing questions, so the heading is told to the toolbar by hand.)
  (el as unknown as { fmt: { block: string } }).fmt = { ...(el as unknown as { fmt: object }).fmt, block: 'h1' } as never;
  await settle(el);
  expect(button(el, 'Bold').hasAttribute('disabled')).toBe(true);
  press(page(el), 'b', { mod: true });
  await settle(el);
  expect(docs).toEqual([]);
  // Bold that found its way into a heading (pasted, say) is not kept.
  h1.innerHTML = '<b>Ti</b><span style="font-weight:normal">tle</span>';
  page(el).dispatchEvent(new Event('input', { bubbles: true }));
  await settle(el);
  expect(last()).toBe('# Title\n\n## Sub\n\nBody');
});

test('Title makes the paragraph the document’s title, set large; Date puts in a date picked from a calendar', async () => {
  const { el, last } = await mount('write', 'Annual report\n\nWords');
  const p0 = page(el).querySelector('p')!;
  page(el).focus();
  const r = document.createRange();
  r.selectNodeContents(p0);
  r.collapse(false);
  getSelection()!.removeAllRanges();
  getSelection()!.addRange(r);
  button(el, 'Title').click();
  await settle(el);
  expect(last()).toBe('# Annual report {.title}\n\nWords');
  expect(page(el).querySelector('h1.doc-title')!.textContent).toBe('Annual report');
  // Pressed again, it is a paragraph again.
  button(el, 'Title').click();
  await settle(el);
  expect(last()).toBe('Annual report\n\nWords');

  // A date: the dialog's calendar, then Insert; it goes where the caret was.
  const words = page(el).querySelectorAll('p')[1];
  const at = document.createRange();
  at.selectNodeContents(words);
  at.collapse(false);
  getSelection()!.removeAllRanges();
  getSelection()!.addRange(at);
  button(el, 'Date').click();
  await new Promise((res) => setTimeout(res, 0));
  const dialog = document.querySelector('to-date-dialog') as HTMLElement & { updateComplete: Promise<unknown> };
  await dialog.updateComplete;
  const day = dialog.querySelector('sl-input') as HTMLElement & { value: string };
  day.value = '2027-03-01';
  day.dispatchEvent(new CustomEvent('sl-input', { bubbles: true }));
  await dialog.updateComplete;
  expect([...dialog.querySelectorAll('label')].map((l) => l.textContent!.trim())).toEqual(['March 1, 2027', 'Monday, March 1, 2027', '2027-03-01']);
  (dialog.querySelector('.dd-ok') as HTMLElement).click();
  await settle(el);
  expect(last()).toBe('Annual report\n\nWordsMarch 1, 2027');
});
