import type { Meta } from '@storybook/web-components-vite';
import { templates as list } from '../../src/apps/trip/templates.ts';
import { appMeta, blank, editable, readOnly, shared, templates, type AppArgs } from './app.ts';

/** The Trip Planner: a route on a map, stops in order, each with a note; or places as dots. */
const meta = {
  title: 'Apps/Trip Planner',
  component: 'to-trip-editor',
  ...appMeta(
    'trip',
    list().map((t) => t.id),
  ),
} satisfies Meta<AppArgs>;
export default meta;

export const Editable = editable();
export const ReadOnly = readOnly();
export const Blank = blank('trip');
export const Shared = shared('trip');
export const Templates = templates('trip');
