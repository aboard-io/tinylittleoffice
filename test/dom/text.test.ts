// Write and Outline worked as a person would: words typed, documents pasted in and inserted, items nested, folded,
// moved and zoomed; checked by the text in the link and the files downloaded (ported from e2e/apps.spec.ts).
// Typing here sets an editable's words and sends the input event the browser would; the browser's own editing
// commands (execCommand: lists, a pasted plain link) are not in happy-dom, so those tests stay in e2e/apps.spec.ts.
import { test, expect } from 'vitest';
import { button, press } from './helpers.ts';
import { shell, reopen, editorOf, settleAll, bodyOf, until, choose, downloaded, opened } from './helpers-apps.ts';
import { insert } from './helpers-more.ts';
import { hashOf } from '../../src/kit/embed.ts';

/** Words typed into an editable box (a text, an outline's item), replacing what was there. */
async function typeRich(page: HTMLElement | null, words: string, html = false) {
  if (!page) throw new Error('nothing to type into');
  if (html) page.innerHTML = words;
  else page.textContent = words;
  page.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
  await settleAll();
}
/** Text pasted into an editable box. */
async function paste(page: HTMLElement, text: string) {
  const data = new DataTransfer();
  data.setData('text/plain', text);
  page.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  await settleAll();
}
/** A key pressed in a box, and the page caught up. */
async function key(el: Element | null, k: string, mods: { shift?: boolean; alt?: boolean; mod?: boolean } = {}) {
  press(el, k, mods);
  await settleAll();
}

test('write: other documents sit in the text as one thing each', async () => {
  const noteDoc = '# Spring launch {.title}\n\nWhat ships';
  const note = `${location.origin}/write/${hashOf('write', noteDoc)}`;
  const code = `${location.origin}/${hashOf('qr', 'https://example.com/')}`;
  await shell('#/v0/write');
  const editor = () => editorOf('write').querySelector<HTMLElement>('[role="textbox"][aria-label="Document"]')!;
  await typeRich(editor(), '<p>See the note:</p>', true);
  await paste(editor(), note);
  await paste(editor(), code);
  const embeds = () => [...editor().querySelectorAll<HTMLElement>('to-embed')];
  expect(embeds()).toHaveLength(2);
  const inside = (e: HTMLElement) => e.shadowRoot!.textContent ?? '';
  expect(inside(embeds()[0])).toContain('Spring launch');
  expect(inside(embeds()[0])).toContain('Write');
  // In the editor it is something to change, not a link that leaves the page.
  expect(embeds()[0].shadowRoot!.querySelectorAll('a')).toHaveLength(0);
  expect(embeds()[1].shadowRoot!.querySelector('svg[role="img"]')!.textContent).toContain('example.com');
  // They are not text: nothing can be typed into one, and the words around it are untouched.
  expect(embeds()[0].getAttribute('contenteditable')).toBe('false');
  expect(document.querySelector('.write-foot')!.textContent).toContain('3 words');
  // In the text, each is a fence named for its app, holding the document's own text.
  expect(bodyOf()).toContain('```write\n' + noteDoc + '\n```\n\n```qr\nhttps://example.com/\n```');

  await reopen();
  expect(embeds()).toHaveLength(2);
  expect(editor().textContent).toContain('See the note:');

  // The web page and rich text downloads carry the link and the picture.
  const page = await downloaded(() => choose('Download', /Web page/));
  const html = await page.text();
  expect(html).toContain(`${hashOf('write', noteDoc)}">Spring launch</a>`);
  expect(html).toContain('>example.com</text>');
  const rtf = await downloaded(() => choose('Download', /Rich Text/));
  expect(await rtf.text()).toContain(`HYPERLINK "${location.origin}/${hashOf('write', noteDoc)}"`);

  // Getting rid of one: its own Remove button, or one key when it has the focus.
  [...embeds()[1].shadowRoot!.querySelectorAll('button')].find((b) => /Remove/.test(b.getAttribute('aria-label') ?? ''))!.click();
  await settleAll();
  expect(embeds()).toHaveLength(1);
  embeds()[0].focus();
  await key(embeds()[0], 'Backspace');
  expect(embeds()).toHaveLength(0);
  expect(editor().textContent).toContain('See the note:');
  expect(bodyOf()).not.toContain('```');
});

