// Three elements, two with a story (stories.ts): to-told is told, to-also too, to-untold is not. The example in this
// comment is not one: customElements.define('to-comment', X);
export const tag = 'to-told';
customElements.define(tag, class extends HTMLElement {});
customElements.define('to-also', class extends HTMLElement {});
if (!customElements.get('to-untold')) customElements.define('to-untold', class extends HTMLElement {});
