/**
 * The page view: the document as a web page in a sandboxed frame of its
 * own (its scripts run, but it cannot reach this one). With a form, the
 * page is editable in place: every field whose words appear in it can be
 * typed into, and a "+" where it stands adds rows. Changes come back as
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

  /** The field the cursor went to since the last typing, so the page drawn afresh puts it there and not back where the typing was. */
  private moved: number | string | null = null;

  /** The document changed from outside (undo, an import): the page shows it as it now is. */
  protected loaded() {
    this.release();
    this.born = [];
  }

  /** Let go of the page held while typing, and of any redraw waiting for the typing to pause. */
  private release() {
    clearTimeout(this.settle);
    this.held = null;
  }

  /** The page's parts: its headings as [id, row, kind name], the id being what the page calls that part. Outer headings first, so a page is found before a section of the same name. */
  private parts(rows: Row[]): [string, number, string][] {
    const form = this.spec.form!;
    const { kinds } = kindsOf(form);
    return rows
      .map((r, i) => (kinds[r.kind].head ? ([slug(r.values[0]), i, kinds[r.kind].name] as [string, number, string]) : null))
      .filter((p): p is [string, number, string] => !!p)
      .sort((a, b) => headLevel(form, rows[a[1]].kind) - headLevel(form, rows[b[1]].kind));
  }
  /** Which drawing of the page is in the frame: a message from an earlier one (keys typed as it reloaded) is stale. */
  private stamp = 0;
  private stamped = '';
  /**
   * Rows made while the page is held (hints typed into), in the order they
   * were made, each where it went at the time: the page's row numbers are
   * from before any of them.
   */
  private born: { kind: number; at: number }[] = [];
  /** A row emptied out while the page was held: its numbers no longer hold, so the page is drawn again as soon as the cursor moves. */
  private stale = false;

  private onPageMessage = (e: MessageEvent) => {
    const frame = this.querySelector<HTMLIFrameElement>('.diagram.page iframe');
    if (!frame || e.source !== frame.contentWindow || !e.data || typeof e.data.lf !== 'string' || !this.spec.form) return;
    const form = this.spec.form;
    const m = e.data as { lf: string; s?: number; r?: number; f?: number; p?: number; v?: string; k?: number; n?: string; key?: string; shift?: boolean; h?: string; do?: string };
    // Which part of the page is on show (a site's page), so the page drawn afresh opens on it.
    if (m.lf === 'hash') return void (this.pageHash = m.h ?? '');
    // A shortcut pressed in the page (undo, redo, the text view) is the editor's: it goes on as if pressed here.
    if (m.lf === 'key') return void window.dispatchEvent(new KeyboardEvent('keydown', { key: m.key, shiftKey: m.shift, ctrlKey: true, bubbles: true }));
    if (m.s !== this.stamp) return;
    const rows = readLines(this.textOf(this.doc), form);
    const { kinds } = kindsOf(form);
    // A row number from the page, as it is now: each row made since pushes down the rows from where it went.
    const now = (r: number, from = 0) => this.born.slice(from).reduce((x, b) => (b.at <= x ? x + 1 : x), r);
    // The row a hint of this kind made, where it is now.
    const madeAt = (kind: number) => {
      const i = this.born.findIndex((b) => b.kind === kind);
      return i < 0 ? -1 : now(this.born[i].at, i + 1);
    };
    const redraw = (focus: number | string) => {
      this.release();
      this.focusRow = focus;
      this.requestUpdate();
    };
    // A new row starts with its fields' names as its words, so it shows up on the page to be typed into (a number where a number is wanted).
    const fresh = (kind: number): Row => ({
      kind,
      values: fieldsOf(form, kind).map((f) => (f.optional ? '' : f.type === 'choice' ? f.options[0] : f.type === 'date' ? new Date().toISOString().slice(0, 10) : f.type === 'icon' ? '' : /quantity|qty/i.test(f.name) ? '1' : /amount|price|stars|value|lowest|highest|width|depth|left|top|semitones|how much/i.test(f.name) ? '10' : f.name)),
      depth: 0,
    });
    // Where a row of a kind goes. The rows there is one of sit at the top in the form's order, and a new one goes among them; anything else goes after the row given (and what is under it), past the top, or last.
    const slot = (kind: number, after: number) => {
      const k = kinds[kind];
      const top = rows.findIndex((r) => !kinds[r.kind].once || (k.once && r.kind > kind));
      const base = top < 0 ? rows.length : top;
      if (k.once) return base;
      return after >= 0 && after < rows.length ? Math.max(base, k.indent ? blockEnd(rows, form, after) : after + 1) : rows.length;
    };
    const hold = () => (this.held ??= this.lastSrc);
    if (m.lf === 'focus') this.pageRow = now(m.r!);
    else if (m.lf === 'set') {
      // (The page as it is on screen, script and all: swapping in a plain one would lose the cursor.)
      hold();
      let r = m.r === undefined ? madeAt(m.k!) : now(m.r);
      if (r < 0) {
        // A hint typed into: its row is made, blank but for this field.
        r = slot(m.k!, -1);
        rows.splice(r, 0, { kind: m.k!, values: fieldsOf(form, m.k!).map(() => ''), depth: 0 });
        this.born.push({ kind: m.k!, at: r });
      }
      if (!rows[r]) return;
      rows[r].values[m.f!] = m.v ?? '';
      // A row emptied out goes; its hint, if the page has one, takes the cursor.
      const gone = !rows[r].values.some((v) => v.trim());
      if (gone) this.stale = true;
      const back = gone ? `+${rows[r].kind},${m.f},` : `${r},${m.f}${m.p === undefined ? '' : ',' + m.p}`;
      this.type(writeLines(rows, form));
      // Once the typing pauses, the page is drawn afresh (its sums and all), with the cursor where it now is: back here, or the field it has since gone to.
      clearTimeout(this.settle);
      this.settle = window.setTimeout(() => redraw(this.moved ?? back), 900);
      this.moved = null;
    } else if (m.lf === 'done') {
      // Nothing typed: the page stands as it is.
      if (!this.held) return;
      // The field the cursor moved to, as it will be numbered once the page is drawn again (a hint's row may have been made meanwhile).
      const to = m.n ? m.n.replace(/^\+?\d+/, (r) => (r.startsWith('+') ? (madeAt(+r.slice(1)) >= 0 ? String(madeAt(+r.slice(1))) : r) : String(now(+r)))) : -1;
      // Moving from field to field, the page stays as it is, so nothing typed into the next one is lost to a page being drawn again; it is drawn once the typing pauses, the cursor in the field it went to. Leaving the page, or after a row went, it is drawn now.
      if (m.n && !this.stale) {
        this.moved = to;
        clearTimeout(this.settle);
        this.settle = window.setTimeout(() => redraw(to), 900);
      } else redraw(to);
    } else if (m.lf === 'enter' || m.lf === 'add') {
      const after = m.r !== undefined ? now(m.r) : this.pageRow;
      const kind = m.lf === 'add' ? m.k! : rows[after]?.kind;
      if (kind === undefined) return;
      const k = kinds[kind];
      // With no row being typed in, a heading goes in the part on show.
      const near = after >= 0 ? after : (this.parts(rows).find((p) => '#' + p[0] === this.pageHash)?.[1] ?? -1);
      let at = slot(kind, near);
      const level = headLevel(form, kind);
      if (level && !k.once) {
        // A heading goes after the part it belongs in: the heading of its level (or above) that holds the row, with all that is under it; before the first such heading when none does (a new page after the home page).
        let enclosing = Math.min(near, rows.length - 1);
        while (enclosing >= 0 && !(headLevel(form, rows[enclosing].kind) && headLevel(form, rows[enclosing].kind) <= level)) enclosing--;
        const first = rows.findIndex((r) => headLevel(form, r.kind) && headLevel(form, r.kind) <= level);
        at = enclosing >= 0 ? blockEnd(rows, form, enclosing) : first >= 0 ? first : rows.length;
      }
      this.release();
      this.focusRow = at;
      this.putRows([...rows.slice(0, at), fresh(kind), ...rows.slice(at)]);
    } else if (m.lf === 'remove') {
      const r = m.r !== undefined ? now(m.r) : this.pageRow;
      if (!rows[r]) return;
      this.release();
      this.putRows(removeRow(rows, form, r));
      this.pageRow = -1;
    } else if (m.lf === 'part' && rows[m.r!] && kinds[rows[m.r!].kind].head) {
      // A heading and all that is under it (a page with its sections) moved past its neighbour, or taken away.
      const moved = m.do === 'remove' ? removePart(rows, form, m.r!) : movePart(rows, form, m.r!, m.do === 'up' ? -1 : 1);
      if (!moved) return;
      this.release();
      this.pageRow = -1;
      if (m.do === 'remove') this.pageHash = '';
      this.putRows(moved);
    }
  };

  /** The page as it stands, for its frame: the example while nothing is written. */
  private pageHtml(): string {
    const spec = this.spec;
    const text = this.textOf(this.doc);
    // Drawn afresh, the page goes back to the part it was showing.
    return this.framed(text.trim() ? spec.page!(this.doc) : spec.page!(spec.example), placeData(this.pageHash) + PLACE_SCRIPT);
  }

  /** A page for the frame: with the fonts, and with a script of ours at the end of its body. */
  private framed(page: string, script: string): string {
    return page.replace('<head>', `<head><style>${this.faces}</style>`).replace('</body>', script + '</body>');
  }

  /**
   * The page, made editable in place: every field whose words appear in
   * it as they are can be typed into; a "+" where it stands adds rows.
   * Changes come back as messages (the frame is sandboxed: this is the
   * only way it can speak to us), and are written into the text. Null
   * while nothing is written, unless the page has fields to type into
   * even then (the invoice's hints).
   */
  private editablePage(): string | null {
    const form = this.spec.form!;
    const text = this.textOf(this.doc);
    const page = this.spec.page!(this.doc, { edit: true });
    if (!text.trim() && !page.includes('data-lf')) return null;
    const rows = readLines(text, form);
    const { kinds } = kindsOf(form);
    const values = rows.flatMap((r, i) => r.values.map((v, f) => [i, f, v, fieldsOf(form, r.kind)[f].name] as const).filter(([, , v, , ]) => v.trim().length > 1 && fieldsOf(form, r.kind).length));
    const adds = kinds.map((k, i) => ({ name: k.name, hidden: k.is === '' || (k.once && rows.some((r) => r.kind === i)) }));
    const focus = typeof this.focusRow === 'string' ? this.focusRow : this.focusRow >= 0 ? `${this.focusRow},` : '';
    this.focusRow = -1;
    this.born = [];
    this.stale = false;
    // The same page drawn again (the document coming back from the shell, say) leaves the frame as it is: a new one would lose the cursor.
    const key = page + JSON.stringify([values, adds]);
    if (key === this.stamped && !focus && this.lastSrc) return this.lastSrc;
    // A new stamp for a new page, not for the same page with the cursor put somewhere.
    if (key !== this.stamped) (this.stamped = key), this.stamp++;
    const script = `<style>[data-lf]{outline:1px dashed rgba(79,70,229,.5);outline-offset:2px;border-radius:3px;cursor:text;min-width:1ch;display:inline-block}[data-lf]:focus{outline:2px solid #4f46e5;background:#eef2ff;color:#18181b}
[data-lf]:empty::before{content:attr(data-hint);color:#a1a1aa;font-weight:400}
.lf-menu{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0;padding:8px;background:#fff;border:1px solid #e4e4e7;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.14);font:13px system-ui,sans-serif;color:#18181b}
.lf-menu button{font:inherit;padding:5px 11px;border:1px dashed #4f46e5;background:#fff;color:#4338ca;border-radius:999px;cursor:pointer}.lf-menu button:focus-visible,.lf-plus:focus-visible{outline:2px solid #4f46e5}
.lf-foot{margin:1.5rem 0}.lf-foot .lf-plus{display:inline-grid;place-items:center;width:2rem;height:2rem;padding:0;border-radius:50%;border:1px dashed #4f46e5;background:#fff;color:#4338ca;font:600 1.2rem/1 system-ui,sans-serif;cursor:pointer}</style>
${placeData(this.pageHash)}${PLACE_SCRIPT}${editData(values, adds, focus, this.stamp)}${EDIT_SCRIPT}`;
    return this.framed(page, script);
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
    const edit = this.held ?? (this.form ? this.editablePage() : null);
    this.lastSrc = edit ?? this.pageHtml();
    return html`<iframe title="${this.name}, as a page" sandbox="allow-scripts allow-popups allow-forms" srcdoc=${this.lastSrc} class=${edit || this.textOf(this.doc).trim() ? '' : 'sample'}></iframe>`;
  }
}
