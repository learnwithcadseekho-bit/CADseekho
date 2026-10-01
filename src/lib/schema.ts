// JSON-LD builders (schema.org). Only real data goes in: fields with no value
// are omitted rather than guessed. Validate changes at
// https://search.google.com/test/rich-results.
import { absoluteUrl, BUSINESS, SERVICE_AREA, SITE_URL, socialLinks } from "@/config/site";
import type { BlogPost } from "@/types/blogPost";
import type { CourseWithCategory } from "@/types/course";

type JsonLd = Record<string, unknown>;

export const ORGANIZATION_ID = `${SITE_URL}/#organization`;

export function organizationSchema(): JsonLd {
  const address = BUSINESS.address;
  const sameAs = [...socialLinks().map((l) => l.href), BUSINESS.googleBusinessProfileUrl].filter(Boolean);
  return {
    "@context": "https://schema.org",
    // LocalBusiness only once there's a real address to attach it to.
    "@type": address ? ["EducationalOrganization", "LocalBusiness"] : "EducationalOrganization",
    "@id": ORGANIZATION_ID,
    name: BUSINESS.name,
    url: `${SITE_URL}/`,
    logo: BUSINESS.logo,
    ...(address && { image: BUSINESS.logo }),
    email: BUSINESS.email,
    telephone: BUSINESS.phone,
    ...(sameAs.length > 0 && { sameAs }),
    areaServed: { "@type": SERVICE_AREA.type, name: SERVICE_AREA.name },
    ...(address && {
      address: {
        "@type": "PostalAddress",
        streetAddress: address.street,
        addressLocality: address.locality,
        addressRegion: address.region,
        postalCode: address.postalCode,
        addressCountry: address.country,
      },
    }),
  };
}

const providerRef = { "@type": "EducationalOrganization", "@id": ORGANIZATION_ID, name: BUSINESS.name, url: `${SITE_URL}/` };

function plainText(html: string | null | undefined): string {
  return (html ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function courseSchema(course: CourseWithCategory, description: string): JsonLd {
  const url = absoluteUrl(`/courses/${course.slug}`);
  // Online only. If in-person batches ever start, add a
  // { courseMode: "Onsite", location } instance alongside this one.
  const instance: JsonLd = {
    "@type": "CourseInstance",
    courseMode: "Online",
    ...(course.format === "live" && course.next_batch_date && { startDate: course.next_batch_date }),
    ...(course.format === "self_paced" && { courseSchedule: { "@type": "Schedule", repeatFrequency: "P1D", repeatCount: 1 } }),
  };
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: description || plainText(course.description).slice(0, 300) || course.title,
    url,
    provider: providerRef,
    ...(course.image && { image: course.image }),
    ...(course.level && { educationalLevel: course.level }),
    ...(course.software && { teaches: course.software }),
    ...(course.price != null && {
      offers: {
        "@type": "Offer",
        category: "Paid",
        price: course.price,
        priceCurrency: "INR",
        url,
        availability: "https://schema.org/InStock",
      },
    }),
    hasCourseInstance: [instance],
  };
}

export function articleSchema(post: BlogPost, description: string | undefined): JsonLd {
  const url = absoluteUrl(`/blog/${post.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title.slice(0, 110),
    ...(description && { description }),
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    image: post.featured_image || BUSINESS.logo,
    datePublished: post.published_at ?? post.created_at,
    dateModified: post.updated_at ?? post.published_at ?? post.created_at,
    // Posts are bylined "CADseekho Team" on the page; keep the schema consistent.
    author: { "@type": "Organization", name: `${BUSINESS.name} Team`, url: `${SITE_URL}/about` },
    publisher: { "@type": "Organization", "@id": ORGANIZATION_ID, name: BUSINESS.name, logo: { "@type": "ImageObject", url: BUSINESS.logo } },
    ...(post.category && { articleSection: post.category }),
  };
}

export function faqSchema(items: { question: string; answer: string }[]): JsonLd | null {
  if (items.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: plainText(item.answer) },
    })),
  };
}
