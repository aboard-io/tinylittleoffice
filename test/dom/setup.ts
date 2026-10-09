import './env.ts';
// The page the shell would give an editor: the stylesheet is not needed, the Shoelace parts and the editors are.
import '../../src/lib/shoelace.ts';
import '../../src/apps/index.ts';
import '../../src/apps/editors.ts';
import { templatePrompt } from '../../src/widgets/template-picker.ts';

// A blank Write, Sheet or Deck opens with its templates over it; here the page beneath is what is tested (around.test.ts tests the dialog).
templatePrompt.auto = false;
