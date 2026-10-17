/**
 * The editors' stylesheet as TypeScript sees it: `import 'tinylittleoffice/editors.css'` is a side-effect import, and
 * TypeScript asks every import, a stylesheet's too, for declarations. This one says the stylesheet gives a program
 * nothing to name, so a strict page checks with nothing more installed (no `vite/client`, no `declare module '*.css'`);
 * the bundler is what reads the stylesheet. package.json's exports point `./editors.css` here for its types.
 */
export {};
