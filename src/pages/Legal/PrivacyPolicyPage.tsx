import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { BUSINESS } from "@/config/site";
import "./legal.css";

// TODO(launch): legal review. Written in plain language to follow India's
// Digital Personal Data Protection Act, 2023 (DPDP Act); have it checked
// before relying on it, then update LAST_UPDATED.
const LAST_UPDATED = "12 October 2026";

export default function PrivacyPolicyPage() {
  return (
    <article className="section container legal">
      <Seo
        title="Privacy Policy"
        description="What personal data CADseekho collects, why, where it is stored, how long we keep it and your rights under India's DPDP Act 2023."
        canonical="/privacy-policy"
      />
      <span className="mono-label">Last updated {LAST_UPDATED}</span>
      <h1>Privacy Policy</h1>
      <p>
        This policy explains what personal data {BUSINESS.name} ("we") collects when you use cadseekho.com, why we
        collect it, and what you can do about it. We follow India's Digital Personal Data Protection Act, 2023 (DPDP
        Act). If anything here is unclear, email us at <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>When you book a free demo class:</strong> your name, WhatsApp number, and — if you give them — your
          email, whether you're a student or working engineer, your college or company, your city and the CAD software
          you know. We also record that you agreed to be contacted, and when.
        </li>
        <li>
          <strong>When you create an account or enroll:</strong> your name, email, phone and the details on the signup
          form. Payments are handled by Razorpay; we never see or store your card, UPI or bank details — only whether
          the payment succeeded and its reference number.
        </li>
        <li>
          <strong>When you contact us:</strong> what you write in the contact form, email or WhatsApp.
        </li>
        <li>
          <strong>Automatically:</strong> the page you came from, the ad or link that brought you (UTM tags and ad click
          IDs), your browser type, and a one-way scrambled (hashed) form of your IP address that we use only to stop
          spam. We don't store your raw IP address with your booking.
        </li>
      </ul>

      <h2>Cookies and ad measurement</h2>
      <p>Our public pages use these third-party tools, which set cookies or similar identifiers in your browser:</p>
      <ul>
        <li>
          <strong>Meta Pixel</strong> (Facebook/Instagram) — tells us which Meta ads lead to visits, demo bookings and
          enrollments, and helps show our ads to people likely to be interested. If you book a demo, your email and
          phone are scrambled (hashed) in your browser before being sent, to match the booking to an ad.
        </li>
        <li>
          <strong>Google Analytics</strong> — counts visits and how people use the site.
        </li>
        <li>
          <strong>Google Ads</strong> — tells us which Google ads lead to bookings and enrollments.
        </li>
        <li>
          <strong>Cloudflare Turnstile</strong> — checks that a form is being filled in by a person, not a bot.
        </li>
      </ul>
      <p>
        These tools are not loaded on the login, dashboard, classroom or admin pages. You can block or clear cookies in
        your browser settings, and control ad personalisation in your Meta and Google account settings.
      </p>

      <h2>Why we use it</h2>
      <ul>
        <li>To send you the demo class link and contact you on WhatsApp or by phone about the course you asked about.</li>
        <li>To enroll you, give you access to classes and recordings, and confirm payments.</li>
        <li>To measure which ads and pages work, so we spend less on ads that don't.</li>
        <li>To keep the site safe from spam and abuse.</li>
      </ul>
      <p>
        We use your data for these purposes because you gave your consent (the checkbox on our forms) or because we
        need it to provide a course you paid for. We don't sell your personal data.
      </p>

      <h2>Where it is stored and who sees it</h2>
      <ul>
        <li>Our database (Supabase), which only our admin team can read.</li>
        <li>A private Google Sheet we use to follow up on demo bookings.</li>
        <li>Email and messaging providers we use to send you course information (Resend for email, WhatsApp).</li>
        <li>Razorpay, for payments; Zoom, for live classes.</li>
      </ul>
      <p>Some of these providers may store data on servers outside India.</p>

      <h2>How long we keep it</h2>
      <ul>
        {/* TODO(launch): confirm these retention periods. */}
        <li>Demo bookings that don't enroll: up to 12 months after the booking, then deleted.</li>
        <li>Student accounts and payment records: as long as your account is active, and payment records for as long as Indian tax law requires.</li>
        <li>Ad and analytics data: as set in Meta and Google (we use their standard retention).</li>
      </ul>

      <h2>Your rights</h2>
      <p>Under the DPDP Act you can:</p>
      <ul>
        <li>ask what personal data we hold about you and how we use it;</li>
        <li>ask us to correct, complete or update it;</li>
        <li>withdraw your consent and ask us to delete it — we will then stop contacting you;</li>
        <li>name someone to act for you if you are unable to;</li>
        <li>complain to us, and if you're not satisfied, to the Data Protection Board of India.</li>
      </ul>
      <p>
        To do any of these, email <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> or WhatsApp us from the
        number you registered with. We reply within 7 days. Reply "STOP" to any WhatsApp message to stop
        messages from us.
      </p>

      <h2>Children</h2>
      <p>
        Our courses are for college students and working engineers. If you are under 18, please ask a parent or
        guardian to book or enroll for you.
      </p>

      <h2>Contact</h2>
      <p>
        {BUSINESS.name} · <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> ·{" "}
        <a href={`tel:${BUSINESS.phone}`}>{BUSINESS.phoneDisplay}</a>. See also our{" "}
        <Link to="/refund-policy">refund policy</Link>.
      </p>
    </article>
  );
}
