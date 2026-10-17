// An app built outside the suite (docs/library.md, An app built outside), as its author makes it with
// `tinylittleoffice/kit` and the kernel and nothing else: a tally of marks, its definition, its editor (a DocElement
// of a few lines), its own commands and its own words in English and Spanish, registered beside the suite's apps and
// mounted on a bare page. Typed in, it tells the page each change's ops, which applied to the text before give the text
// after; Mod+Z takes the change back, as in any app; its key and its bar's button run its command; read-only, an item
// activated is picked; and in another language its words are that language's. Everything is imported from src/kit.ts
// and the kernel's entry (src/kernel.ts), the two an app built outside has, and nothing from the kit's own modules, so
// this file is also the proof that the kit's surface is enough.
import { expect, test } from 'vitest';
import {
  DocElement,
  UI,
  addStrings,
  appOf,
  cmdTool,
  commandsOf,
  defineApp,
  html,
  mount,
  nothing,
  onLanguage,
  rect,
  registerApp,
  runKey,
  setLanguage,
  t,
  text,
  type DocPick,
  type Picked,
} from '../../src/kit.ts';
import { applyAll, parse, plainText, write, type Doc, type Op } from '../../src/kernel.ts';
import { until } from './wait.ts';

/** A mark of the tally: its block, and its words. */
interface Mark {
  at: number;
  words: string;
}
const marksOf = (doc: Doc): Mark[] => doc.blocks.flatMap((b, at) => (b.k === 'li' ? [{ at, words: plainText(b.runs) }] : []));

/** The tally's editor: each mark a line of words typed where it is drawn, its bar the command and undo, read-only a list to pick from. */
class TallyEditor extends DocElement<Mark[]> {
  private off?: () => void;
  protected read(doc: Doc): Mark[] {
    return marksOf(doc);
  }
  connectedCallback() {
    super.connectedCallback();
    this.off = onLanguage(() => this.requestUpdate());
    this.addEventListener('keydown', this.onKey);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.off?.();
    this.removeEventListener('keydown', this.onKey);
  }
  private onKey = (e: KeyboardEvent) => runKey(e, TALLY, this);
  add() {
    this.edit([{ op: 'splice', at: this.doc.blocks.length, n: 0, blocks: [{ k: 'li', depth: 0, runs: [] }] }]);
  }
  private type(m: Mark, words: string) {
    this.edit([{ op: 'text', at: m.at, from: 0, to: m.words.length, runs: [{ t: words }] }], `tally:${m.at}`);
  }
  protected pickOf(el: Element): Picked | null {
    const li = el.closest<HTMLElement>('li[data-at]');
    return li ? { at: Number(li.dataset.at), mark: Number(li.dataset.n) } : null;
  }
  render() {
    return html`${this.readOnly ? nothing : html`<to-bar>${cmdTool(ADD, this)}${this.undoTools()}</to-bar>`}
      <ol class="tally">
        ${this.view.map(
          (m, n) =>
            html`<li data-at=${m.at} data-n=${n}>
              <input .value=${m.words} aria-label=${t('tally-mark-n', { n: n + 1 })} ?readonly=${this.readOnly} @input=${(e: Event) => this.type(m, (e.target as HTMLInputElement).value)} />
            </li>`,
        )}
      </ol>`;
  }
}
customElements.define('tally-editor', TallyEditor);

const cmd = commandsOf<TallyEditor>('tally');
const ADD = cmd('add', 'tally-add', { icon: UI.plus, keys: 'Alt+Shift+A', where: ['bar'], does: (ed) => ed.add() });
const TALLY = [ADD];

addStrings(
  'en',
  `tally-tally = Tally
tally-tally-lowercase = tally
tally-marks-counted = Marks counted, one a line.
tally-add = Add a mark
tally-mark-n = Mark { $n }
tally-n-marks = { $n ->
    [one] one mark
   *[other] { $n } marks
}
`,
);
// Spanish says what it has; the rest is said in English, as the site's own messages are.
addStrings('es', 'tally-tally = Recuento\ntally-add = Añadir una marca\ntally-mark-n = Marca { $n }\n');

const tally = defineApp({
  id: 'tally',
  get name() {
    return t('tally-tally');
  },
  get noun() {
    return t('tally-tally-lowercase');
  },
  get group() {
    return t('common-plan');
  },
  icon: UI.plus,
  get blurb() {
    return t('tally-marks-counted');
  },
  blank: () => '-\n',
  templates: async () => [],
  editor: async () => ({ tag: 'tally-editor' }),
  commands: async () => ({ default: TALLY }),
  title: (doc) => parse(doc).head.title ?? '',
  retitle: (doc, title) => write({ ...parse(doc), head: { ...parse(doc).head, title } }),
  view: (doc) => {
    const marks = marksOf(parse(doc));
    const svg = marks.map((m, i) => rect(16, 16 + i * 32, 8, 24, '#18181b') + text(32, 34 + i * 32, m.words)).join('');
    return [{ w: 480, h: 32 + marks.length * 32, svg, alt: t('tally-n-marks', { n: marks.length }) }];
  },
});
registerApp(tally);

