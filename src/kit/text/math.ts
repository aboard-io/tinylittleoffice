import katex from 'katex';

/** Keep KaTeX's trust option off for document-supplied commands. */
export function renderMath(tex: string, displayMode = false, output: 'htmlAndMathml' | 'mathml' = 'mathml'): string {
  return katex.renderToString(tex, { displayMode, output, throwOnError: false });
}
