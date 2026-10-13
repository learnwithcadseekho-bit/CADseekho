import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { trackLead } from "@/lib/track";
import { takePendingLead } from "@/services/leadService";
import {
  LAUNCH,
  LAUNCH_ENROLL_PATH,
  LAUNCH_WHATSAPP_URL,
  PRICE_LABEL,
  demoCalendarUrl,
  istDay,
  istTime,
} from "@/content/launch";
import { AdVideo } from "./AdVideo";
import "./launch.css";

// Lead conversion fires here, on ?lead=1, and only when the demo form has
// just left its pending lead (written after the server saved it) — so a
// typed or shared ?lead=1 URL never counts. The parameter is then removed so
// a refresh can't fire it again.
let lastEventId: string | null = null;

export default function ThankYouPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [copied, setCopied] = useState(false);
  const isLead = searchParams.get("lead") === "1";

  useEffect(() => {
    if (!isLead) return;
    const pending = takePendingLead();
    // lastEventId: StrictMode runs effects twice in development; never send twice.
    if (pending && pending.eventId !== lastEventId) {
      lastEventId = pending.eventId;
      trackLead({
        name: "ANSYS Foundation demo",
        method: "website_form",
        eventId: pending.eventId,
        email: pending.email,
        phone: pending.phone,
        adsConversion: true,
      });
    }
    setSearchParams(
      (params) => {
        params.delete("lead");
        return params;
      },
      { replace: true }
    );
  }, [isLead, setSearchParams]);

  async function copyZoom() {
    if (!LAUNCH.zoomLink) return;
    try {
      await navigator.clipboard.writeText(LAUNCH.zoomLink);
      setCopied(true);
    } catch {
      window.prompt("Copy the Zoom link:", LAUNCH.zoomLink);
    }
  }

  return (
    <section className="section container thank-you">
      <Seo title="You're booked — free ANSYS demo" description="Your free ANSYS demo class is booked." noindex />
      <span className="mono-label">Booking confirmed</span>
      <h1 className="thank-you__title">You're booked!</h1>
      <p className="thank-you__sub">
        Free ANSYS demo — {istDay(LAUNCH.demoStart)}, {istTime(LAUNCH.demoStart)} IST on Zoom.
      </p>
      <p>
        {LAUNCH.zoomLink
          ? "Save the Zoom link below. We'll also remind you on WhatsApp before the class."
          : "We'll send the Zoom link to your WhatsApp before the class."}
      </p>

      <div className="thank-you__actions">
        <a href={demoCalendarUrl()} className="btn btn--primary" target="_blank" rel="noopener noreferrer">
          Add to Google Calendar
        </a>
        {LAUNCH.whatsappGroupLink && (
          <a href={LAUNCH.whatsappGroupLink} className="btn btn--outline" target="_blank" rel="noopener noreferrer">
            Join WhatsApp group
          </a>
        )}
        {LAUNCH.zoomLink && (
          <button type="button" className="btn btn--outline" onClick={copyZoom}>
            {copied ? "✓ Zoom link copied" : "Save Zoom link"}
          </button>
        )}
      </div>
      {LAUNCH.zoomLink && (
        <p className="thank-you__zoom">
          Zoom: <a href={LAUNCH.zoomLink}>{LAUNCH.zoomLink}</a>
        </p>
      )}

      <AdVideo className="thank-you__video" />

      <div className="launch-price drafting-frame thank-you__enroll">
        <span className="mono-label">Can't wait?</span>
        <h2 className="launch-h2 launch-h2--sm">Enroll now at {PRICE_LABEL}</h2>
        <p>
          Launch price ends {istDay(LAUNCH.offerEnds)}, 11:59 PM IST. Batch starts {istDay(LAUNCH.batchStart)}, 8 PM
          IST — recordings included.
        </p>
        <Link to={LAUNCH_ENROLL_PATH} className="btn btn--primary">
          Pay &amp; enroll — {PRICE_LABEL}
        </Link>
      </div>

      <p className="thank-you__help">
        Questions?{" "}
        <a href={LAUNCH_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
          WhatsApp us
        </a>{" "}
        · <Link to={LAUNCH.path}>Back to the course</Link>
      </p>
    </section>
  );
}
