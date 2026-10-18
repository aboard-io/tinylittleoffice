import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { action } from 'storybook/actions';
import { templates } from '../../../src/apps/write/templates.ts';
import { parse } from '../../../src/doc/index.ts';
import { noteMarks } from '../../../src/kit/draw/notes.ts';

/**
 * <to-notes> (kit/draw/notes.ts): a document's footnotes where they are listed, each note's words typed where they are
 * drawn. The host gives the notes' words in the order of their marks and answers what it hears ("note-change",
 * "note-back", "note-remove", told here to Actions). The notes are a Word Processor template's own.
 */
const each = templates()
  .map((t) => ({ id: t.id, notes: noteMarks(parse(t.doc).blocks).map((m) => m.fn) }))
  .filter((t) => t.notes.length);
/** Every template's notes, one list: more than any one template has. */
const withNotes = [{ id: 'every template', notes: each.flatMap((t) => t.notes) }, ...each];

const meta = {
  title: 'Kit/Draw/Notes',
  component: 'to-notes',
  args: { template: 'every template', backs: true },
  argTypes: {
    template: { control: 'select', options: withNotes.map((t) => t.id), description: 'A Word Processor template with footnotes, or the notes of every one' },
    backs: { description: '`backs`: a ↩ beside each note, back to its mark' },
  },
  render: ({ template, backs }) =>
    html`<to-notes
      .notes=${withNotes.find((t) => t.id === template)!.notes}
      ?backs=${backs}
      @note-change=${(e: CustomEvent) => action('note-change')(e.detail)}
      @note-back=${(e: CustomEvent) => action('note-back')(e.detail)}
      @note-remove=${(e: CustomEvent) => action('note-remove')(e.detail)}
    ></to-notes>`,
} satisfies Meta<{ template: string; backs: boolean }>;
export default meta;

export const Notes: StoryObj<{ template: string; backs: boolean }> = {};
