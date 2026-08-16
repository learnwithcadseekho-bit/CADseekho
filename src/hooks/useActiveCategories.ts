import { useEffect, useState } from "react";
import { getActiveCategoriesWithCourseCount, type CategoryWithCourseCount } from "@/services/categoryService";

// Lazy: fetches only once `enabled` first becomes true (e.g. a dropdown/drawer
// opening), and caches for the component's lifetime.
export function useActiveCategories(enabled: boolean) {
  const [categories, setCategories] = useState<CategoryWithCourseCount[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!enabled || categories !== null) return;
    getActiveCategoriesWithCourseCount()
      .then(setCategories)
      .catch(() => setError(true));
  }, [enabled, categories]);

  return { categories, loading: enabled && categories === null && !error, error };
}
