import { useEffect, useState } from "react";
import { MATERIALS } from "./materials";

export const CUSTOM_MATERIAL = "custom";

/** Material state: returns the yield strength in use (NaN while the custom box is empty). */
export function useMaterial() {
  const [key, setKey] = useState(MATERIALS[0].key);
  const [customSy, setCustomSy] = useState("250");
  const material = MATERIALS.find((m) => m.key === key) ?? null;
  const sy = material ? material.sy : customSy.trim() === "" ? NaN : Number(customSy);
  return { key, setKey, customSy, setCustomSy, material, sy };
}

/** Logs one 'calculate' event once a valid result has settled for a moment. */
export function useCalculateEvent(resultKey: string, onCalculate: () => void) {
  useEffect(() => {
    if (!resultKey) return;
    const t = window.setTimeout(onCalculate, 1500);
    return () => window.clearTimeout(t);
  }, [resultKey, onCalculate]);
}
