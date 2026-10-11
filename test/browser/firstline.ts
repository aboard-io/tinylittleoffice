// A row of the chrome that is an icon before its words (the drawer's, the home page's apps): where the icon sits against
// the words' first line. The icon stays beside the first line when the words wrap (Paul, 2026-10-11: "Align the icons
// in the main menu to the top so they stay there when we zoom").

/**
 * Each such row under `root`: its words, whether they wrap, whether they sit under the icon (a word too wide to sit beside
 * it takes the line under: r16-reflow), and whether the icon's middle is the first line's (within a quarter of a line:
 * not on the line between two). A row is right when its words are under the icon or beside it at the first line.
 */
export function firstLines(root: Element) {
  return [...root.querySelectorAll<SVGElement>('.to-icon:first-child')].flatMap((icon) => {
    const words = icon.nextElementSibling;
    if (!(words instanceof HTMLElement) || words.tagName !== 'SPAN' || !words.offsetParent) return [];
    const style = getComputedStyle(words);
    const lh = parseFloat(style.lineHeight);
    const box = words.getBoundingClientRect();
    const top = box.top + parseFloat(style.paddingTop) + parseFloat(style.borderTopWidth);
    const height = box.bottom - parseFloat(style.paddingBottom) - parseFloat(style.borderBottomWidth) - top;
    const i = icon.getBoundingClientRect();
    const mid = (i.top + i.bottom) / 2;
    return [{ words: words.textContent!.trim(), under: box.top >= i.bottom, wraps: height > lh * 1.5, beside: Math.abs(mid - (top + lh / 2)) < lh / 4, off: Math.round(mid - (top + lh / 2)) }];
  });
}
