import { supabase } from "@/lib/supabaseClient";
import type { BlogPost } from "@/types/blogPost";

export async function listAllPosts(): Promise<BlogPost[]> {
  const { data, error } = await supabase.from("blog_posts").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BlogPost[];
}

export async function getPostById(id: string): Promise<BlogPost | null> {
  const { data, error } = await supabase.from("blog_posts").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as BlogPost | null;
}

export type BlogPostInput = Pick<
  BlogPost,
  | "title"
  | "slug"
  | "excerpt"
  | "content"
  | "featured_image"
  | "custom_html_url"
  | "category"
  | "is_published"
> & { published_at: string | null };

export async function createPost(input: BlogPostInput, authorId: string): Promise<BlogPost> {
  const { data, error } = await supabase
    .from("blog_posts")
    .insert({ ...input, author_id: authorId })
    .select("*")
    .single();
  if (error) throw error;
  return data as BlogPost;
}

export async function updatePost(id: string, input: Partial<BlogPostInput>): Promise<BlogPost> {
  const { data, error } = await supabase.from("blog_posts").update(input).eq("id", id).select("*").single();
  if (error) throw error;
  return data as BlogPost;
}

export async function deletePost(id: string): Promise<void> {
  const { error } = await supabase.from("blog_posts").delete().eq("id", id);
  if (error) throw error;
}
