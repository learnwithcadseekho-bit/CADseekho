import { supabase } from "@/lib/supabaseClient";
import { cached } from "@/lib/cache";
import type { CourseDetail, CourseWithCategory } from "@/types/course";

// Listings only need what a course card / fee summary shows. Keeping the
// full description and syllabus out keeps these small — they're also
// embedded in prerendered pages for hydration.
const LISTING_COLUMNS =
  "id, category_id, title, slug, short_description, level, software, image, format, price, original_price, next_batch_date, is_featured, is_published, created_at, updated_at";

export async function getFeaturedCourses(): Promise<CourseWithCategory[]> {
  return cached("courses:featured", async () => {
    const { data, error } = await supabase
      .from("courses")
      .select(`${LISTING_COLUMNS}, category:categories(name, slug)`)
      .eq("is_featured", true)
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as unknown as CourseWithCategory[];
  });
}

export async function getPublishedCourses(): Promise<CourseWithCategory[]> {
  return cached("courses:published", async () => {
    const { data, error } = await supabase
      .from("courses")
      .select(`${LISTING_COLUMNS}, category:categories(name, slug)`)
      .eq("is_published", true)
      .order("title");

    if (error) throw error;
    return (data ?? []) as unknown as CourseWithCategory[];
  });
}

export async function getCoursesByCategorySlug(categorySlug: string): Promise<CourseWithCategory[]> {
  return cached(`courses:category:${categorySlug}`, async () => {
    const { data, error } = await supabase
      .from("courses")
      .select(`${LISTING_COLUMNS}, category:categories!inner(name, slug)`)
      .eq("is_published", true)
      .eq("category.slug", categorySlug)
      .order("title");

    if (error) throw error;
    return (data ?? []) as unknown as CourseWithCategory[];
  });
}

export async function getCourseDetailBySlug(slug: string): Promise<CourseDetail | null> {
  return cached(`courses:detail:${slug}`, async () => {
    const { data, error } = await supabase
      .from("courses")
      .select(
        "*, category:categories(name, slug), course_modules(*), course_skills(*), course_faqs(*), course_testimonials(*)"
      )
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const detail = data as unknown as CourseDetail;
    detail.course_modules = [...detail.course_modules].sort((a, b) => a.order_number - b.order_number);
    detail.course_faqs = [...detail.course_faqs].sort((a, b) => a.order_number - b.order_number);
    detail.course_testimonials = [...detail.course_testimonials].sort((a, b) => a.order_number - b.order_number);
    return detail;
  });
}
