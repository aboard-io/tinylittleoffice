// Words in a template that nobody can translate: the bare-words lint finds the button's words and its title.
const html = (s: TemplateStringsArray, ...v: unknown[]) => [s, v];
const t = (s: string) => s;
export const bad = html`<button class="to-btn" title="Close the panel">${t('Save')} Save all</button>`;
