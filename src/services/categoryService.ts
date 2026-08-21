import { supabase } from "@/lib/supabaseClient";
import { cached } from "@/lib/cache";
import type { Category } from "@/types/category";

export interface CategoryWithCourseCount extends Category {
  course_count: number;
}

interface CategoryRow extends Category {
  courses: { count: number }[];
}

// The embedded `courses(count)` select goes through courses' own RLS policy
// for the calling role, so anonymous/authenticated users automatically get a
// count of published courses only — no extra filter needed here.
export async function getActiveCategoriesWithCourseCount(): Promise<CategoryWithCourseCount[]> {
  return cached("categories:active", async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*, courses(count)")
      .eq("is_active", true)
      .order("sort_order")
      .order("name");

    if (error) throw error;

    return ((data ?? []) as unknown as CategoryRow[]).map(({ courses, ...category }) => ({
      ...category,
      course_count: courses?.[0]?.count ?? 0,
    }));
  });
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  return cached(`categories:detail:${slug}`, async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (error) throw error;
    return data as Category | null;
  });
}
