/**
 * <to-templates>: an app's templates, the small arrow beside its name on the home page and the dialog it opens over
 * the whole screen (kit/ui/home.ts), Blank first, each template drawn small from its own document. Choosing one moves
 * this frame's hash to the app with that document, which nothing here follows. A host that offers templates reads
 * them from the app's definition (`templates()`) rather than holding this dialog, which navigates the site.
 */
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import type { ToTemplates } from '../../src/kit/ui/home.ts';
import '../../src/kit/ui/home.ts';
import { defOf, shown, siteMeta, type SiteArgs } from './site.ts';

/** The element for the app chosen. */
const templatesFor = (app: string) => Object.assign(document.createElement('to-templates') as ToTemplates, { app: defOf(app) });

const meta = { title: 'Site/Templates', component: 'to-templates', ...siteMeta() } satisfies Meta<SiteArgs>;
export default meta;
type Story = StoryObj<SiteArgs>;

/** The button, closed: the small arrow, named for the app's templates. */
export const Button: Story = { render: (args) => html`${templatesFor(args.app)}` };
/** The dialog, open. */
export const Open: Story = { render: (args) => html`${shown(templatesFor(args.app), (el) => el.show())}` };
/** The Diagram Maker's, whose templates carry its blanks, one a kind: no Blank of the list's own. */
export const WithItsBlanks: Story = { args: { app: 'diagram' }, render: (args) => html`${shown(templatesFor(args.app), (el) => el.show())}` };
