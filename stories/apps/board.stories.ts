import type { Meta } from '@storybook/web-components-vite';
import { action } from 'storybook/actions';
import { registerBoard } from '../../src/board.ts';
import { templates as list } from '../../src/apps/board/templates.ts';
import { boardOf, fieldAs, setCell, type BoardView, type Card, type CardField } from '../../src/apps/board/model.ts';
import type { ToBoardEditor } from '../../src/apps/board/editor.ts';
import { applyAll, parse, serialToIso, write, type Op } from '../../src/doc/index.ts';
import { mount, type Mounted, type RowChange, type TableColumn, type TableRow } from '../../src/editors.ts';
import '../../src/kit/ui/table.ts';
import { box, editorBox } from '../support.ts';
import { appMeta, blank, editable, readOnly, shared, templates, type AppArgs, type AppStory } from './app.ts';

/**
 * The Board: cards in lanes by their status, each card a row of a table. An app of the library's that the site does not
 * list (docs/library.md, The library's own apps), so a page registers it, as this file does, before anything draws it.
 * Every story tells the Actions panel what the board tells its page: its changes, its picks, and a lane's change before
 * it is made (LaneEvents: "lanerename", "laneadd", "lanemove", "lanedelete", "lanelook").
 */
registerBoard();
const LANE_EVENTS = ['lanerename', 'laneadd', 'lanemove', 'lanedelete', 'lanelook'] as const;
/** The board's lanes' changes, told to the Actions panel as a page hears them. */
function told<T>(story: T): T {
  if (story instanceof HTMLElement) for (const type of LANE_EVENTS) story.addEventListener(type, (e) => action(type)((e as CustomEvent).detail));
  return story;
}
type Loaded = { loaded: { templates: { id: string; doc: string }[] } };
const pipeline = (ctx: unknown) => (ctx as Loaded).loaded.templates.find((t) => t.id === 'pipeline')!.doc;

const meta = {
  title: 'Apps/Board',
  component: 'to-board-editor',
  ...appMeta(
    'board',
    list().map((t) => t.id),
  ),
  decorators: [(story) => told(story())],
} satisfies Meta<AppArgs>;
export default meta;

export const Editable = editable();
export const ReadOnly = readOnly();
export const Blank = blank('board');
export const Shared = shared('board');
export const Templates = templates('board');

/**
 * A sales pipeline, as a CRM holds its leads: a deal a card, its stages the lanes. Each card its title, its company
 * under it, its value, its close date and its owner's initials, from the columns' types alone; each lane its count and
 * the sum of its values. Drag a card from anywhere on it; double-click a lane's name to rename it.
 */
export const Pipeline: AppStory = {
  args: { template: 'pipeline' },
  render: (_args, ctx) => editorBox('board', pipeline(ctx), { ready: (m) => ((m.editor as unknown as ToBoardEditor).laneTone = toneOf) }),
};
/** A pipeline's stages by kind, as a CRM knows them: Won won, Lost lost (`laneTone`), each drawn so. */
const toneOf = (name: string) => (name === 'Won' ? 'won' : name === 'Lost' ? 'lost' : null);

/**
 * The same pipeline as a CRM's page shows it: its cards carried and nothing else changed (`carry-only`), picked to
 * open (`pickable`: "docpick"), its lanes the CRM's own records (`own-lanes`: renamed, moved, added and deleted only by
 * the page, which hears "lanerename" and the rest: Add lane, after the last, tells "laneadd" and adds nothing), its
 * stages' kinds (`laneTone`: Won and Lost), and its cards' faces said by the page (`cardFields`): the company, the
 * value, the close date and the owner as a quiet name and value.
 */
const CARD_FIELDS: CardField[] = [{ column: 'Company', as: 'line' }, { column: 'Value' }, { column: 'Close' }, { column: 'Owner', as: 'text' }];
export const PipelineForAHost: AppStory = {
  argTypes: { template: { table: { disable: true } }, readOnly: { table: { disable: true } } },
  render: (_args, ctx) =>
    editorBox('board', pipeline(ctx), {
      ready: (m) => Object.assign(m.editor as unknown as ToBoardEditor, { carryOnly: true, pickable: true, ownLanes: true, cardFields: CARD_FIELDS, laneTone: toneOf }),
    }),
};

/**
 * The lanes' looks, from the document itself (the head's `lane-looks:`, model.ts): Inbound narrow, Negotiating wide
 * and amber, Won green, and Lost collapsed to a strip of its name and its count, which a tap opens; each lane's menu
 * changes them (Narrow lane, Widen lane, Collapse lane, Lane color…), told first as "lanelook" and written back into
 * the head. A card's look is the page's (`cardLook`): the deals closing soonest, within a month of the first, are
 * tinted amber. The story's play drags the Won lane left by its head, past Negotiating and Proposal, so it opens
 * with a lane dragged left (a "lanemove" in the Actions panel) and the rest to try by hand; a page whose stages are
 * its own records gives the looks with `laneLook(name)` instead, and hears "lanelook" with `own-lanes`.
 */
