import type { Meta } from '@storybook/web-components-vite';
import { templates as list } from '../../src/apps/write/templates.ts';
import { host } from '../../src/kit/core/host.ts';
import { editorBox } from '../support.ts';
import { appMeta, blank, editable, readOnly, shared, templates, type AppArgs, type AppStory } from './app.ts';

/** The Word Processor: rich text, tables that add up, footnotes, other documents held in the words. */
const meta = {
  title: 'Apps/Word Processor',
  component: 'to-write-editor',
  ...appMeta(
    'write',
    list().map((t) => t.id),
  ),
} satisfies Meta<AppArgs>;
export default meta;

export const Editable = editable();
export const ReadOnly = readOnly();
export const Blank = blank('write');
export const Shared = shared('write');
export const Templates = templates('write');
/** A text holding a table that adds up (the invoice): the table is <to-write-table>, typed in cell by cell. */
export const Table = { args: { template: 'invoice' }, parameters: { covers: ['to-write-table'] } } satisfies AppStory;
/** The contract, the kind of document several people write and review (Kit/Text/Changes draws who did what over it). */
export const Contract = { args: { template: 'contract' } } satisfies AppStory;

/** A text holding a host-kept picture (src/doc/image.ts): the fence names the host's reference, never an address of the web. */
const PICTURED = '# The stoop sale\n\nEverything must go.\n\n```image {alt="A table of records on the stoop" w=640 h=480}\nstory:stoop\n```\n\nCome early.\n';

/** A picture drawn here for the stub host: an SVG made on the page, served from a blob: address of the page's own, so the story fetches nothing. */
const stoop = () =>
  new Blob(
    [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><rect width="640" height="480" fill="#fde68a"/><rect x="120" y="260" width="400" height="120" fill="#92400e"/><circle cx="220" cy="230" r="40" fill="#1f2937"/><circle cx="320" cy="230" r="40" fill="#1f2937"/><circle cx="420" cy="230" r="40" fill="#1f2937"/></svg>',
    ],
    { type: 'image/svg+xml' },
  );

/**
 * A page that keeps pictures (docs/library.md, Images, where the host keeps them): a stub `host.images` that keeps each
 * file put in this tab, so Insert ▾ lists Picture… and a pasted or dropped picture file goes in. The stub is taken away
 * when the story is left, since the site, which every other story is, keeps none.
 */
export const Pictures = {
  argTypes: { template: { table: { disable: true } } },
  beforeEach: () => {
    const kept = new Map<string, Blob>([['story:stoop', stoop()]]);
    const urls = new Map<string, string>();
    Object.assign(host, {
      images: {
        maxBytes: 4 * 1024 * 1024,
        put: async (file: Blob) => {
          const ref = `story:${kept.size + 1}`;
          kept.set(ref, file);
          return { ref };
        },
        url: (ref: string) => {
          const blob = kept.get(ref);
          if (!blob) return '';
          if (!urls.has(ref)) urls.set(ref, URL.createObjectURL(blob));
          return urls.get(ref)!;
        },
        bytes: async (ref: string) => new Uint8Array(await (kept.get(ref) ?? new Blob()).arrayBuffer()),
      },
    });
    return () => {
      delete (host as { images?: unknown }).images;
      for (const u of urls.values()) URL.revokeObjectURL(u);
    };
  },
  render: (args) => editorBox('write', PICTURED, { readOnly: args.readOnly }),
} satisfies AppStory;
/** The same text on a page that keeps no pictures, as the site is: the picture is a card saying so, with its words, and nothing is fetched. */
export const PicturesNotKept = {
  argTypes: { template: { table: { disable: true } } },
  render: (args) => editorBox('write', PICTURED, { readOnly: args.readOnly }),
} satisfies AppStory;
