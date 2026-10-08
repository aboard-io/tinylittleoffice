/**
 * The page view: the document as a web page in a sandboxed frame of its
 * own (its scripts run, but it cannot reach this one). With a form, the
 * page is editable in place: every field whose words appear in it can be
 * typed into, and a bar along the bottom adds rows. Changes come back as
 * messages, the only way the frame can speak to us.
 */
import { html, state, fontsForPictures, slug, type TemplateResult } from '../kit.ts';
import { DiagramElement } from './diagram.ts';
import { EDIT_SCRIPT, PLACE_SCRIPT, editData, placeData } from '../lib/pageedit.ts';
import { blockEnd, fieldsOf, headLevel, kindsOf, movePart, readLines, removePart, removeRow, writeLines, type Row } from '../lib/lines.ts';

export class PageView extends DiagramElement {
  /** The fonts, as CSS, for the page shown in its frame. */
  @state() private faces = '';

  /** While someone types in the page, the page is left alone (reloading it would lose their place); the text changes underneath. */
  private held: string | null = null;
  /** The row being typed in, in the page. */
  private pageRow = -1;
  /** Where to put the cursor once the page is drawn again: a row, or a row and field with the cursor at the end. */
  private focusRow: number | string = -1;
  private settle = 0;
  /** The page last given to the frame. */
  private lastSrc = '';
  /** The hash the frame is showing (a site's page), so the frame drawn afresh opens on it. */
  private pageHash = '';

  /** The page's parts: its headings as [id, row, kind name], the id being what the page calls that part. Outer headings first, so a page is found before a section of the same name. */
  private parts(rows: Row[]): [string, number, string][] {
    const form = this.spec.form!;
    const { kinds } = kindsOf(form);
    return rows
      .map((r, i) => (kinds[r.kind].head ? ([slug(r.values[0]), i, kinds[r.kind].name] as [string, number, string]) : null))
      .filter((p): p is [string, number, string] => !!p)
      .sort((a, b) => headLevel(form, rows[a[1]].kind) - headLevel(form, rows[b[1]].kind));
  }

  private onPageMessage = (e: MessageEvent) => {
    const frame = this.querySelector<HTMLIFrameElement>('.diagram.page iframe');
    if (!frame || e.source !== frame.contentWindow || !e.data || typeof e.data.lf !== 'string' || !this.spec.form) return;
    const form = this.spec.form;
    const m = e.data as { lf: string; r?: number; f?: number; v?: string; k?: number; h?: string; do?: string };
    const rows = readLines(this.textOf(this.doc), form);
    if (m.lf === 'hash') {
      this.pageHash = m.h ?? '';
      return;
    }
    // A new row starts with its fields' names as its words, so it shows up on the page to be typed into (a number where a number is wanted).
    const fresh = (kind: number): Row => ({
      kind,
      values: fieldsOf(form, kind).map((f) => (f.type === 'choice' ? f.options[0] : f.type === 'date' ? new Date().toISOString().slice(0, 10) : f.type === 'icon' ? '' : /amount|price|quantity|qty|stars|value|lowest|highest|width|depth|left|top|semitones|how much/i.test(f.name) ? '10' : f.name)),
      depth: kindsOf(form).kinds[kind].at ?? 0,
    });
    if (m.lf === 'focus') this.pageRow = m.r!;
    else if (m.lf === 'set' && rows[m.r!]) {
      // (The page as it is on screen, script and all: swapping in a plain one would lose the cursor.)
      this.held ??= this.lastSrc;
      rows[m.r!].values[m.f!] = m.v ?? '';
      this.type(writeLines(rows, form));
      // Once the typing pauses, the page is drawn afresh (its sums and all), with the cursor back where it was.
      clearTimeout(this.settle);
      this.settle = window.setTimeout(() => {
        this.held = null;
        this.focusRow = `${m.r},${m.f}`;
        this.requestUpdate();
      }, 900);
    } else if (m.lf === 'done') {
      clearTimeout(this.settle);
      this.held = null;
      this.requestUpdate();
    } else if (m.lf === 'enter' || m.lf === 'add') {
      const kind = m.lf === 'add' ? m.k! : rows[m.r!]?.kind;
      if (kind === undefined) return;
      const k = kindsOf(form).kinds[kind];
      // Where it goes: after the row being typed in, else in the part on show.
      const after = m.lf === 'enter' ? m.r! : this.pageRow >= 0 ? this.pageRow : (this.parts(rows).find((p) => '#' + p[0] === this.pageHash)?.[1] ?? -1);
      const top = rows.findIndex((r) => !kindsOf(form).kinds[r.kind].once);
      const level = headLevel(form, kind);
      let at = k.once ? (top < 0 ? rows.length : top) : after >= 0 && after < rows.length ? (k.indent ? blockEnd(rows, form, after) : after + 1) : rows.length;
      if (level && !k.once) {
        // A heading goes after the part it belongs in: the heading of its level (or above) that holds the row, with all that is under it; before the first such heading when none does (a new page after the home page).
        let enclosing = Math.min(after, rows.length - 1);
        while (enclosing >= 0 && !(headLevel(form, rows[enclosing].kind) && headLevel(form, rows[enclosing].kind) <= level)) enclosing--;
        const first = rows.findIndex((r) => headLevel(form, r.kind) && headLevel(form, r.kind) <= level);
        at = enclosing >= 0 ? blockEnd(rows, form, enclosing) : first >= 0 ? first : rows.length;
      }
      this.held = null;
      this.focusRow = at;
      this.putRows([...rows.slice(0, at), fresh(kind), ...rows.slice(at)]);
    } else if (m.lf === 'remove' && rows[this.pageRow]) {
      this.held = null;
      this.putRows(removeRow(rows, form, this.pageRow));
      this.pageRow = -1;
    } else if (m.lf === 'part' && rows[m.r!] && kindsOf(form).kinds[rows[m.r!].kind].head) {
      // A heading and all that is under it (a page with its sections) moved past its neighbour, or taken away.
      const moved = m.do === 'remove' ? removePart(rows, form, m.r!) : movePart(rows, form, m.r!, m.do === 'up' ? -1 : 1);
      if (!moved) return;
      this.held = null;
      this.pageRow = -1;
      if (m.do === 'remove') this.pageHash = '';
      this.putRows(moved);
    }
  };

