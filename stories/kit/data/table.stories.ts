import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { action } from 'storybook/actions';
import { html } from 'lit';
import { Trash2, SquareArrowOutUpRight } from 'lucide';
import type { RecordOption, RowAction, RowChange, TableColumn } from '../../../src/editors.ts';
import '../../../src/kit/ui/table.ts';
import { many, members, pipeline, type Lead, type Member } from './members.ts';

type Loaded = { loaded: Awaited<ReturnType<typeof members>> };
interface TableArgs {
  selectable: boolean;
  addable: boolean;
  filterable: boolean;
  hideable: boolean;
  /** What the page answers an edit with. */
  answer: 'keep' | 'refuse' | 'refuse later';
  /** How many rows: the roll, or the roll repeated. */
  count: number;
}

/**
 * <to-table>: a host's records as a typed table (docs/library.md, A typed table). Here the Spreadsheet's membership
 * roll: a person, words, a link, dates, money, a box and a status in its color. A click on a heading sorts by it
 * (Shift: as well), the arrows walk the cells, Enter (or a double click) edits a cell of an editable column, and every
 * event is told to the Actions panel. The page answers each edit: it keeps it, refuses it at once, or refuses it a
 * moment later, as a server would (`wait`), and the cell goes back. The toolbar's My and All are the page's, given in
 * the `toolbar` slot.
 */
const meta = {
  title: 'Kit/Data/Table',
  component: 'to-table',
  args: { selectable: true, addable: true, filterable: true, hideable: true, answer: 'keep', count: 0 },
  argTypes: {
    answer: { control: 'inline-radio', options: ['keep', 'refuse', 'refuse later'], description: 'What the page answers a "rowchange" with' },
    count: { control: 'number', description: 'Rows: 0 for the roll as it is, or the roll repeated to this many' },
  },
  loaders: [async () => members()],
  render: (args, ctx) => {
    const { rows, columns, title } = (ctx as unknown as Loaded).loaded;
    const shown = args.count ? many(rows, args.count) : rows;
    const onChange = (e: CustomEvent<RowChange<Member>>) => {
      action('rowchange')({ ...e.detail, row: e.detail.row.id });
      if (args.answer === 'refuse') e.preventDefault();
      if (args.answer === 'refuse later') e.detail.wait(new Promise((_, no) => setTimeout(() => no(new Error('refused')), 600)));
    };
    return html`<to-table
      .rows=${shown}
      .columns=${columns}
      label=${title}
      ?selectable=${args.selectable}
      ?addable=${args.addable}
      ?filterable=${args.filterable}
      ?hideable=${args.hideable}
      @rowchange=${onChange}
      @rowpick=${(e: CustomEvent) => action('rowpick')(e.detail.id)}
      @cellpick=${(e: CustomEvent) => action('cellpick')(e.detail.id, e.detail.column)}
      @selection=${(e: CustomEvent) => action('selection')(e.detail.ids)}
      @rowadd=${action('rowadd')}
      @sortchange=${(e: CustomEvent) => action('sortchange')(e.detail.sort)}
      @columnschange=${(e: CustomEvent) => action('columnschange')(e.detail.hidden)}
    >
      <div slot="toolbar" class="to-seg" role="group" aria-label=${title}>
        <button type="button" class="to-btn" aria-pressed="true">My</button><button type="button" class="to-btn" aria-pressed="false">All</button>
      </div>
    </to-table>`;
  },
} satisfies Meta<TableArgs>;
export default meta;

export const Members: StoryObj<TableArgs> = {};
/** The page refuses every edit a moment after it is made: the cell shows it, then goes back. */
export const Refused: StoryObj<TableArgs> = { args: { answer: 'refuse later' } };
/** 5,000 rows: only those in sight are drawn, so it sorts, scrolls and filters as quickly as the roll. */
export const FiveThousandRows: StoryObj<TableArgs> = { args: { count: 5000 } };
/** Nothing yet: the page's words for it, else the kit's. */
export const Empty: StoryObj<TableArgs> = {
  args: { count: 0 },
  render: (args, ctx) => html`<to-table .rows=${[]} .columns=${(ctx as unknown as Loaded).loaded.columns} ?addable=${args.addable}></to-table>`,
};
/** At a phone's width: the table scrolls sideways in its box, the boxes and the names stuck at the start. */
export const Narrow: StoryObj<TableArgs> = { decorators: [(story) => html`<div style="max-width: 22rem">${story()}</div>`] };

/**
 * A CRM's leads, the Board's sales pipeline as rows: the deal as wide as its widest words (`fit`), its company another
 * of the host's records (`type: 'record'`: a link, and edited by a picker that searches the host's companies, as a
 * server would, a moment after the last key, the id told in "rowchange"), wrapping where it is long (`wrap`, the row
 * grows), the value in whole dollars (`decimals: 0`). A deal won or lost is closed, and its row offers no field
 * (`editable(row)`); each row has its menu (`rowActions`: Open, and Delete in the danger color), told in "rowaction".
 */
export const Leads: StoryObj<TableArgs> = {
  loaders: [async () => ({ leads: await pipeline() })],
  render: (args, ctx) => {
    const { rows, companies, stages } = (ctx as unknown as { loaded: { leads: Awaited<ReturnType<typeof pipeline>> } }).loaded.leads;
    const open = (r: Lead) => r.stage !== 'Won' && r.stage !== 'Lost';
    const search = async (q: string, signal: AbortSignal): Promise<RecordOption[]> => {
      await new Promise((ok) => setTimeout(ok, 120));
      if (signal.aborted) return [];
      return companies.filter((c) => c.label.toLowerCase().includes(q.toLowerCase()));
    };
    const columns: TableColumn<Lead>[] = [
      { key: 'deal', label: 'Deal', type: 'text', fit: true, editable: open },
      { key: 'company', label: 'Company', type: 'record', search, wrap: true, width: 'minmax(8rem, 2fr)', editable: open },
      { key: 'stage', label: 'Stage', type: 'enum', options: stages, editable: open },
      { key: 'owner', label: 'Owner', type: 'person' },
      { key: 'value', label: 'Value', type: 'money', currency: 'USD', decimals: 0, editable: open },
      { key: 'close', label: 'Close', type: 'date', editable: open },
    ];
    const actions = (r: Lead): RowAction[] => [
      { id: 'open', label: `Open ${r.deal}`, icon: SquareArrowOutUpRight },
      { id: 'delete', label: 'Delete', icon: Trash2, danger: true },
    ];
    const onChange = (e: CustomEvent<RowChange<Lead>>) => {
      action('rowchange')({ ...e.detail, row: e.detail.row.id });
      if (args.answer === 'refuse') e.preventDefault();
      if (args.answer === 'refuse later') e.detail.wait(new Promise((_, no) => setTimeout(() => no(new Error('refused')), 600)));
    };
    return html`<to-table
      .rows=${rows}
      .columns=${columns}
      .rowActions=${actions}
      label="Leads"
      ?selectable=${args.selectable}
      ?filterable=${args.filterable}
      @rowchange=${onChange}
      @rowaction=${(e: CustomEvent) => action('rowaction')(e.detail.id, e.detail.action)}
      @rowpick=${(e: CustomEvent) => action('rowpick')(e.detail.id)}
      @cellpick=${(e: CustomEvent) => action('cellpick')(e.detail.id, e.detail.column)}
    ></to-table>`;
  },
};
/** The leads at a phone's width: the company's words wrap and the row grows, the actions stuck at the end. */
export const LeadsNarrow: StoryObj<TableArgs> = { ...Leads, decorators: [(story) => html`<div style="max-width: 22rem">${story()}</div>`] };
