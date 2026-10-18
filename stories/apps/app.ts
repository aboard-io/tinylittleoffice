/**
 * The stories every app has, made the same way for each (stories/apps/<id>.stories.ts): its editor over one of its
 * own templates, editable and read-only; blank; two people sharing one document; and every template drawn small, as
 * the home page draws them. The templates are the app's (src/apps/<id>/templates.ts), asked for in the language in
 * use; the template control lists their ids.
 */
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { appOf, type Template } from '../../src/editors.ts';
import { CROPPED, pageSvg } from '../../src/kit/draw/draw.ts';
import { editorBox, sharedBoxes, templatesOf } from '../support.ts';

export interface AppArgs {
  /** The template the editor opens over: its id, from the app's templates. */
  template: string;
  readOnly: boolean;
}
type Loaded = { loaded: { templates: Template[] } };
export type AppStory = StoryObj<AppArgs>;

/** The story's document: the template named, or the first, or the app's blank. */
const docOf = (app: string, id: string, list: Template[]) => (list.find((t) => t.id === id) ?? list[0])?.doc ?? appOf(app)!.blank();

/**
 * What an app's meta carries beside its title and component: the template control, over the ids of the app's
 * templates (`ids`, read from its templates module as the file loads, in English, which their ids are not), the
 * templates themselves loaded in the language in use, and the editor drawn over the one chosen, `start` at first (an app
 * whose templates begin with its blanks starts at one with something in it).
 */
export const appMeta = (app: string, ids: string[], start = ids[0] ?? ''): Partial<Meta<AppArgs>> => ({
  args: { template: start, readOnly: false },
  argTypes: {
    template: { control: 'select', options: ids, description: 'One of the app’s templates (src/apps/…/templates.ts)' },
    readOnly: { control: 'boolean', description: '`readOnly`: no bar, no typing; an item activated fires "docpick"' },
  },
  loaders: [async () => ({ templates: await templatesOf(app) })],
  render: (args, ctx) => editorBox(app, docOf(app, args.template, (ctx as unknown as Loaded).loaded.templates), { readOnly: args.readOnly }),
});

/** The editor over a template, editable. */
export const editable = (): AppStory => ({});
/** The same, read-only: shown, not edited (docs/library.md, step 8). */
export const readOnly = (): AppStory => ({ args: { readOnly: true } });
/** A new document: the app's blank. */
export const blank = (app: string): AppStory => ({
  argTypes: { template: { table: { disable: true } } },
  render: (args) => editorBox(app, appOf(app)!.blank(), { readOnly: args.readOnly }),
});
/** Two people editing one document, each one's ops applied to the other's editor (docops and applyRemote). */
export const shared = (app: string): AppStory => ({
  argTypes: { readOnly: { table: { disable: true } } },
  render: (args, ctx) => sharedBoxes(app, docOf(app, args.template, (ctx as unknown as Loaded).loaded.templates)),
});
/** Every template, drawn small from its own document by the app's `view`, in the one 4:3 box every preview has (kit/draw/draw.ts CROPPED). */
export const templates = (app: string): AppStory => ({
  argTypes: { template: { table: { disable: true } }, readOnly: { table: { disable: true } } },
  render: (_args, ctx) => {
    const def = appOf(app)!;
    return html`<div class="sb-row sb-templates">
      ${(ctx as unknown as Loaded).loaded.templates.map((t) => {
        const page = pageSvg(def.view(t.doc, { small: true, thumb: true })[0], CROPPED);
        return html`<figure class="sb-template" data-template=${t.id}>
          ${unsafeSVG(page)}
          <figcaption><strong>${t.name}</strong><br />${t.blurb}</figcaption>
        </figure>`;
      })}
    </div>`;
  },
});