  /** The page as it stands, for its frame. */
  private pageHtml(): string {
    const spec = this.spec;
    const text = this.textOf(this.doc);
    // Drawn afresh, the page goes back to the part it was showing.
    return (text.trim() ? spec.page!(this.doc) : spec.page!(spec.example)).replace('<head>', `<head><style>${this.faces}</style>`).replace('</body>', placeData(this.pageHash) + PLACE_SCRIPT + '</body>');
  }

  /**
   * The page, made editable in place: every field whose words appear in
   * it as they are can be typed into; a bar along the bottom adds rows.
   * Changes come back as messages (the frame is sandboxed: this is the
   * only way it can speak to us), and are written into the text.
   */
  private editablePage(): string {
    const form = this.spec.form!;
    const text = this.textOf(this.doc);
    if (!text.trim()) return this.pageHtml();
    const rows = readLines(text, form);
    const { kinds } = kindsOf(form);
    const values = rows.flatMap((r, i) => r.values.map((v, f) => [i, f, v, fieldsOf(form, r.kind)[f].name] as const).filter(([, , v, , ]) => v.trim().length > 1 && fieldsOf(form, r.kind).length));
    const adds = kinds.map((k, i) => ({ name: k.name, hidden: k.is === '' || (k.once && rows.some((r) => r.kind === i)) }));
    const focus = typeof this.focusRow === 'string' ? this.focusRow : this.focusRow >= 0 ? `${this.focusRow},` : '';
    this.focusRow = -1;
    const script = `<style>[data-lf]{outline:1px dashed rgba(79,70,229,.5);outline-offset:2px;border-radius:3px;cursor:text;min-width:1ch;display:inline-block}[data-lf]:focus{outline:2px solid #4f46e5;background:#eef2ff;color:#18181b}
#lf-bar{position:fixed;left:0;right:0;bottom:0;z-index:9;display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:8px 10px;background:rgba(255,255,255,.96);border-top:1px solid #e4e4e7;font:13px system-ui,sans-serif}
#lf-bar button{font:inherit;padding:5px 11px;border:1px dashed #4f46e5;background:#fff;color:#4338ca;border-radius:999px;cursor:pointer}#lf-bar button:focus-visible{outline:2px solid #4f46e5}
#lf-x{margin-left:auto;border-color:#dc2626;color:#b91c1c}#lf-bar span{color:#52525b;margin-right:4px}</style>
${editData(values, adds, focus, this.parts(rows))}${EDIT_SCRIPT}`;
    return this.pageHtml().replace('</body>', script + '</body>');
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('message', this.onPageMessage);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('message', this.onPageMessage);
  }

  protected get kind() {
    return 'page';
  }
  protected picture(): TemplateResult {
    if (!this.faces) void fontsForPictures().then((faces) => (this.faces = faces || ' '));
    const text = this.textOf(this.doc);
    return html`<iframe title="${this.name}, as a page" sandbox="allow-scripts allow-popups allow-forms" srcdoc=${(this.lastSrc = this.held ?? (this.form ? this.editablePage() : this.pageHtml()))} class=${text.trim() ? '' : 'sample'}></iframe>`;
  }
}
