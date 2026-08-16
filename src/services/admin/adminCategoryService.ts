import { supabase } from "@/lib/supabaseClient";
import type { Category } from "@/types/category";

export async function listAllCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from("categories").select("*").order("sort_order").order("name");
  if (error) throw error;
  return (data ?? []) as Category[];
}

export type CategoryInput = Pick<
  Category,
  "name" | "slug" | "description" | "image" | "is_active" | "sort_order"
>;

export async function createCategory(input: CategoryInput): Promise<Category> {
  const { data, error } = await supabase.from("categories").insert(input).select("*").single();
  if (error) throw error;
  return data as Category;
}

export async function updateCategory(id: string, input: Partial<CategoryInput>): Promise<Category> {
  const { data, error } = await supabase.from("categories").update(input).eq("id", id).select("*").single();
  if (error) throw error;
  return data as Category;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}
