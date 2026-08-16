import { supabase } from "@/lib/supabaseClient";

export interface OverviewStats {
  totalUsers: number;
  courseRegistrations: number;
  totalDownloads: number;
  blogPosts: number;
  publishedCourses: number;
}

export async function getOverviewStats(): Promise<OverviewStats> {
  const [users, registrations, downloadLogs, posts, published] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("course_registrations").select("*", { count: "exact", head: true }),
    supabase.from("download_logs").select("*", { count: "exact", head: true }),
    supabase.from("blog_posts").select("*", { count: "exact", head: true }),
    supabase.from("courses").select("*", { count: "exact", head: true }).eq("is_published", true),
  ]);

  for (const result of [users, registrations, downloadLogs, posts, published]) {
    if (result.error) throw result.error;
  }

  return {
    totalUsers: users.count ?? 0,
    courseRegistrations: registrations.count ?? 0,
    totalDownloads: downloadLogs.count ?? 0,
    blogPosts: posts.count ?? 0,
    publishedCourses: published.count ?? 0,
  };
}
