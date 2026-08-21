import { supabase } from "@/lib/supabaseClient";
import { cached } from "@/lib/cache";
import type { BlogPost } from "@/types/blogPost";

export async function getPublishedPosts(): Promise<BlogPost[]> {
  return cached("posts:published", async () => {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("is_published", true)
      .order("published_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as BlogPost[];
  });
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  return cached(`posts:detail:${slug}`, async () => {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();

    if (error) throw error;
    return data as BlogPost | null;
  });
}

export async function getRelatedPosts(category: string | null, excludeId: string, limit = 3): Promise<BlogPost[]> {
  return cached(`posts:related:${category ?? "all"}:${excludeId}:${limit}`, async () => {
    let query = supabase
      .from("blog_posts")
      .select("*")
      .eq("is_published", true)
      .neq("id", excludeId)
      .order("published_at", { ascending: false })
      .limit(limit);

    if (category) query = query.eq("category", category);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as BlogPost[];
  });
}
