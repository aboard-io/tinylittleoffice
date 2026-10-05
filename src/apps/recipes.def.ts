/** Recipe cards: 4 by 6 inch cards, two to a sheet. */
import type { Kind as LineKind } from '../lib/lines.ts';
import { definePrint, slidesOf, tile } from '../lib/print.ts';
import { fitted } from '../lib/fold.ts';

export const spec = {
  form: [
    { name: 'Picture', is: ':{Picture:icon}' },
    { name: 'Next card', is: '' },
    { name: 'Line', is: '{Text}' },
  ] as LineKind[],
  hint: 'The name of the dish, then a line for each ingredient and step. A blank line starts the next card. Two 6 by 4 inch cards print on each sheet.',
  example: ':cookie\nCardamom buns\nMakes 12. 25 minutes at 200°C.\n500g flour, 80g sugar, 250ml milk, 75g butter, yeast, cardamom\n1. Warm the milk and butter; mix everything; rest an hour.\n2. Roll, fill with butter, sugar and cardamom; twist into knots.\n3. Rest 30 minutes. Bake until golden.\n\n:coffee\nCold brew\n100g coarse coffee to 1 litre of cold water.\n1. Stir, cover, and leave 16 hours.\n2. Strain twice. Keeps a week in the fridge.',
  sheets: (text: string) => tile(slidesOf(text).map((s) => fitted(s, 576, 384, { max: 19, m: 30 })), 1, 2),
};

export default definePrint({ id: 'recipes', name: 'Recipe cards', icon: 'recipes', blurb: 'Recipe cards to print and cut: the dish, what goes in, what to do.' }, spec);
