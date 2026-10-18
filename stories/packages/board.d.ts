/** The Board's install, when its checkout is beside this one (.storybook/vite.config.ts, its plugin storybook-board); null where it is not. */
declare module 'virtual:board' {
  export const install: (() => void) | null;
}
