/**
 * What the Site's stories share (stories/site/): the site's own page pieces, each drawn with the site's page.css on
 * (`parameters.page`), and an app chosen by a control, its document one of its own templates. A host that holds the
 * editors (Atlas) adopts none of these: it keeps its own page, its own header and its own dialogs, and gives an editor
 * its text with `mount` (Kit/Core/Mount).
 */
import type { Meta } from '@storybook/web-components-vite';
import { apps, appOf, type AppDef, type Template } from '../../src/editors.ts';
import { templatesOf } from '../support.ts';

export interface SiteArgs {
  /** The app's id. */
  app: string;
}
export type Loaded = { loaded: { templates: Template[] } };

/** The app control over the suite's apps, and its templates loaded in the language in use. */
export const siteMeta = (start = 'write'): Partial<Meta<SiteArgs>> => ({
  args: { app: start },
  argTypes: { app: { control: 'select', options: apps().map((a) => a.id), description: 'The app, by its id' } },
  parameters: { page: true },
  loaders: [async ({ args }) => ({ templates: await templatesOf((args as SiteArgs).app) })],
});

/** The app's definition. */
export const defOf = (app: string): AppDef => appOf(app)!;
/** The story's document: the app's first template, or its blank. */
export const sampleOf = (app: string, ctx: unknown): string => (ctx as Loaded).loaded.templates[0]?.doc ?? defOf(app).blank();
/** The story's document's name: its first template's. */
export const sampleName = (ctx: unknown): string => (ctx as Loaded).loaded.templates[0]?.name ?? '';
/** An element made once the story's box is in the page: `then` runs after its first update (a dialog's show()). */
export function shown<E extends HTMLElement & { updateComplete?: Promise<unknown> }>(el: E, then: (el: E) => unknown): E {
  queueMicrotask(async () => {
    await el.updateComplete;
    await then(el);
  });
  return el;
}