test('write: an address typed by hand becomes a link once you leave the text, and Mod+click on a link asks before it opens in a new tab', async () => {
  await shell('#/v0/write');
  const editor = () => editorOf('write').querySelector<HTMLElement>('[role="textbox"][aria-label="Document"]')!;
  await typeRich(editor(), '<p>Read <a href="https://example.com/report">https://example.com/report</a> and say. Also http://example.org/x ok</p>', true);
  expect(editor().querySelectorAll('a')).toHaveLength(1);
  editor().dispatchEvent(new FocusEvent('blur'));
  await settleAll();
  expect([...editor().querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual(['https://example.com/report', 'http://example.org/x']);
  // A click on a link in the text asks first (the link guard), then Go opens it in a new tab.
  const before = opened().length;
  // (Mod+click: a plain click in the text puts the caret there and shows where the link goes.)
  editor().querySelector('a')!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }));
  await new Promise((r) => setTimeout(r, 0));
  const guard = document.querySelector('to-link-guard') as HTMLElement & { updateComplete: Promise<unknown> };
  await guard.updateComplete;
  expect(guard.querySelector('.lg-url')?.textContent).toBe('https://example.com/report');
  expect(opened().length).toBe(before);
  (guard.querySelector('.lg-go') as HTMLElement).click();
  expect(opened().at(-1)).toBe('https://example.com/report');
  const file = await downloaded(() => choose('Download', /Web page/));
  expect(await file.text()).toContain('<a href="https://example.com/report">');
});

test('outline: items under items, folded, moved, zoomed; OPML out', async () => {
  await shell('#/v0/outline');
  const ol = () => editorOf('outline');
  const item = (n: number) => ol().querySelector<HTMLElement>(`[role="textbox"][aria-label="Item ${n}"]`);
  const rows = () => ol().querySelectorAll('.ol-row');
  await typeRich(item(1), 'Launch');
  await key(item(1), 'Enter');
  expect(document.activeElement).toBe(item(2));
  await typeRich(item(2), 'Product');
  await key(item(2), 'Tab');
  await key(item(2), 'Enter');
  await typeRich(item(3), 'Pricing');
  await key(item(3), 'Tab');
  await key(item(3), 'Enter');
  await key(item(4), 'Tab', { shift: true });
  await key(item(4), 'Tab', { shift: true });
  await typeRich(item(4), 'Done');
  expect(location.hash).toMatch(/#\/v0\/outline\/[yzr]/);
  expect(bodyOf()).toBe('- Launch\n  - Product\n    - Pricing\n- Done');
  // Fold Launch: Product and Pricing hide, a count shows.
  ol().querySelector<HTMLElement>('.ol-row .ol-fold')!.click();
  await settleAll();
  expect(rows()).toHaveLength(2);
  expect(ol().querySelector('.ol-count')!.textContent).toBe('2');
  ol().querySelector<HTMLElement>('.ol-row .ol-fold')!.click();
  await settleAll();
  expect(rows()).toHaveLength(4);
  // Move Done up above Launch with Alt+Up.
  await key(item(4), 'ArrowUp', { alt: true });
  expect(bodyOf()).toBe('- Done\n- Launch\n  - Product\n    - Pricing');
  // Zoom in on Launch: only its family shows, with a way back.
  await key(item(2), '.', { mod: true });
  expect(rows()).toHaveLength(3);
  expect(ol().querySelector('.ol-crumbs')!.textContent).toContain('Launch');
  button(ol(), /Everything/).click();
  await settleAll();
  expect(rows()).toHaveLength(4);
  // OPML downloads.
  const opml = await downloaded(() => choose('Download', /OPML/));
  expect(opml.name).toBe('done.opml');
  expect(await opml.text()).toContain('text="Pricing"');
});

test('outline: a document as an item, made in its own editor; the outline seen as a deck and as a mind map', async () => {
  await shell({ app: 'outline', body: '- Done\n- Launch\n  - Product\n    - Pricing' });
  const ol = () => editorOf('outline');
  const item = (n: number) => ol().querySelector<HTMLElement>(`[role="textbox"][aria-label="Item ${n}"]`);
  // A document as an item: a table under Launch, made in its own editor.
  item(2)!.dispatchEvent(new FocusEvent('focusin', { bubbles: true, composed: true }));
  await insert(ol(), 'Insert', 'table');
  let sub: HTMLElement | null = null;
  await until(() => expect((sub = document.querySelector('sl-dialog.to-sub'))?.querySelector('input[aria-label="A1"]')).toBeTruthy());
  const a1 = sub!.querySelector<HTMLInputElement>('input[aria-label="A1"]')!;
  a1.dispatchEvent(new FocusEvent('focus'));
  a1.value = 'Budget';
  a1.dispatchEvent(new Event('input', { bubbles: true }));
  await settleAll();
  button(sub!, /Done/).click();
  await until(() => expect(ol().querySelectorAll('.ol-row to-embed')).toHaveLength(1));
  await settleAll();
  expect(bodyOf()).toMatch(/\n```sheet[^\n]*\n[^`]*Budget/);
  // The same text, as a deck: a slide for every level with something under it.
  const back = location.hash;
  // Open as another app: the same words, each app's link in a list (each opens a new tab; here, followed in this one).
  const seeAs = async (name: string, value: string) => {
    await choose('Download', /Open as another app/);
    const find = () => [...document.querySelectorAll<HTMLAnchorElement>('#open-as a')].find((a) => a.textContent!.trim() === name);
    await until(() => expect(find()).toBeTruthy());
    const link = find()!;
    expect(link.target).toBe('_blank');
    location.hash = link.getAttribute('href')!;
    await until(() => expect(location.hash).toMatch(new RegExp(`^#/v0/${value}/`)));
    await settleAll();
  };
  await seeAs('Deck', 'deck');
  await until(() => expect(document.querySelectorAll('.deck-rail .deck-thumb')).toHaveLength(3));
  // And, back at the outline, as a mind map.
  location.hash = back;
  await until(() => expect(document.querySelector('to-outline')).toBeTruthy());
  await settleAll();
  await seeAs('Mind map', 'mind');
  await until(() => expect(document.querySelector('to-mind .pic svg')?.textContent).toContain('Pricing'));
});

