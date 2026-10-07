/** fflate asks Node for createRequire to find worker threads; this bundle never uses workers, so there is nothing to find. */
export const createRequire = () => () => undefined;
