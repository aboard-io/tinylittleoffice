/** <to-pattern>: the pixel editor, on a pattern's grid. */
import './pattern.def.ts';
import { defineElement } from '../kit.ts';
import { PixelElement } from './pixel.ts';

defineElement('pattern', class extends PixelElement {
  static app = 'pattern';
});
