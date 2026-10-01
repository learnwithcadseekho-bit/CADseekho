import { lazy, type ComponentProps, type ComponentType } from "react";

// React.lazy plus a record of which lazily loaded modules a server render
// used. The prerender looks those ids up in Vite's client manifest to link
// each page's CSS (and preload its JS) in the static HTML — otherwise a
// prerendered page would paint unstyled until its route chunk downloaded.
// `id` must be the module's path from the project root, exactly as it
// appears as a key in dist/.vite/manifest.json; the prerender fails the
// build if it doesn't.
const renderedModules = new Set<string>();

export function takeRenderedModules(): string[] {
  const ids = [...renderedModules];
  renderedModules.clear();
  return ids;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function trackedLazy<T extends ComponentType<any>>(id: string, loader: () => Promise<{ default: T }>) {
  const Lazy = lazy(loader);
  function Tracked(props: ComponentProps<T>) {
    if (import.meta.env.SSR) renderedModules.add(id);
    return <Lazy {...props} />;
  }
  Tracked.displayName = `Lazy(${id})`;
  return Tracked;
}