const LOOKS = 'Inbound=narrow, Negotiating=wide amber, Won=green, Lost=collapsed gray';
const looked = (ctx: unknown): string => write(applyAll(parse(pipeline(ctx)), [{ op: 'head', key: 'lane-looks', value: LOOKS }]));
/** The cards closing within a month of the one closing first, by the Close column's serial day: amber. */
function soonest(view: BoardView): (card: Card) => { tone: string } | null {
  const close = view.cols.findIndex((c) => c.name === 'Close');
  const days = view.cards.map((c) => c.values[close]).filter((x): x is number => typeof x === 'number');
  const soon = Math.min(...days) + 30;
  return (card) => (typeof card.values[close] === 'number' && card.values[close] <= soon ? { tone: 'amber' } : null);
}
/** Until `test` holds, a frame at a time; thrown after a while. */
async function until(test: () => boolean, ms = 10_000): Promise<void> {
  const end = Date.now() + ms;
  while (!test()) {
    if (Date.now() > end) throw new Error('the story never settled');
    await new Promise(requestAnimationFrame);
  }
}
export const LaneLooks: AppStory = {
  argTypes: { template: { table: { disable: true } }, readOnly: { table: { disable: true } } },
  render: (_args, ctx) =>
    editorBox('board', looked(ctx), {
      ready: (m) => {
        const el = m.editor as unknown as ToBoardEditor;
        el.cardLook = soonest(boardOf(parse(looked(ctx))));
      },
    }),
  play: async ({ canvasElement }) => {
    await until(() => canvasElement.querySelectorAll('.board-lane .board-head').length >= 6 && !!canvasElement.querySelector('[data-ready]'));
    const el = canvasElement.querySelector<ToBoardEditor>('to-board-editor')!;
    await el.updateComplete;
    const lane = (name: string) => canvasElement.querySelector<HTMLElement>(`.board-lane[aria-label="${name}"]`)!;
    const head = lane('Won').querySelector<HTMLElement>('.board-head')!;
    const from = head.getBoundingClientRect();
    const to = lane('Proposal').getBoundingClientRect();
    const at = (type: string, x: number, y: number) =>
      head.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, button: 0, pointerType: 'mouse', clientX: x, clientY: y }));
    at('pointerdown', from.left + 8, from.top + 8);
    at('pointermove', to.left + 12, to.top + 12);
    await el.updateComplete;
    at('pointerup', to.left + 12, to.top + 12);
  },
};

/** A row of a table that is a card: its row in the board's table as its id, and each column's value by its place (`c0`, `c1`…). */
type CardRow = TableRow & Record<string, unknown>;

/** The board's columns as a typed table's (kit/ui/table.ts): the lane a status of the lanes, money in its currency, a day, a box, a person; every one editable. */
function columnsOf(v: BoardView, currency?: string): TableColumn<CardRow>[] {
  return v.cols.map((c, i): TableColumn<CardRow> => {
    const base = { key: `c${i}`, label: c.name, editable: true };
    if (i === v.laneCol) return { ...base, type: 'enum', options: v.lanes.map((l) => ({ value: l.name })) };
    if (c.type === 'money') return { ...base, type: 'money', currency: c.currency || currency || 'USD' };
    if (c.type === 'date') return { ...base, type: 'date' };
    if (c.type === 'number' || c.type === 'percent') return { ...base, type: 'number' };
    if (c.type === 'check') return { ...base, type: 'boolean' };
    if (i !== v.titleCol && fieldAs(c) === 'person') return { ...base, type: 'person' };
    return { ...base, type: 'text' };
  });
}
/** The board's cards as the table's rows, lane by lane: each card's row worked out (`Card.values`), a day as "2026-12-15". */
function rowsOf(v: BoardView): CardRow[] {
  return v.cards.map((card) => {
    const row: CardRow = { id: String(card.row) };
    card.values.forEach((x, i) => (row[`c${i}`] = v.cols[i].type === 'date' && typeof x === 'number' ? serialToIso(x) : x));
    return row;
  });
}
/** A value the table hands back, as the cell's words: an amount as its number, a box ticked "x", a day as the table gives it. */
const cellOf = (value: unknown): string => (value === true ? 'x' : value === false || value === null || value === undefined ? '' : String(value));

/**
 * One document, two views: the Board and, beside it, the same cards as a typed table (`<to-table>`, the host's own),
 * edited in either and in step. The board's model gives a table what it needs: `boardOf(doc)` its columns (`cols`,
 * with their types) and its cards (`cards`, each its row worked out in `values`), and `setCell(doc, row, col, words)`
 * the ops for a cell the table changed (a lane's, a move to that lane). The table's edit goes to the board as another's
 * ops go (`applyRemote`), and the board's every change ("docchange") gives the table its rows again.
 */
export const BoardAndTable: AppStory = {
  argTypes: { template: { table: { disable: true } }, readOnly: { table: { disable: true } } },
  render: (_args, ctx) => {
    let text = pipeline(ctx);
    let board: Mounted | null = null;
    const row = box('sb-row');
    const left = box();
    left.dataset.app = 'board';
    const table = document.createElement('to-table');
    const draw = () => {
      const doc = parse(text);
      const v = boardOf(doc);
      Object.assign(table, { columns: columnsOf(v, doc.head.currency), rows: rowsOf(v), label: 'Pipeline' });
    };
    draw();
    table.addEventListener('rowchange', (e) => {
      const { id, column, value } = (e as CustomEvent<RowChange<CardRow>>).detail;
      const ops: Op[] = setCell(parse(text), Number(id), Number(column.slice(1)), cellOf(value));
      action('rowchange')({ id, column, value, ops });
      if (!ops.length) return void e.preventDefault();
      text = write(applyAll(parse(text), ops));
      board?.applyRemote(ops);
      // The table's rows again, from the document as it now is (a card moved is a row in another place).
      queueMicrotask(draw);
    });
    mount('board', text, left, (next) => {
      text = next;
      action('docchange')(next);
      draw();
    })
      .then((m) => {
        board = m;
        left.dataset.ready = '';
      })
      .catch((e) => console.error('mounting the board failed', e));
    const right = box();
    right.append(table);
    row.append(left, right);
    return row;
  },
};
