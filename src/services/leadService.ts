import { invokeFunction } from "@/services/paymentService";
import { getAttribution } from "@/lib/attribution";

// Demo-class booking → the submit-lead Edge Function (validation, Turnstile,
// rate limit, phone dedupe, Google Sheet + admin alert happen there).

export interface DemoLeadInput {
  name: string;
  phone: string;
  email: string;
  role: "student" | "working_engineer" | "other" | "";
  org: string;
  city: string;
  cad: string[];
  consent: boolean;
  /** Honeypot — always "" from a real person. */
  website: string;
  turnstileToken: string;
}

export async function submitDemoLead(input: DemoLeadInput): Promise<{ leadId: string }> {
  const { landing_page, ...utm } = getAttribution();
  return invokeFunction<{ leadId: string }>("submit-lead", {
    ...input,
    utm,
    page: landing_page ? `${window.location.pathname} (landed on ${landing_page})` : window.location.pathname,
  });
}

// The thank-you page fires the Lead conversion once, from what the form left here.
const PENDING_KEY = "cs_pending_lead";

export interface PendingLead {
  eventId: string;
  email?: string;
  phone?: string;
}

export function setPendingLead(lead: PendingLead) {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(lead));
  } catch {
    // Storage blocked: the thank-you page still fires Lead, without advanced matching.
  }
}

export function takePendingLead(): PendingLead | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    sessionStorage.removeItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as PendingLead) : null;
  } catch {
    return null;
  }
}
