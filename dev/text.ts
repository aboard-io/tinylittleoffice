/**
 * The editor alone, for looking at while Write does not exist: the three shapes side by side over the same
 * document, each applying its ops with the kernel and keeping its own op log, the TLO written under each.
 * Dev only (vite serves this folder; the build does not take it): npm run dev, then /dev/text.html.
 */
import { html, render } from 'lit';
import { applyAll, parse, write, type Doc } from '../src/doc/index.ts';
import { History } from '../src/kit/history.ts';
import { initLanguage } from '../src/kit/i18n.ts';
import type { Shape, TextOps, ToText } from '../src/kit/text.ts';
import { initTheme } from '../src/kit/theme.ts';
import '../src/styles.css';
import '../src/kit/text.ts';

const SAMPLE = `# A title {.title}

Some **bold** and *italic* words, a [link](https://example.com), an icon :star: and a footnote^[The note's words, with *marks*.] in the line.
A second line of the same paragraph.

## Lists

- one
- two
  - deeper
1. first
2. second

> A quote, as a speaker's note or an aside.

\`\`\`sheet
A | B:number
--- | ---
x | 1
\`\`\`

![A picture](https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png)

---

The last paragraph.
`;

class Pane {
  doc: Doc;
  history = new History();
  log: string[] = [];
  constructor(
    public shape: Shape,
    tlo: string,
  ) {
    this.doc = parse(tlo);
  }
  onOps = (e: CustomEvent<TextOps>) => {
    const { ops, sel, before, kind } = e.detail;
    const was = this.doc;
    this.doc = applyAll(was, ops);
    this.history.record(was, ops, before, sel, kind);
    this.log.unshift(ops.map((o) => o.op + ('at' in o ? ` @${o.at}` : '')).join(', '));
    this.log.length = Math.min(this.log.length, 6);
    draw();
  };
  step(which: 'undo' | 'redo', el: ToText) {
    const s = which === 'undo' ? this.history.undo() : this.history.redo();
    if (!s) return;
    this.doc = applyAll(this.doc, s.ops);
    draw();
    void el.updateComplete.then(() => s.sel && (el.sel = s.sel));
  }
}

const panes = [new Pane('doc', SAMPLE), new Pane('lines', "- a slide's bullets\n- in a lines editor\n\nand a paragraph\n"), new Pane('line', 'One line, as a card or an outline row\n')];

const pane = (p: Pane) => html`<section class="dev-pane">
  <h2>shape=${p.shape}</h2>
  <to-text shape=${p.shape} .blocks=${p.doc.blocks} label=${`A ${p.shape} editor`} placeholder="Write here." @text-ops=${p.onOps} @text-enter=${() => p.log.unshift('text-enter') && draw()} @text-exit=${() => p.log.unshift('text-exit') && draw()} @docundo=${(e: Event) => (e.preventDefault(), p.step('undo', e.target as ToText))} @docredo=${(e: Event) => (e.preventDefault(), p.step('redo', e.target as ToText))}></to-text>
  <pre class="dev-tlo">${write(p.doc)}</pre>
  <pre class="dev-log">${p.log.join('\n')}</pre>
</section>`;

const draw = () =>
  render(
    html`<style>
        body { margin: 0; padding: 16px; font: 15px/1.5 var(--to-font); background: var(--to-bg); color: var(--to-ink); }
        main { display: grid; gap: 24px; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); max-width: 1400px; margin: 0 auto; }
        h1 { font-size: 18px; margin: 0 0 12px; }
        .dev-pane h2 { font: 600 12px var(--to-font-mono); color: var(--to-ink-3); margin: 0 0 8px; }
        .dev-pane to-text { padding: 16px; background: var(--to-paper); border: 1px solid var(--to-border); border-radius: var(--to-radius); }
        .dev-tlo, .dev-log { margin: 8px 0 0; padding: 8px; font: 12px/1.4 var(--to-font-mono); white-space: pre-wrap; background: var(--to-surface-2); border-radius: var(--to-radius-sm); color: var(--to-ink-2); }
        .dev-log { min-height: 3em; color: var(--to-ink-3); }
      </style>
      <h1>&lt;to-text&gt; — Mod+Z undoes, Mod+B/I/U/K, Tab in a list, click a footnote mark</h1>
      <main>${panes.map(pane)}</main>`,
    document.body,
  );

initTheme();
void initLanguage().then(draw);
window.addEventListener('keydown', (e) => {
  if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
  const k = e.key.toLowerCase();
  const which = k === 'z' && !e.shiftKey ? 'docundo' : (k === 'z' && e.shiftKey) || k === 'y' ? 'docredo' : '';
  const el = (document.activeElement as HTMLElement | null)?.closest?.('to-text');
  if (which && el && !el.dispatchEvent(new CustomEvent(which, { cancelable: true, bubbles: true }))) e.preventDefault();
});
