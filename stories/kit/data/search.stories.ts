import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { action } from 'storybook/actions';
import { html } from 'lit';
import { apps, type SearchHit, type SearchKind, type Searcher } from '../../../src/editors.ts';
import { encodeDoc } from '../../../src/kit/core/codec.ts';
import { routeHash } from '../../../src/kit/core/route.ts';
import { fold } from '../../../src/kit/share/search.ts';
import '../../../src/kit/ui/search-box.ts';
import { templatesOf } from '../../support.ts';

/** The apps a page opens, in the story where the rest have nowhere to open. */
const OPENS = ['write', 'sheet', 'deck'];
type Loaded = { loaded: { hits: SearchHit[]; kinds: Record<string, SearchKind> } };
interface SearchArgs {
  dialog: boolean;
  hotkey: boolean;
  /** How the page's search answers. */
  answer: 'at once' | 'slowly' | 'failing';
  /** Only the Word Processor's, the Spreadsheet's and the Presentation Builder's open: the rest listed, not chosen. */
  nowhere?: boolean;
}

/**
 * <to-search>: one search across every kind of thing a host keeps (docs/library.md, A search box). Here the kinds are
 * the suite's apps and the things their templates, each a link to the template on tinylittleoffice.com: type "plan"
 * or "week". The page's search is asked a moment after the last key, the question before it let go (its signal
 * aborted: the Actions panel says so); the hits come grouped by kind with their counts, and the page offers to start a
 * document of what was typed. Down and Up walk them, Enter chooses ("searchpick"), Escape closes and then clears.
 * Inline it is a header's field; as a dialog, a button that opens it, Mod+K from anywhere.
 */
const meta = {
  title: 'Kit/Data/Search',
  component: 'to-search',
  args: { dialog: false, hotkey: true, answer: 'at once' },
  argTypes: { answer: { control: 'inline-radio', options: ['at once', 'slowly', 'failing'], description: 'How the page’s `search` answers' } },
  loaders: [
    async () => {
      const hits: SearchHit[] = [];
      for (const a of apps())
        for (const tpl of await templatesOf(a.id))
          hits.push({ kind: a.id, id: `${a.id}/${tpl.id}`, title: tpl.name, subtitle: tpl.blurb, href: `https://tinylittleoffice.com/${routeHash(a.id, encodeDoc(tpl.doc))}` });
      return { hits, kinds: Object.fromEntries(apps().map((a) => [a.id, { label: a.name, icon: a.icon }])) };
    },
  ],
  render: (args, ctx) => {
    const { hits, kinds } = (ctx as unknown as Loaded).loaded;
    const search: Searcher = (q, signal) =>
      new Promise((ok, no) => {
        signal.addEventListener('abort', () => action('aborted')(q));
        const words = fold(q).split(/\s+/).filter(Boolean);
        const found = hits
          .filter((h) => words.every((w) => fold(`${h.title} ${h.subtitle ?? ''}`).includes(w)))
          .slice(0, 30)
          .map((h) => (args.nowhere && !OPENS.includes(h.kind) ? { ...h, href: undefined, disabled: true } : h));
        if (args.answer === 'failing') setTimeout(() => no(new Error('down')), 300);
        else setTimeout(() => ok(found), args.answer === 'slowly' ? 1200 : 0);
      });
    return html`<div style="max-width: 30rem">
      <to-search
        .search=${search}
        .kinds=${kinds}
        .create=${(q: string) => [{ id: 'write', label: `Start “${q}” as a document`, icon: apps()[0].icon }]}
        placeholder="Search templates"
        ?dialog=${args.dialog}
        ?hotkey=${args.hotkey}
        @searchpick=${(e: CustomEvent) => {
          e.preventDefault();
          action('searchpick')(e.detail);
        }}
      ></to-search>
    </div>`;
  },
} satisfies Meta<SearchArgs>;
export default meta;

export const Inline: StoryObj<SearchArgs> = {};
/** A button that opens the search in a dialog over the page; Mod+K opens it from anywhere. */
export const Dialog: StoryObj<SearchArgs> = { args: { dialog: true } };
/** The page's search takes a while: the box says it is searching. */
export const Slow: StoryObj<SearchArgs> = { args: { answer: 'slowly' } };
/** The page's search fails: the box says so. */
export const Failing: StoryObj<SearchArgs> = { args: { answer: 'failing' } };
/**
 * A page that opens only some kinds: the Word Processor's, the Spreadsheet's and the Presentation Builder's templates.
 * The rest are found and listed, so a person sees they exist, but are not chosen (`disabled`): drawn quiet, passed
 * over by Down, Up and Enter, a click on one nothing. Type "plan".
 */
export const NowhereToOpen: StoryObj<SearchArgs> = { args: { nowhere: true } };