// A video, a post or a picture from the web: its address alone is the thing, shown as a card that loads it only when tapped.
test('write and outline: an address from the web is a card, loaded only on a tap; the text keeps the address alone', async () => {
  await shell('#/v0/write');
  const editor = () => editorOf('write').querySelector<HTMLElement>('[role="textbox"][aria-label="Document"]')!;
  await typeRich(editor(), '<p>Watch this:</p>', true);
  await paste(editor(), 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  const embed = () => editor().querySelector<HTMLElement>('to-embed')!;
  expect(embed()).toBeTruthy();
  const inside = () => embed().shadowRoot!;
  // The card: the provider named, nothing loaded, a button that loads it.
  expect(inside().textContent).toContain('YouTube');
  expect(inside().querySelector('iframe')).toBeNull();
  const load = inside().querySelector<HTMLButtonElement>('button.load')!;
  expect(load.textContent).toContain('Play');
  // The text holds the address and nothing else.
  expect(bodyOf()).toBe('Watch this:\n\nhttps://www.youtube.com/watch?v=dQw4w9WgXcQ');
  load.click();
  await settleAll();
  const frame = inside().querySelector('iframe')!;
  expect(frame.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  expect(frame.getAttribute('sandbox')).toContain('allow-scripts');
  // A picture is a Markdown image, with what it shows when that is said.
  await paste(editor(), 'https://example.org/sea.jpg');
  expect(bodyOf()).toContain('![](https://example.org/sea.jpg)');
  await reopen();
  expect(editor().querySelectorAll('to-embed')).toHaveLength(2);

  // In an outline, an item that is such an address is that thing.
  await shell('#/v0/outline');
  const ol = () => editorOf('outline');
  const item = (n: number) => ol().querySelector<HTMLElement>(`[role="textbox"][aria-label="Item ${n}"]`);
  await typeRich(item(1), 'Sources');
  await key(item(1), 'Enter');
  await key(item(2), 'Tab');
  await typeRich(item(2), 'https://bsky.app/profile/ftrain.com/post/3kqz2abcde2a');
  await until(() => expect(ol().querySelector('to-embed')).toBeTruthy());
  expect(ol().querySelector('to-embed')!.shadowRoot!.textContent).toContain('Bluesky');
  expect(bodyOf()).toBe('- Sources\n  - https://bsky.app/profile/ftrain.com/post/3kqz2abcde2a');
});
