/**
 * <to-home>: the site's home page (kit/ui/home.ts): the apps as rows, each with its templates, the documents kept on
 * this device under it, the foot. Choosing one moves this frame's hash, which nothing here follows (the shell would
 * open it: Site/Shell's Home). A host lists its own documents; to start one from an app's templates it reads
 * `appOf(id).templates()` and draws them as it likes (Apps/…/Templates draws each small).
 */
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../../src/kit/ui/home.ts';

const meta = { title: 'Site/Home', component: 'to-home', parameters: { page: true }, render: () => html`<to-home></to-home>` } satisfies Meta;
export default meta;

/** The home page, nothing kept on this device. */
export const Home: StoryObj = {};