/** What a page sharing the document hears, in order: each change's ops, then its text. */
type Heard = { ops: Op[]; base: number } | string;
async function mounted(start: string, readOnly = false) {
  document.body.innerHTML = '<main></main>';
  const heard: Heard[] = [];
  const m = await mount('tally', start, document.querySelector('main')!, (next) => heard.push(next), { readOnly, onOps: (ops, base) => heard.push({ ops, base }) });
  const input = (n: number) => m.editor.querySelectorAll('input')[n];
  return { ...m, heard, input };
}

test('an app built outside the suite is registered, found by its id, drawn small by its own view, and named in its words', () => {
  expect(appOf('tally')).toBe(tally);
  expect([tally.name, tally.noun, tally.blurb]).toStrictEqual(['Tally', 'tally', 'Marks counted, one a line.']);
  const [page] = tally.view('- Milk\n- Eggs\n');
  expect([page.h, page.alt, page.svg.includes('>Eggs<')]).toStrictEqual([96, '2 marks', true]);
  expect(() => registerApp(tally)).toThrow('an app "tally" is registered already');
});

test('mounted and typed in, it tells the page each change as ops that applied to the text before give the text after, and Mod+Z takes it back', async () => {
  const start = '- One\n- Two\n';
  const { editor, heard, input } = await mounted(start);
  expect(editor.tagName.toLowerCase()).toBe('tally-editor');
  expect([...editor.querySelectorAll('input')].map((i) => i.value)).toStrictEqual(['One', 'Two']);
  const box = input(1);
  box.value = 'Two!';
  box.dispatchEvent(new InputEvent('input', { bubbles: true }));
  await until(() => heard.length === 2, 'the change was never told');
  const [said, after] = heard as [{ ops: Op[]; base: number }, string];
  expect(said.base).toBe(0);
  expect(write(applyAll(parse(start), said.ops))).toBe(after);
  expect(after).toBe('- One\n- Two!\n');
  // Undo is the kit's: the page's Mod+Z, answered inside the editor (mount), takes the burst back with its inverse.
  box.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true }));
  await until(() => heard.length === 4, 'the undo was never told');
  const undo = heard[2] as { ops: Op[]; base: number };
  expect(undo.base).toBe(said.ops.length);
  expect(write(applyAll(parse(after), undo.ops))).toBe(start);
  expect(heard[3]).toBe(start);
});

test('its own command: drawn in its bar in its words, and run by its key and by its button', async () => {
  const { editor, heard, input } = await mounted('- One\n');
  const button = editor.querySelector<HTMLButtonElement>('to-bar button.cmd-tally-add')!;
  expect(button.getAttribute('aria-label')).toBe('Add a mark');
  const key = new KeyboardEvent('keydown', { key: 'A', code: 'KeyA', altKey: true, shiftKey: true, bubbles: true, cancelable: true });
  input(0).dispatchEvent(key);
  expect(key.defaultPrevented).toBe(true);
  await until(() => heard.at(-1) === '- One\n-\n', 'the key never added a mark');
  button.click();
  await until(() => heard.at(-1) === '- One\n-\n-\n', 'the button never added a mark');
});

test('read-only: no bar, nothing typed, and a mark activated is picked with its block and its own key', async () => {
  const text = '- One\n- Two\n';
  const { editor, heard, input } = await mounted(text, true);
  const picks: Picked[] = [];
  editor.addEventListener('docpick', (e) => picks.push((e as DocPick).detail));
  expect(editor.querySelector('to-bar')).toBeNull();
  const typed = new InputEvent('beforeinput', { inputType: 'insertText', data: 'x', bubbles: true, cancelable: true });
  input(0).dispatchEvent(typed);
  expect(typed.defaultPrevented).toBe(true);
  input(1).click();
  expect(picks).toStrictEqual([{ at: 1, mark: 1 }]);
  input(0).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  expect(picks.at(-1)).toStrictEqual({ at: 0, mark: 0 });
  expect(heard).toStrictEqual([]);
  expect(editor.value).toBe(text);
});

test('in another language its words are that language’s, and a word it lacks there is said in English', async () => {
  const { editor } = await mounted('- One\n');
  try {
    await setLanguage('es');
    expect([t('tally-tally'), tally.name, t('tally-tally-lowercase'), t('tally-mark-n', { n: 2 })]).toStrictEqual(['Recuento', 'Recuento', 'tally', 'Marca 2']);
    // The site's own words are Spanish too, and the editor drew itself again (onLanguage).
    expect(t('common-open')).toBe('Abrir');
    await until(() => editor.querySelector('button.cmd-tally-add')?.getAttribute('aria-label') === 'Añadir una marca', 'the bar never spoke Spanish');
  } finally {
    await setLanguage(null);
  }
  expect(t('tally-tally')).toBe('Tally');
});
