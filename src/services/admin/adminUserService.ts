import { supabase } from "@/lib/supabaseClient";
import type { Profile } from "@/types/profile";

export async function listAllUsers(): Promise<Profile[]> {
  const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function setUserRole(userId: string, role: "user" | "admin"): Promise<void> {
  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) throw error;
}
