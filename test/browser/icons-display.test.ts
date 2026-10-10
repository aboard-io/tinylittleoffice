// A view is synchronous; its caller waits for the icons a document names (kit/icons.ts ensureIcons): the Display
// Link of a deck whose slide names an icon outside the starter set draws that icon once the rest of Lucide joins.
import { expect, test } from 'vitest';
import { encodeDoc } from '../../src/kit/codec.ts';
import { iconInner, iconNamed } from '../../src/kit/icons.ts';
import { mount, until } from './helpers.ts';

test('the Display Link draws an icon from outside the starter set', async () => {
  expect(iconNamed('car-front')).toBeUndefined();
  const shell = await mount(`#/v1/deck/${encodeDoc('## :car-front: Drive {.title}\n\n- Home\n')}?d`);
  await until(() => !!shell.querySelector('.to-display-page svg'));
  await until(() => !!iconNamed('car-front'), 8000);
  const path = /d="([^"]+)"/.exec(iconInner(iconNamed('car-front')!))![1];
  await until(() => shell.querySelector('.to-display-page')!.innerHTML.includes(path));
  expect(shell.querySelector('.to-display')!.textContent).toContain('Drive');
});
