import { css } from 'lit';

/** Shared retro styling for every mini app. */
export const retro = css`
  :host {
    display: block;
    font: 13px/1.4 var(--font);
    color: var(--ink);
  }
  * {
    box-sizing: border-box;
  }
  button,
  .btn {
    font: inherit;
    color: var(--ink);
    background: var(--paper);
    border: 1px solid var(--ink);
    border-radius: 4px;
    padding: 2px 8px;
    min-height: 24px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    box-shadow: 1px 1px 0 var(--ink);
    text-decoration: none;
    line-height: 1;
    white-space: nowrap;
  }
  button:hover,
  .btn:hover {
    background: var(--paper-dim);
  }
  button:active,
  button[aria-pressed='true'],
  .btn:active,
  .btn[aria-pressed='true'] {
    background: var(--ink);
    color: var(--paper);
    box-shadow: none;
    transform: translate(1px, 1px);
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
    box-shadow: 1px 1px 0 var(--ink);
    transform: none;
  }
  button.icon {
    padding: 2px 4px;
    min-width: 24px;
    justify-content: center;
  }
  button:focus-visible,
  input:focus-visible,
  textarea:focus-visible,
  [contenteditable]:focus-visible,
  a:focus-visible {
    outline: 2px dotted var(--ink);
    outline-offset: 1px;
  }
  input,
  textarea,
  select {
    font: inherit;
    color: var(--ink);
    background: var(--paper);
    border: 1px solid var(--ink);
    border-radius: 0;
    padding: 2px 4px;
  }
  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
    padding: 4px 6px;
    border-bottom: 1px solid var(--ink);
    background: var(--paper-dim);
  }
  .toolbar .sep {
    width: 1px;
    align-self: stretch;
    background: var(--ink);
    opacity: 0.4;
    margin: 0 2px;
  }
  .toolbar .spacer {
    flex: 1;
  }
  .hint {
    font-size: 11px;
    opacity: 0.7;
  }
  .lucide {
    flex-shrink: 0;
  }
`;
