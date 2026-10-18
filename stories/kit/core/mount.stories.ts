import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { apps, appOf } from '../../../src/editors.ts';
import { editorBox } from '../../support.ts';

/**
 * `mount(app, text, into, onChange, own)` (kit/core/mount.ts), what a page that holds an editor calls: the app's
 * editor made ready, drawn over the text, its "docchange", "docops" and "docpick" told to the Actions panel, its undo
 * and redo answered inside it. Any app of the suite, blank or over its first template.
 */
type MountArgs = { app: string; start: 'template' | 'blank'; readOnly: boolean };

const meta = {
  title: 'Kit/Core/Mount',
  args: { app: 'write', start: 'template', readOnly: false },
  argTypes: {
    app: { control: 'select', options: apps().map((a) => a.id), description: 'The app’s id (`apps()`, the suite’s, in order)' },
    start: { control: 'inline-radio', options: ['template', 'blank'], description: 'Its first template, or `blank()`' },
    readOnly: { description: '`own.readOnly`: shown, not edited' },
  },
  loaders: [async ({ args }) => ({ first: (await appOf(args.app as string)!.templates())[0]?.doc })],
  render: (args, { loaded }) => {
    const def = appOf(args.app)!;
    return editorBox(args.app, args.start === 'blank' ? def.blank() : ((loaded.first as string | undefined) ?? def.blank()), { readOnly: args.readOnly });
  },
} satisfies Meta<MountArgs>;
export default meta;

export const Mount: StoryObj<MountArgs> = {};
/** The same, read-only: the calendar keeps back, on and Today; the rest draw no bar. */
export const ReadOnly: StoryObj<MountArgs> = { args: { app: 'cal', readOnly: true } };
