import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { action } from 'storybook/actions';
import { html } from 'lit';
import { btn, cmdTool, command, tool, UI } from '../../../src/editors.ts';
import { dateNav } from '../../../src/kit/ui/bar.ts';

/** What the bar's buttons act on in these stories: a word's look, as an editor's selection would have it. */
interface Look {
  bold: boolean;
  italic: boolean;
}
const look: Look = { bold: true, italic: false };
const bold = command<Look>({ id: 'story.bold', scope: 'story', label: () => 'Bold', icon: UI.bold, keys: 'Mod+B', where: ['bar'], pressed: (c) => c.bold, does: action('story.bold') });
const italic = command<Look>({ id: 'story.italic', scope: 'story', label: () => 'Italic', icon: UI.italic, keys: 'Mod+I', where: ['bar'], pressed: (c) => c.italic, does: action('story.italic') });
const undo = command<Look>({ id: 'story.undo', scope: 'story', label: () => 'Undo', icon: UI.undo, keys: 'Mod+Z', where: ['bar'], pinned: true, disabled: () => true, does: action('story.undo') });

/**
 * <to-bar>: the one bar an app has, a single row that scrolls sideways when it must, a fade at either edge saying
 * there is more. Left and Right walk its buttons. Its buttons are made with `tool()` (an icon, its name spoken and a
 * tooltip) and `btn()` (words), or drawn from a command with `cmdTool()` and `cmdBtn()`.
 */
const meta = {
  title: 'Kit/UI/Bar',
  component: 'to-bar',
  args: { width: 100 },
  argTypes: { width: { control: { type: 'range', min: 20, max: 100, step: 5 }, description: 'The bar’s width, as a percent of the story’s: narrow it to see it scroll and fade' } },
} satisfies Meta<{ width: number }>;
export default meta;
type Story = StoryObj<{ width: number }>;

/** Icon buttons and buttons with words, one pressed, one disabled. */
export const Tools: Story = {
  render: ({ width }) =>
    html`<to-bar style="width:${width}%">
      ${btn({ label: 'Insert', icon: UI.plus, does: action('insert') })} ${tool({ label: 'Bold', icon: UI.bold, keys: 'Mod+B', pressed: true, does: action('bold') })}
      ${tool({ label: 'Italic', icon: UI.italic, keys: 'Mod+I', pressed: false, does: action('italic') })} ${tool({ label: 'Underline', icon: UI.underline, keys: 'Mod+U', does: action('underline') })}
      ${tool({ label: 'Strikethrough', icon: UI.strike, does: action('strike') })} ${tool({ label: 'Link', icon: UI.link, keys: 'Mod+K', does: action('link') })}
      ${tool({ label: 'List', icon: UI.list, does: action('list') })} ${tool({ label: 'Numbered list', icon: UI.listOrdered, does: action('numbered') })}
      ${tool({ label: 'Table', icon: UI.table, does: action('table') })} ${tool({ label: 'Picture', icon: UI.image, does: action('image') })}
      ${tool({ label: 'Print', icon: UI.print, disabled: true })} ${tool({ label: 'Undo', icon: UI.undo, keys: 'Mod+Z', pinned: true, does: action('undo') })}
      ${tool({ label: 'Redo', icon: UI.redo, keys: 'Mod+Shift+Z', pinned: true, disabled: true })}
    </to-bar>`,
};

/** Buttons drawn from commands of the registry in their context: their words, icons, keys and pressed state are the commands' own. */
export const Commands: Story = {
  render: ({ width }) => html`<to-bar style="width:${width}%">${cmdTool(bold, look)} ${cmdTool(italic, look)} ${cmdTool(undo, look)}</to-bar>`,
};

/** The group an app with dates has: back, what is on view, on, and Today. */
export const DateNav: Story = {
  render: ({ width }) =>
    html`<to-bar style="width:${width}%">${dateNav({ label: 'March 2027', prev: 'Previous month', next: 'Next month', onPrev: action('prev'), onNext: action('next'), onToday: action('today') })}</to-bar>`,
};
