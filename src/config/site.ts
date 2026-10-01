// Single source of truth for business details (NAP: name, address, phone).
// Footer, contact page, local landing pages and JSON-LD all read from here, so
// the details stay identical everywhere — inconsistent NAP hurts local ranking.
// Never put invented values here: leave a field null until the real one exists.

/** Canonical origin: https, no www, no trailing slash. */
export const SITE_URL = (import.meta.env.VITE_SITE_URL || "https://cadseekho.com").replace(/\/$/, "");

export const BUSINESS = {
  name: "CADseekho",
  legalName: null as string | null,
  logo: `${SITE_URL}/logo.svg`,
  email: "info@cadseekho.com",
  /** E.164 for tel: links and schema; `phoneDisplay` is the human format. */
  phone: "+919358502626",
  phoneDisplay: "+91 93585 02626",
  // TODO(seo): WhatsApp number (digits only, with country code, e.g. "919358502626").
  // While null, enquiry CTAs fall back to the phone number and contact form.
  whatsapp: null as string | null,
  // TODO(seo): classroom/training address. While null the site makes no
  // physical-location claims and JSON-LD stays EducationalOrganization only
  // (no LocalBusiness, no map embed).
  address: null as null | {
    street: string;
    locality: string; // e.g. "Noida"
    region: string; // e.g. "Uttar Pradesh"
    postalCode: string;
    country: "IN";
    /** Google Maps embed URL (Share → Embed a map → src). */
    mapEmbedUrl?: string;
  },
  // TODO(seo): Google Business Profile URL, once the profile exists.
  googleBusinessProfileUrl: null as string | null,
  // TODO(seo): real profile URLs. Only non-null entries are linked/emitted.
  social: {
    youtube: null as string | null,
    linkedin: null as string | null,
    instagram: null as string | null,
    facebook: null as string | null,
  },
};

/** Cities served, in the order they're listed in the footer NAP line. */
export const SERVICE_AREAS = ["Delhi", "Noida", "Greater Noida", "Gurugram", "Ghaziabad", "Faridabad", "Meerut"];

export function socialLinks(): { label: string; href: string }[] {
  const labels: Record<keyof typeof BUSINESS.social, string> = {
    youtube: "YouTube",
    linkedin: "LinkedIn",
    instagram: "Instagram",
    facebook: "Facebook",
  };
  return (Object.keys(labels) as (keyof typeof BUSINESS.social)[])
    .filter((k) => BUSINESS.social[k])
    .map((k) => ({ label: labels[k], href: BUSINESS.social[k]! }));
}

/** wa.me link when a WhatsApp number is configured, otherwise null. */
export function whatsappLink(message?: string): string | null {
  if (!BUSINESS.whatsapp) return null;
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${BUSINESS.whatsapp}${text}`;
}

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  // The root keeps its slash (https://cadseekho.com/); every other path has none.
  const clean = `/${path.replace(/^\/+/, "")}`.replace(/(.)\/+$/, "$1");
  return `${SITE_URL}${clean}`;
}
