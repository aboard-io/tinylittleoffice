/** Pattern: a stitch chart for knitting or cross-stitch. Pixel art with lines to count by. */
import { definePixels } from './pixel.def.ts';

export default definePixels({ id: 'pattern', group: 'Design', under: 'pixel', name: 'Stitch pattern', icon: 'pattern', blurb: 'A knitting or cross-stitch chart on a 24 by 24 grid, with a count of each colour.' }, { size: 24, pattern: true });
