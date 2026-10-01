import { getActiveCategoriesWithCourseCount } from "@/services/categoryService";
import { useCachedData } from "@/hooks/useCachedData";

// Lazy: fetches only once `enabled` first becomes true (e.g. a dropdown/drawer
// opening). Shares the categories cache entry with the rest of the app.
export function useActiveCategories(enabled: boolean) {
  const { data, loading, error } = useCachedData(enabled ? "categories:active" : null, getActiveCategoriesWithCourseCount);
  return { categories: data ?? null, loading, error: Boolean(error) };
}
