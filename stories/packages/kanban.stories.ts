/**
 * The Board (@aboard/kanban): cards in lanes over a table, the first app built outside the suite on the kit, shown from
 * its own checkout's source when it is beside this one (.storybook/vite.config.ts; `KANBAN_DIR` names another), with
 * the stories every app has (stories/apps/app.ts) over its own templates. Without the checkout each story says so and
 * draws nothing else. The Board depends on this package, never the other way: nothing of it is installed here.
 */
import type { Meta } from '@storybook/web-components-vite';
import { install } from 'virtual:kanban';
import { appMeta, blank, editable, readOnly, shared, templates, type AppArgs, type AppStory } from '../apps/app.ts';

install?.();
/** The Board's templates' ids, as its stories' control lists them: its own (its src/templates.ts). */
const IDS = ['project', 'pipeline', 'hiring', 'content'];

/** Where there is no Board checkout: one line, and nothing mounted. */
const absent = () => Object.assign(document.createElement('p'), { className: 'sb-caption', textContent: 'The Board’s checkout is not beside this one (KANBAN_DIR names it).' });
const or = (story: AppStory): AppStory => (install ? story : { ...story, loaders: [], render: absent });

const meta = {
  title: 'Packages/Kanban',
  ...appMeta('board', IDS),
  ...(install ? {} : { loaders: [], render: absent }),
} satisfies Meta<AppArgs>;
export default meta;

export const Editable = or(editable());
export const ReadOnly = or(readOnly());
export const Blank = or(blank('board'));
export const Shared = or(shared('board'));
export const Templates = or(templates('board'));
