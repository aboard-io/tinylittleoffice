import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { templates } from '../../../src/apps/outline/templates.ts';
import { addStrings, appOf, cmdTool, commandsOf, defineApp, DocElement, html, nothing, onLanguage, rect, registerApp, runKey, t, text, UI, type Picked } from '../../../src/kit.ts';
import { parse, plainText, write, type Doc } from '../../../src/kernel.ts';
import { editorBox } from '../../support.ts';

/**
 * An app built outside the suite (docs/library.md, An app built outside), made here with `tinylittleoffice/kit` and the
 * kernel alone, as test/browser/kit.test.ts makes one: a tally of marks, its editor a DocElement of a few lines (`read`
 * gives the view, `edit` the ops, `pickOf` the item picked read-only, `undoTools` the bar's last two buttons), its own
 * command and words, registered beside the suite's apps and mounted as they are. Its marks are any list's items: the
 * story opens over the Outliner's first template.
 */
interface Mark {
  at: number;
  words: string;
}
const marksOf = (doc: Doc): Mark[] => doc.blocks.flatMap((b, at) => (b.k === 'li' ? [{ at, words: plainText(b.runs) }] : []));

const ID = 'sbtally';
const TAG = 'sb-tally-editor';

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
      <ol class="sb-tally">
        ${this.view.map(
          (m, n) =>
            html`<li data-at=${m.at} data-n=${n}>
              <input type="text" .value=${m.words} aria-label=${t('sbtally-mark-n', { n: n + 1 })} ?readonly=${this.readOnly} @input=${(e: Event) => this.type(m, (e.target as HTMLInputElement).value)} />
            </li>`,
        )}
      </ol>`;
  }
}

const ADD = commandsOf<TallyEditor>(ID)('add', 'sbtally-add', { icon: UI.plus, keys: 'Alt+Shift+A', where: ['bar'], does: (ed) => ed.add() });
const TALLY = [ADD];

// Once a page: an element and an app are each registered once, whatever story draws them again.
if (!customElements.get(TAG)) customElements.define(TAG, TallyEditor);
if (!appOf(ID)) {
  addStrings('en', `sbtally-tally = Tally\nsbtally-tally-lowercase = tally\nsbtally-marks = Marks counted, one a line.\nsbtally-add = Add a mark\nsbtally-mark-n = Mark { $n }\n`);
  addStrings('es', 'sbtally-tally = Recuento\nsbtally-add = Añadir una marca\nsbtally-mark-n = Marca { $n }\n');
  registerApp(
    defineApp({
      id: ID,
      get name() {
        return t('sbtally-tally');
      },
      get noun() {
        return t('sbtally-tally-lowercase');
      },
      get group() {
        return t('common-plan');
      },
      icon: UI.plus,
      get blurb() {
        return t('sbtally-marks');
      },
      blank: () => '-\n',
      templates: async () => [],
      editor: async () => ({ tag: TAG }),
      commands: async () => ({ default: TALLY }),
      title: (doc) => parse(doc).head.title ?? '',
      retitle: (doc, title) => write({ ...parse(doc), head: { ...parse(doc).head, title } }),
      view: (doc) => {
        const marks = marksOf(parse(doc));
        return [{ w: 480, h: 32 + marks.length * 32, svg: marks.map((m, i) => rect(16, 16 + i * 32, 8, 24, '#18181b') + text(32, 34 + i * 32, m.words)).join(''), alt: `${marks.length} marks` }];
      },
    }),
  );
}
const meta = {
  title: 'Kit/Core/DocElement',
  args: { readOnly: false },
  render: (args) => editorBox(ID, templates()[0].doc, { readOnly: args.readOnly }),
} satisfies Meta<{ readOnly: boolean }>;
export default meta;

/** The tally mounted: type in a mark, add one from the bar or with Alt+Shift+A, undo it; Actions shows the ops. */
export const AnAppOfItsOwn: StoryObj<{ readOnly: boolean }> = {};
/** Read-only: no bar, and a mark activated is a "docpick" with the app's own key, `mark`. */
export const ReadOnly: StoryObj<{ readOnly: boolean }> = { args: { readOnly: true } };
