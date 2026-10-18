import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html, render } from 'lit';
import { action } from 'storybook/actions';
import { templates } from '../../../src/apps/write/templates.ts';
import { cmdBtn, cmdTool, command, keysText, mount, register, toast, UI } from '../../../src/editors.ts';
import { box } from '../../support.ts';

/**
 * A page's own commands (docs/library.md, A page's own commands): declared as the kit's are, in a scope of the page's
 * own (`host`), drawn by the kit's functions in a <to-bar> of the page's, and given to `mount` with their context, so
 * their keys are answered inside the editor after the words', the app's and undo's. The context here is a record in
 * hand, as Atlas's would be.
 */
interface Pipeline {
  record: { name: string; stage: string };
  open(record: Pipeline['record']): void;
  advance(): void;
}

const OPEN = command<Pipeline>({
  id: 'host.open',
  scope: 'host',
  label: (p) => `Open ${p?.record.name ?? 'record'}`,
  icon: UI.open,
  keys: 'Mod+Shift+O',
  where: ['bar'],
  does: (p) => p.open(p.record),
});
const ADVANCE = command<Pipeline>({
  id: 'host.advance',
  scope: 'host',
  label: (p) => `Move to ${p?.record.stage === 'Lead' ? 'Won' : 'Lead'}`,
  icon: UI.check,
  keys: 'Mod+Shift+M',
  where: ['bar'],
  does: (p) => p.advance(),
});
const COMMANDS = [OPEN, ADVANCE];
register(COMMANDS);

const meta = { title: 'Kit/Core/Commands' } satisfies Meta;
export default meta;

/** The page's bar over a mounted Word Processor (the contract template): its buttons and keys run the page's commands, the record changing as they do. */
export const PagesOwnCommands: StoryObj = {
  render: () => {
    const root = box();
    const bar = box('');
    const main = box();
    main.dataset.app = 'write';
    // The page's own voice, where the toast its command says is shown.
    root.append(bar, main, document.createElement('to-toast'));
    const pipeline: Pipeline = {
      record: { name: 'Acme lease', stage: 'Lead' },
      open: (r) => (action('host.open')(r), toast(`Opened ${r.name}`)),
      advance: () => {
        pipeline.record = { ...pipeline.record, stage: pipeline.record.stage === 'Lead' ? 'Won' : 'Lead' };
        action('host.advance')(pipeline.record);
        draw();
      },
    };
    const draw = () =>
      render(
        html`<to-bar>${cmdTool(OPEN, pipeline)}${cmdBtn(ADVANCE, pipeline)}</to-bar>
          <p class="sb-caption">${pipeline.record.name}: ${pipeline.record.stage} · ${keysText(OPEN.keys!)} opens it, ${keysText(ADVANCE.keys!)} moves it, from inside the editor too</p>`,
        bar,
      );
    draw();
    const contract = templates().find((t) => t.id === 'contract')!.doc;
    void mount('write', contract, main, action('docchange'), { commands: COMMANDS, context: pipeline })
      .then(() => void (main.dataset.ready = ''))
      .catch((e) => console.error('mounting write failed', e));
    return root;
  },
};
