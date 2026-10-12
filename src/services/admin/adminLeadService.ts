import { supabase } from "@/lib/supabaseClient";

export const LEAD_STATUSES = ["new", "contacted", "interested", "not_interested", "paid"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: "student" | "working_engineer" | "other";
  org: string | null;
  city: string | null;
  cad: string[];
  consent: boolean;
  consent_text: string;
  consent_at: string;
  source: string;
  utm: Record<string, string>;
  gclid: string | null;
  fbclid: string | null;
  page: string | null;
  submissions: number;
  status: LeadStatus;
  demo_booked: boolean;
  attended: boolean;
  paid: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface LeadFilters {
  /** YYYY-MM-DD, IST days, inclusive. */
  from?: string;
  to?: string;
  source?: string;
  status?: LeadStatus | "";
}

export async function listLeads(filters: LeadFilters): Promise<Lead[]> {
  let q = supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(2000);
  if (filters.from) q = q.gte("created_at", `${filters.from}T00:00:00+05:30`);
  if (filters.to) q = q.lte("created_at", `${filters.to}T23:59:59.999+05:30`);
  if (filters.source) q = q.eq("source", filters.source);
  if (filters.status) q = q.eq("status", filters.status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Lead[];
}

export type LeadPatch = Partial<Pick<Lead, "attended" | "paid" | "notes" | "status">>;

export async function updateLead(id: string, patch: LeadPatch): Promise<void> {
  const { error } = await supabase.from("leads").update(patch).eq("id", id);
  if (error) throw error;
}
