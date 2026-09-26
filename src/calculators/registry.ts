import { lazy, type ComponentType, type LazyExoticComponent } from "react";

/** Props every interactive resource component receives from the resource page. */
export interface ResourceComponentProps {
  resourceId: string;
  /** resources.component_props — free, non-secret config. */
  config: Record<string, unknown>;
  /** resource_premium.payload when the viewer is entitled, otherwise null. */
  premium: Record<string, unknown> | null;
  /** Call on each completed calculation (logged as a 'calculate' event, throttled by the caller). */
  onCalculate: () => void;
}

interface RegistryEntry {
  label: string;
  component: LazyExoticComponent<ComponentType<ResourceComponentProps>>;
}

// component_key (stored on resources) → lazily loaded component. Each entry
// is its own chunk, so a calculator's code only downloads on its own page.
// Add new interactive resources here; the admin form lists these keys.
export const RESOURCE_COMPONENTS: Record<string, RegistryEntry> = {
  "kt-plate-center-hole": {
    label: "Kt — plate with a central hole",
    component: lazy(() => import("./KtPlateCenterHole")),
  },
  "kt-hole-near-edge": {
    label: "Kt — hole near the edge of a plate",
    component: lazy(() => import("./KtHoleNearEdge")),
  },
};
