// The kit importing an app outside kit/apps.ts, a language outside kit/i18n.ts, and a cycle with two.ts.
import { a } from '../apps/a/editor.ts';
import fr from '../i18n/fr.ts';
import { two } from './two.ts';
export const one = () => [a, fr, two];
