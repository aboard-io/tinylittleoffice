// Wrangler bundles .html as text.
declare module '*.html' {
  const text: string;
  export default text;
}
