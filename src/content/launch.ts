// ANSYS Workbench Foundation launch (Oct 2026): the facts every launch page,
// the demo form, the thank-you page and the tracking read from. Change a date
// or price here and it changes everywhere. Times are fixed instants in IST
// (+05:30) so countdowns and calendar links are right in any visitor timezone.

import { FEATURED_ANSYS_SLUG } from "@/content/batches";

export const LAUNCH = {
  /** Public landing page. */
  path: "/ansys-foundation",
  courseName: "ANSYS Workbench Foundation",
  /** The existing course the launch price is charged for (Razorpay reads its price from the DB). */
  courseSlug: FEATURED_ANSYS_SLUG,
  topics: ["Static structural", "Thermal", "Modal", "Buckling", "Design optimization"],

  demoStart: "2026-10-17T20:00:00+05:30",
  // TODO(launch): demo length — only used for the calendar invite's end time.
  demoMinutes: 60,
  batchStart: "2026-10-19T20:00:00+05:30",
  /** No class this day (Dussehra). */
  holiday: "2026-10-20",

  price: 1999,
  currency: "INR",
  offerEnds: "2026-10-18T23:59:59+05:30",

  whatsappNumber: "919358502626",
  whatsappMessage: "Hi, I want the free ANSYS demo class",

  // TODO(launch): Zoom link for the demo. While null, the thank-you page says it's sent on WhatsApp.
  zoomLink: null as string | null,
  // TODO(launch): WhatsApp group invite link. While null, the thank-you page hides that button.
  whatsappGroupLink: null as string | null,
  // TODO(launch): instructor name + short bio. While null, the Instructor section is left out.
  instructor: null as null | { name: string; bio: string; photo?: string },

  video: { src: "/media/ad-4x5.mp4", poster: "/media/ad-4x5-poster.jpg", width: 1080, height: 1350 },
};

export const LAUNCH_WHATSAPP_URL = `https://wa.me/${LAUNCH.whatsappNumber}?text=${encodeURIComponent(LAUNCH.whatsappMessage)}`;

/** Pay & enroll: the existing course checkout, opened on arrival (?enroll=1, survives a /login detour). */
export const LAUNCH_ENROLL_PATH = `/courses/${LAUNCH.courseSlug}?enroll=1`;

export const PRICE_LABEL = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
}).format(LAUNCH.price);

/** "Sat 17 Oct" in IST, whatever the visitor's timezone. */
export function istDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** What the countdown counts to right now: the demo, then the batch, then nothing. */
export function nextMilestone(now: number): { label: string; at: number } | null {
  const demo = Date.parse(LAUNCH.demoStart);
  const batch = Date.parse(LAUNCH.batchStart);
  if (now < demo) return { label: "Free demo class starts in", at: demo };
  if (now < batch) return { label: "Batch starts in", at: batch };
  return null;
}

/** Google Calendar "add event" link for the demo. */
export function demoCalendarUrl(): string {
  const start = new Date(LAUNCH.demoStart);
  const end = new Date(start.getTime() + LAUNCH.demoMinutes * 60_000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const details = [
    `Free ${LAUNCH.courseName} demo class with CADseekho (live on Zoom).`,
    LAUNCH.zoomLink ? `Join: ${LAUNCH.zoomLink}` : "The Zoom link will be sent to you on WhatsApp.",
    `Questions? WhatsApp ${LAUNCH_WHATSAPP_URL}`,
  ].join("\n\n");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Free ANSYS demo class — CADseekho`,
    dates: `${fmt(start)}/${fmt(end)}`,
    details,
    location: LAUNCH.zoomLink ?? "Zoom (online)",
    ctz: "Asia/Kolkata",
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
