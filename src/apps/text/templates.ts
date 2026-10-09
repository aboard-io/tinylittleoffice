/**
 * Text's templates: Blank is the app's own page; these are the rest, each a document in TLO. One example
 * for now, so the control on the home page can be seen; the letter, résumé and contract come with the
 * kernel and the editor.
 */
import type { Template } from '../../kit/app.ts';
import { t } from '../../kit/i18n.ts';

export const templates = (): Template[] => [
  {
    id: 'notes',
    name: t('Meeting notes'),
    blurb: t('Who was there, what was decided, what is next.'),
    doc: '---\ntitle: Meeting notes\n---\n# Meeting notes\n\n## Who\n\n- \n\n## Decided\n\n- \n\n## Next\n\n- [ ] \n',
  },
];
