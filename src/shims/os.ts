// GramJS imports Node's `os` to build its device description. The browser has
// no `os`, so we give it a tiny stand-in (vite.config.ts aliases `os` here).
export const type = () => 'Browser';
export const release = () => '';
export const platform = () => 'browser';
export default { type, release, platform };
