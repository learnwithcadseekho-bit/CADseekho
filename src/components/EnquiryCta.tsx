import { Link } from "react-router-dom";
import { BUSINESS, whatsappLink } from "@/config/site";

// Primary enquiry actions: WhatsApp when a number is configured
// (config/site.ts), otherwise a call link — plus the contact form.
export function EnquiryCta({ message, className = "" }: { message: string; className?: string }) {
  const wa = whatsappLink(message);
  return (
    <div className={`enquiry-cta ${className}`.trim()}>
      {wa ? (
        <a href={wa} className="btn btn--primary" target="_blank" rel="noopener noreferrer">
          Enquire on WhatsApp
        </a>
      ) : (
        <a href={`tel:${BUSINESS.phone}`} className="btn btn--primary">
          Call {BUSINESS.phoneDisplay}
        </a>
      )}
      <Link to="/contact" className="btn btn--outline">
        Send an enquiry
      </Link>
    </div>
  );
}
