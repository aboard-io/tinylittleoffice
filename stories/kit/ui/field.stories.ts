import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { action } from 'storybook/actions';
import { html } from 'lit';
import type { FieldChange } from '../../../src/editors.ts';
import '../../../src/kit/ui/field.ts';
import { members, pipeline, type Member } from '../data/members.ts';

type Loaded = { loaded: Awaited<ReturnType<typeof members>> & { leads: Awaited<ReturnType<typeof pipeline>> } };
interface FieldArgs {
  readonly: boolean;
  /** What the page answers an edit with. */
  answer: 'keep' | 'refuse' | 'refuse later';
}

/**
 * <to-field>: one fact of a record changed where it is shown (docs/library.md, The kit's small pieces). Here a member
 * of the Spreadsheet's membership roll, a person's page as a host draws it: each fact its words (a link where it has
 * an address), and a click on them or the pencil makes it a field of its type; Enter or leaving keeps, Escape lets go,
 * and "fieldchange" is told, kept, refused at once, or refused a moment later as a server would, the words going back.
 * A record (a lead's company, in Record) is picked from the host's search rather than typed.
 */
const meta = {
  title: 'Kit/UI/Field',
  component: 'to-field',
  args: { readonly: false, answer: 'keep' },
  argTypes: { answer: { control: 'inline-radio', options: ['keep', 'refuse', 'refuse later'] } },
  loaders: [async () => ({ ...(await members()), leads: await pipeline() })],
  render: (args, ctx) => {
    const { rows, columns } = (ctx as unknown as Loaded).loaded;
    const m: Member = rows[0];
    const col = (key: string) => columns.find((c) => c.key === key)!;
    const on = (key: string) => (e: CustomEvent<FieldChange>) => {
      action('fieldchange')(key, e.detail.value, e.detail.before);
      if (args.answer === 'refuse') e.preventDefault();
      if (args.answer === 'refuse later') e.detail.wait(new Promise((_, no) => setTimeout(() => no(new Error('refused')), 600)));
    };
    const fact = (key: string, field: unknown) => html`<dt style="color: var(--to-ink-3); padding-top: 0.75rem">${col(key).label}</dt><dd style="margin: 0; min-width: 0">${field}</dd>`;
    return html`<dl style="display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 0 1rem; max-width: 28rem; margin: 0">
      ${fact('name', html`<to-field .value=${m.name} label=${col('name').label} ?readonly=${args.readonly} @fieldchange=${on('name')}></to-field>`)}
      ${fact('plot', html`<to-field .value=${m.plot} label=${col('plot').label} placeholder="No plot yet" ?readonly=${args.readonly} @fieldchange=${on('plot')}></to-field>`)}
      ${fact('email', html`<to-field type="email" .value=${m.email.label} href=${m.email.href} label=${col('email').label} ?readonly=${args.readonly} @fieldchange=${on('email')}></to-field>`)}
      ${fact('paid', html`<to-field type="date" .value=${m.paid} label=${col('paid').label} ?readonly=${args.readonly} @fieldchange=${on('paid')}></to-field>`)}
      ${fact('dues', html`<to-field type="money" currency="USD" .decimals=${0} .value=${m.dues} label=${col('dues').label} ?readonly=${args.readonly} @fieldchange=${on('dues')}></to-field>`)}
      ${fact('role', html`<to-field type="enum" .options=${col('role').options} .value=${m.role} label=${col('role').label} ?readonly=${args.readonly} @fieldchange=${on('role')}></to-field>`)}
    </dl>`;
  },
} satisfies Meta<FieldArgs>;
export default meta;

export const Facts: StoryObj<FieldArgs> = {};
/** The page refuses every edit a moment after it is made: the words show it, then go back. */
export const Refused: StoryObj<FieldArgs> = { args: { answer: 'refuse later' } };
/** Read-only: the words alone, no pencil. */
export const ReadOnly: StoryObj<FieldArgs> = { args: { readonly: true } };
/**
 * A record: a lead's company, one of the Board's pipeline's, picked from the host's search as it is typed (Down and
 * Up, Enter; emptied, none; Escape or leaving lets it go) and told with its id and the record chosen.
 */
export const Record: StoryObj<FieldArgs> = {
  render: (args, ctx) => {
    const { leads } = (ctx as unknown as Loaded).loaded;
    const lead = leads.rows[0];
    const search = async (q: string) => {
      await new Promise((ok) => setTimeout(ok, 150));
      return leads.companies.filter((c) => c.label.toLowerCase().includes(q.toLowerCase())).map((c) => ({ ...c, href: `#/companies/${c.id}` }));
    };
    const on = (e: CustomEvent<FieldChange>) => {
      action('fieldchange')(e.detail.value, e.detail.before, e.detail.record);
      if (args.answer === 'refuse') e.preventDefault();
      if (args.answer === 'refuse later') e.detail.wait(new Promise((_, no) => setTimeout(() => no(new Error('refused')), 600)));
    };
    return html`<dl style="display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 0 1rem; max-width: 28rem; margin: 0">
      <dt style="color: var(--to-ink-3); padding-top: 0.75rem">Deal</dt>
      <dd style="margin: 0; min-width: 0"><to-field .value=${lead.deal} label="Deal" readonly></to-field></dd>
      <dt style="color: var(--to-ink-3); padding-top: 0.75rem">Company</dt>
      <dd style="margin: 0; min-width: 0"><to-field type="record" .value=${lead.company} .search=${search} label="Company" placeholder="No company" ?readonly=${args.readonly} @fieldchange=${on}></to-field></dd>
    </dl>`;
  },
};
