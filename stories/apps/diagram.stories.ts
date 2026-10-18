import type { Meta } from '@storybook/web-components-vite';
import { templates as list } from '../../src/apps/diagram/templates.ts';
import type { Template } from '../../src/editors.ts';
import { editorBox } from '../support.ts';
import { appMeta, blank, editable, readOnly, shared, templates, type AppArgs, type AppStory } from './app.ts';

/** The Diagram Maker: shapes with meaning from a few lines of text, eight kinds (mind map, org chart, swimlanes, Venn…). */
const meta = {
  title: 'Apps/Diagram Maker',
  component: 'to-diagram-editor',
  ...appMeta(
    'diagram',
    list().map((t) => t.id),
    'mind-launch',
  ),
} satisfies Meta<AppArgs>;
export default meta;

export const Editable = editable();
export const ReadOnly = readOnly();
export const Blank = blank('diagram');
export const Shared = shared('diagram');
export const Templates = templates('diagram');

type Loaded = { loaded: { templates: Template[] } };
const docOf = (ctx: unknown, id: string) => (ctx as Loaded).loaded.templates.find((t) => t.id === id)!;

/**
 * Read-only, as a host's page shows a diagram beside its records: no bar and no hint on how to edit, and a thing
 * activated (a click, a tap, Enter) fires "docpick" with its block, what it is and its words (the Actions panel says
 * them). A network, whose words are the page's ink in the dark, never a dark blue on its dark tint.
 */
export const ReadOnlyNetwork: AppStory = {
  args: { template: 'net-webapp', readOnly: true },
};
/**
 * A mind map whose middle idea is long (the launch plan's, its name and its blurb run together): its words wrap in
 * their box, and the first branches begin past it, never under it.
 */
export const LongMiddleIdea: AppStory = {
  args: { template: 'mind-launch', readOnly: true },
  render: (args, ctx) => {
    const tpl = docOf(ctx, 'mind-launch');
    return editorBox('diagram', tpl.doc.replace('- Launch :rocket:', `- ${tpl.name}: ${tpl.blurb} :rocket:`), { readOnly: args.readOnly });
  },
};
